using System;
using UnityEngine;

namespace WU1944.Stealth
{
    /// <summary>Semantic category of a noise event. Drives AI reaction severity.</summary>
    public enum NoiseType : byte
    {
        FootstepWalk, FootstepRun, FootstepCrouch, GlassStep,
        ObjectDropped, DoorCreak, Gunshot, Explosion, Distraction
    }

    /// <summary>
    /// Immutable noise event payload. Struct — passed by 'in' reference, never boxed,
    /// never allocated on the heap.
    /// </summary>
    public readonly struct NoiseEvent
    {
        public readonly Vector3   Position;
        public readonly float     Radius;      // metres — hard audibility limit
        public readonly float     Intensity;   // 0..1 at the source
        public readonly NoiseType Type;

        public NoiseEvent(Vector3 position, float radius, float intensity, NoiseType type)
        {
            Position = position; Radius = radius; Intensity = intensity; Type = type;
        }
    }

    /// <summary>
    /// Implemented by anything with ears (enemy AI, civilians, scripted triggers).
    /// <paramref name="loudness"/> is the perceived intensity 0..1 after distance
    /// falloff and wall occlusion — listeners decide how to react.
    /// </summary>
    public interface INoiseListener
    {
        Transform ListenerTransform { get; }
        void OnNoiseHeard(in NoiseEvent noise, float loudness);
    }

    /// <summary>
    /// Event-driven noise propagation service (Observer pattern).
    ///
    /// Listeners are indexed in a uniform spatial hash grid over the XZ plane so
    /// an emission only visits listeners in cells overlapped by the noise radius —
    /// O(cells + local listeners), not O(all listeners).
    ///
    /// Zero-GC guarantees:
    ///  - grid is flat int arrays (intrusive linked lists: head[cell] / next[slot]),
    ///  - listener slots are recycled through a free-list, no Dictionary, no List,
    ///  - occlusion uses a shared pre-allocated RaycastHit buffer,
    ///  - <see cref="NoiseEvent"/> is a readonly struct passed by reference.
    /// </summary>
    [DefaultExecutionOrder(-200)]
    public sealed class NoiseManager : MonoBehaviour
    {
        public static NoiseManager Instance { get; private set; }

        // ------------------------------------------------------------ inspector
        [Header("Spatial grid (XZ plane)")]
        [SerializeField] private Vector2 _worldOrigin = new Vector2(-128, -128);
        [SerializeField] private float   _cellSize = 8f;
        [SerializeField] private int     _gridWidth = 32, _gridHeight = 32;

        [Header("Occlusion")]
        [Tooltip("Layers that muffle sound (walls, rubble, barricades).")]
        [SerializeField] private LayerMask _occluderMask;
        [Tooltip("Intensity multiplier applied per occluding wall between source and ear.")]
        [SerializeField, Range(0f, 1f)] private float _wallMuffling = 0.45f;
        [Tooltip("Occluders beyond this count silence the noise completely.")]
        [SerializeField] private int _maxOccluders = 3;

        [Header("Capacity")]
        [SerializeField] private int _maxListeners = 128;

        /// <summary>Global observer hook for non-spatial systems (UI ping, debug draw).</summary>
        public event Action<NoiseEvent> NoiseEmitted;

        // ---------------------------------------------------------------- state
        private INoiseListener[] _listeners;
        private int[]  _cellHead;      // per cell: first listener slot, -1 = empty
        private int[]  _next;          // per slot: next listener in the same cell
        private int[]  _prev;          // per slot: previous (for O(1) unlink)
        private int[]  _slotCell;      // per slot: current cell index, -1 = unbucketed
        private int[]  _freeList;      // recycled slot indices
        private int    _freeCount;
        private int    _highSlot;      // upper bound of ever-used slots

        // shared, pre-allocated — RaycastNonAlloc requirement
        private static readonly RaycastHit[] s_occlusionHits = new RaycastHit[8];

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;

            int cells = _gridWidth * _gridHeight;
            _listeners = new INoiseListener[_maxListeners];
            _cellHead  = new int[cells];
            _next      = new int[_maxListeners];
            _prev      = new int[_maxListeners];
            _slotCell  = new int[_maxListeners];
            _freeList  = new int[_maxListeners];

            for (int i = 0; i < cells; i++) _cellHead[i] = -1;
            for (int i = 0; i < _maxListeners; i++) { _slotCell[i] = -1; _freeList[i] = _maxListeners - 1 - i; }
            _freeCount = _maxListeners;
        }

        private void OnDestroy() { if (Instance == this) Instance = null; }

        /// <summary>
        /// Re-bucket listeners that moved across a cell boundary. A linear sweep over
        /// ≤ maxListeners slots per frame is branch-cheap and allocation-free.
        /// </summary>
        private void LateUpdate()
        {
            for (int slot = 0; slot < _highSlot; slot++)
            {
                INoiseListener l = _listeners[slot];
                if (l == null) continue;
                Transform t = l.ListenerTransform;
                if (t == null) { Unregister(slot); continue; }

                int cell = CellIndex(t.position);
                if (cell != _slotCell[slot]) Rebucket(slot, cell);
            }
        }

        // ------------------------------------------------------------------ api
        /// <summary>Registers an ear. Returns a slot handle for <see cref="Unregister"/>.</summary>
        public int Register(INoiseListener listener)
        {
            if (_freeCount == 0)
            {
                Debug.LogWarning("NoiseManager: listener capacity exceeded.");
                return -1;
            }
            int slot = _freeList[--_freeCount];
            _listeners[slot] = listener;
            if (slot >= _highSlot) _highSlot = slot + 1;
            Rebucket(slot, CellIndex(listener.ListenerTransform.position));
            return slot;
        }

        public void Unregister(int slot)
        {
            if (slot < 0 || _listeners[slot] == null) return;
            Unlink(slot);
            _slotCell[slot] = -1;
            _listeners[slot] = null;
            _freeList[_freeCount++] = slot;
        }

        /// <summary>
        /// Propagates a noise to all listeners inside the radius. GC-free hot path:
        /// visits only the grid cells overlapped by the audibility circle.
        /// </summary>
        public void Emit(in NoiseEvent noise)
        {
            NoiseEmitted?.Invoke(noise);

            float r = noise.Radius, rSqr = r * r;
            int cx0 = CellX(noise.Position.x - r), cx1 = CellX(noise.Position.x + r);
            int cz0 = CellZ(noise.Position.z - r), cz1 = CellZ(noise.Position.z + r);

            for (int cz = cz0; cz <= cz1; cz++)
            for (int cx = cx0; cx <= cx1; cx++)
            {
                for (int slot = _cellHead[cz * _gridWidth + cx]; slot != -1; slot = _next[slot])
                {
                    INoiseListener l = _listeners[slot];
                    Transform t = l.ListenerTransform;
                    Vector3 ear = t.position;

                    float dx = ear.x - noise.Position.x;
                    float dy = ear.y - noise.Position.y;
                    float dz = ear.z - noise.Position.z;
                    float dSqr = dx * dx + dy * dy + dz * dz;
                    if (dSqr > rSqr) continue;

                    float dist = Mathf.Sqrt(dSqr);
                    // Linear falloff reads better for gameplay than inverse-square
                    // and never divides by zero.
                    float loudness = noise.Intensity * (1f - dist / r);
                    loudness *= OcclusionFactor(noise.Position, ear, dist);
                    if (loudness > 0.01f)
                        l.OnNoiseHeard(in noise, loudness);
                }
            }
        }

        // ---------------------------------------------------------------- impl
        /// <summary>Counts muffling walls with the shared NonAlloc buffer.</summary>
        private float OcclusionFactor(Vector3 from, Vector3 to, float dist)
        {
            if (dist < 0.01f || _occluderMask == 0) return 1f;
            Vector3 dir = (to - from) / dist;
            int hits = Physics.RaycastNonAlloc(from, dir, s_occlusionHits, dist,
                                               _occluderMask, QueryTriggerInteraction.Ignore);
            if (hits >= _maxOccluders) return 0f;
            float f = 1f;
            for (int i = 0; i < hits; i++) f *= _wallMuffling;
            return f;
        }

        private int CellX(float x) =>
            Mathf.Clamp((int)((x - _worldOrigin.x) / _cellSize), 0, _gridWidth - 1);
        private int CellZ(float z) =>
            Mathf.Clamp((int)((z - _worldOrigin.y) / _cellSize), 0, _gridHeight - 1);
        private int CellIndex(Vector3 p) => CellZ(p.z) * _gridWidth + CellX(p.x);

        private void Rebucket(int slot, int newCell)
        {
            Unlink(slot);
            _slotCell[slot] = newCell;
            int head = _cellHead[newCell];
            _next[slot] = head;
            _prev[slot] = -1;
            if (head != -1) _prev[head] = slot;
            _cellHead[newCell] = slot;
        }

        private void Unlink(int slot)
        {
            int cell = _slotCell[slot];
            if (cell == -1) return;
            int p = _prev[slot], n = _next[slot];
            if (p != -1) _next[p] = n; else _cellHead[cell] = n;
            if (n != -1) _prev[n] = p;
        }
    }
}
