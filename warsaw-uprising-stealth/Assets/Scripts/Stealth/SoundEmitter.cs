using UnityEngine;

namespace WU1944.Stealth
{
    /// <summary>
    /// Attach to anything that makes noise (player, thrown bottles, doors).
    ///
    /// Footsteps are distance-driven: every <see cref="_strideLength"/> metres of
    /// travel emits one step whose radius/intensity depend on the movement mode
    /// and the surface underfoot (broken glass on Warsaw streets is a death trap).
    /// Surface detection uses a downward RaycastNonAlloc against
    /// <see cref="_surfaceMask"/> and reads <see cref="StealthSurface"/> markers.
    ///
    /// GC-free: static profile table, shared RaycastHit buffer, struct events.
    /// </summary>
    public sealed class SoundEmitter : MonoBehaviour
    {
        /// <summary>Baseline radius [m] / intensity [0..1] per noise type.</summary>
        private struct NoiseProfile
        {
            public float Radius, Intensity;
            public NoiseProfile(float r, float i) { Radius = r; Intensity = i; }
        }

        // Indexed by NoiseType — keep in sync with the enum.
        private static readonly NoiseProfile[] s_profiles =
        {
            /* FootstepWalk   */ new NoiseProfile( 6f, 0.35f),
            /* FootstepRun    */ new NoiseProfile(14f, 0.80f),
            /* FootstepCrouch */ new NoiseProfile( 2.5f, 0.15f),
            /* GlassStep      */ new NoiseProfile(18f, 0.95f),
            /* ObjectDropped  */ new NoiseProfile(10f, 0.60f),
            /* DoorCreak      */ new NoiseProfile( 8f, 0.45f),
            /* Gunshot        */ new NoiseProfile(60f, 1.00f),
            /* Explosion      */ new NoiseProfile(120f, 1.00f),
            /* Distraction    */ new NoiseProfile(12f, 0.70f),
        };

        // ------------------------------------------------------------ inspector
        [Header("Footsteps")]
        [Tooltip("Metres travelled per emitted footstep.")]
        [SerializeField] private float _strideLength = 1.7f;
        [Tooltip("Downward probe for surface material under the feet.")]
        [SerializeField] private LayerMask _surfaceMask = ~0;
        [SerializeField] private float _surfaceProbeHeight = 0.5f, _surfaceProbeDepth = 1.2f;

        [Header("Tuning")]
        [Tooltip("Global multiplier — e.g. rain mission lowers all noise radii.")]
        [SerializeField, Range(0.2f, 2f)] private float _radiusScale = 1f;

        private static readonly RaycastHit[] s_probeHits = new RaycastHit[4];

        private Vector3 _lastStepPos;
        private float _travelled;

        private void OnEnable() => _lastStepPos = transform.position;

        // ------------------------------------------------------------------ api
        /// <summary>
        /// Call from the movement controller each frame while grounded.
        /// Accumulates travelled distance and emits steps on stride boundaries.
        /// </summary>
        /// <param name="mode">Current locomotion noise type (walk/run/crouch).</param>
        public void TickFootsteps(NoiseType mode)
        {
            Vector3 p = transform.position;
            _travelled += Vector3.Distance(p, _lastStepPos);
            _lastStepPos = p;

            float stride = mode == NoiseType.FootstepRun ? _strideLength * 1.35f : _strideLength;
            if (_travelled < stride) return;
            _travelled = 0f;

            // Glass overrides the locomotion mode — sneaking does not help much.
            NoiseType effective = ProbeSurfaceIsGlass() ? NoiseType.GlassStep : mode;
            Emit(effective);
        }

        /// <summary>Emits a one-shot noise of the given type at this transform.</summary>
        public void Emit(NoiseType type)
        {
            NoiseProfile prof = s_profiles[(int)type];
            EmitCustom(type, prof.Radius * _radiusScale, prof.Intensity);
        }

        /// <summary>Emits a fully custom noise (scripted events, weapon variants).</summary>
        public void EmitCustom(NoiseType type, float radius, float intensity)
        {
            NoiseManager mgr = NoiseManager.Instance;
            if (mgr == null) return;
            var evt = new NoiseEvent(transform.position, radius, intensity, type);
            mgr.Emit(in evt);
        }

        // ---------------------------------------------------------------- impl
        private bool ProbeSurfaceIsGlass()
        {
            Vector3 origin = transform.position; origin.y += _surfaceProbeHeight;
            int hits = Physics.RaycastNonAlloc(origin, Vector3.down, s_probeHits,
                _surfaceProbeDepth, _surfaceMask, QueryTriggerInteraction.Collide);

            for (int i = 0; i < hits; i++)
            {
                // TryGetComponent is allocation-free and null-safe.
                if (s_probeHits[i].collider.TryGetComponent(out StealthSurface surface)
                    && surface.IsGlass)
                    return true;
            }
            return false;
        }
    }

    /// <summary>
    /// Marker for special acoustic surfaces (glass shards, gravel, puddles).
    /// Placed on floor colliders / trigger volumes by level designers.
    /// </summary>
    public sealed class StealthSurface : MonoBehaviour
    {
        [SerializeField] private bool _isGlass;
        public bool IsGlass => _isGlass;
    }
}
