using System;
using UnityEngine;

namespace WU1944.AI
{
    /// <summary>
    /// Raycast-based sight cone: detects targets and renders the classic stealth-game
    /// vision cone as a dynamically rebuilt mesh (MeshFilter on a child object,
    /// flat on the ground for the isometric camera).
    ///
    /// Mobile-GPU friendly:
    ///  - one ray per <see cref="_meshRayStep"/> degrees, with binary edge-resolve
    ///    passes only where a ray pair disagrees (crisp corners without dense rays),
    ///  - vertex/index arrays pre-allocated once and re-uploaded with the
    ///    SetVertices/SetTriangles range overloads — no per-frame allocation,
    ///  - mesh marked dynamic; rebuilt at <see cref="_meshHz"/>, not every frame.
    ///
    /// All physics queries go through pre-allocated NonAlloc buffers.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class FieldOfView : MonoBehaviour
    {
        // ------------------------------------------------------------ inspector
        [Header("Cone")]
        [SerializeField] private float _viewRadius = 14f;
        [SerializeField, Range(1f, 360f)] private float _viewAngle = 84f;
        [Tooltip("Close-range 'sixth sense' circle — detects targets even behind the guard.")]
        [SerializeField] private float _proximityRadius = 1.6f;

        [Header("Masks")]
        [SerializeField] private LayerMask _targetMask;
        [SerializeField] private LayerMask _obstacleMask;

        [Header("Detection")]
        [Tooltip("Scans per second for target visibility (cheap, decoupled from render).")]
        [SerializeField] private float _scanHz = 10f;

        [Header("Cone mesh")]
        [SerializeField] private MeshFilter _meshFilter;
        [Tooltip("Degrees per mesh ray. 4° at 84° cone = 22 rays.")]
        [SerializeField, Range(1f, 10f)] private float _meshRayStep = 4f;
        [SerializeField, Range(0, 6)] private int _edgeResolveIterations = 4;
        [SerializeField] private float _meshHz = 30f;

        // --------------------------------------------------------------- events
        /// <summary>Observer hooks for the AI controller / audio / UI.</summary>
        public event Action<Transform> TargetSpotted;
        public event Action<Vector3>   TargetLost;      // arg: last seen position

        /// <summary>Currently visible target, null when none.</summary>
        public Transform VisibleTarget { get; private set; }
        /// <summary>0..1 — how exposed the visible target is (cover/crouch aware).</summary>
        public float TargetExposure { get; private set; }
        public float ViewRadius => _viewRadius;
        public float ViewAngle  => _viewAngle;

        // ---------------------------------------------------------------- state
        private const int MaxTargets = 8;
        private const int MaxMeshRays = 512;

        private static readonly Collider[]   s_targetHits = new Collider[MaxTargets];
        private static readonly RaycastHit[] s_rayHits    = new RaycastHit[4];

        private Mesh      _mesh;
        private Vector3[] _verts;
        private int[]     _tris;
        private float     _scanTimer, _meshTimer;

        private void Awake()
        {
            int rayCount = Mathf.CeilToInt(_viewAngle / _meshRayStep) + 1;
            rayCount = Mathf.Min(rayCount, MaxMeshRays);
            _verts = new Vector3[rayCount + 1];
            _tris  = new int[(rayCount - 1) * 3];

            _mesh = new Mesh { name = "FOV Cone" };
            _mesh.MarkDynamic();
            if (_meshFilter != null) _meshFilter.mesh = _mesh;
        }

        private void Update()
        {
            _scanTimer += Time.deltaTime;
            if (_scanTimer >= 1f / _scanHz) { _scanTimer = 0f; ScanForTargets(); }

            _meshTimer += Time.deltaTime;
            if (_meshTimer >= 1f / _meshHz && _meshFilter != null)
            { _meshTimer = 0f; RebuildConeMesh(); }
        }

        // ------------------------------------------------------- target scanning
        private void ScanForTargets()
        {
            Transform found = null;
            float exposure = 0f;

            int n = Physics.OverlapSphereNonAlloc(transform.position, _viewRadius,
                        s_targetHits, _targetMask, QueryTriggerInteraction.Ignore);

            for (int i = 0; i < n; i++)
            {
                Transform t = s_targetHits[i].transform;
                Vector3 to = t.position - transform.position;
                float dist = to.magnitude;

                bool inProximity = dist <= _proximityRadius;
                bool inCone = Vector3.Angle(transform.forward, to) <= _viewAngle * 0.5f;
                if (!inProximity && !inCone) continue;
                if (!HasLineOfSight(t, dist)) continue;

                // Exposure: cover/crouch systems shrink it; distance shrinks it.
                float e = 1f - Mathf.Clamp01(dist / _viewRadius) * 0.6f;
                if (t.TryGetComponent(out IStealthTarget st)) e *= st.ExposureMultiplier;
                if (inProximity) e = Mathf.Max(e, 1f);   // point blank — always seen

                if (e > exposure) { exposure = e; found = t; }
            }

            if (found != null && VisibleTarget == null) TargetSpotted?.Invoke(found);
            if (found == null && VisibleTarget != null) TargetLost?.Invoke(VisibleTarget.position);
            VisibleTarget = found;
            TargetExposure = found != null ? exposure : 0f;
        }

        private bool HasLineOfSight(Transform target, float dist)
        {
            if (dist < 0.01f) return true;
            Vector3 eye = transform.position;
            Vector3 aim = target.position; aim.y = eye.y;   // isometric: flat sightline
            Vector3 dir = (aim - eye).normalized;
            int hits = Physics.RaycastNonAlloc(eye, dir, s_rayHits, dist,
                           _obstacleMask, QueryTriggerInteraction.Ignore);
            return hits == 0;
        }

        // ---------------------------------------------------------- cone mesh
        private void RebuildConeMesh()
        {
            int rayCount = _verts.Length - 1;
            float half = _viewAngle * 0.5f;

            _verts[0] = Vector3.zero;                        // apex, local space
            float prevDist = 0f; bool prevHit = false; float prevAngle = 0f;

            for (int i = 0; i < rayCount; i++)
            {
                float angle = -half + _viewAngle * i / (rayCount - 1);
                bool hit = CastConeRay(angle, out float d, out Vector3 local);

                // Edge resolve: a hit/miss (or large depth step) boundary between two
                // consecutive rays hides a corner — bisect to pin it down.
                if (i > 0 && (hit != prevHit || Mathf.Abs(d - prevDist) > 1.5f))
                {
                    float a0 = prevAngle, a1 = angle;
                    for (int k = 0; k < _edgeResolveIterations; k++)
                    {
                        float mid = (a0 + a1) * 0.5f;
                        bool mHit = CastConeRay(mid, out float mD, out _);
                        if (mHit == prevHit && Mathf.Abs(mD - prevDist) <= 1.5f) a0 = mid;
                        else a1 = mid;
                    }
                    // Snap the previous vertex to the resolved edge for a crisp corner.
                    CastConeRay(a0, out _, out Vector3 edgeLocal);
                    _verts[i] = edgeLocal;   // overwrite: verts[i] was written last loop
                }

                _verts[i + 1] = local;
                prevDist = d; prevHit = hit; prevAngle = angle;
            }

            for (int i = 0; i < rayCount - 1; i++)
            {
                _tris[i * 3]     = 0;
                _tris[i * 3 + 1] = i + 1;
                _tris[i * 3 + 2] = i + 2;
            }

            _mesh.Clear(false);
            _mesh.SetVertices(_verts, 0, _verts.Length,
                UnityEngine.Rendering.MeshUpdateFlags.DontRecalculateBounds);
            _mesh.SetTriangles(_tris, 0, _tris.Length, 0, false);
            _mesh.bounds = new Bounds(Vector3.forward * (_viewRadius * 0.5f),
                                      new Vector3(_viewRadius * 2f, 1f, _viewRadius * 2f));
        }

        /// <summary>Casts one cone ray. Returns hit flag, distance and LOCAL endpoint.</summary>
        private bool CastConeRay(float angleDeg, out float dist, out Vector3 local)
        {
            Vector3 dir = Quaternion.AngleAxis(angleDeg, Vector3.up) * transform.forward;
            int hits = Physics.RaycastNonAlloc(transform.position, dir, s_rayHits,
                           _viewRadius, _obstacleMask, QueryTriggerInteraction.Ignore);
            if (hits > 0)
            {
                // NonAlloc does not sort — find the nearest hit ourselves.
                float best = float.MaxValue;
                for (int i = 0; i < hits; i++)
                    if (s_rayHits[i].distance < best) best = s_rayHits[i].distance;
                dist = best;
            }
            else dist = _viewRadius;

            local = Quaternion.Inverse(transform.rotation) * (dir * dist);
            return hits > 0;
        }

#if UNITY_EDITOR
        private void OnDrawGizmosSelected()
        {
            Gizmos.color = new Color(1f, 0.85f, 0.2f, 0.35f);
            Vector3 l = Quaternion.AngleAxis(-_viewAngle * 0.5f, Vector3.up) * transform.forward;
            Vector3 r = Quaternion.AngleAxis(_viewAngle * 0.5f, Vector3.up) * transform.forward;
            Gizmos.DrawLine(transform.position, transform.position + l * _viewRadius);
            Gizmos.DrawLine(transform.position, transform.position + r * _viewRadius);
        }
#endif
    }

    /// <summary>
    /// Implemented by the player (and decoys): lets cover/crouch state scale how
    /// visible the target is inside a cone. 1 = fully exposed, 0 = invisible.
    /// </summary>
    public interface IStealthTarget
    {
        float ExposureMultiplier { get; }
    }
}
