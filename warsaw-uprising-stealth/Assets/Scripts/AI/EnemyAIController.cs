using System;
using UnityEngine;
using UnityEngine.AI;
using WU1944.Stealth;

namespace WU1944.AI
{
    public enum AIState : byte { Patrol, Suspicious, Alert, Combat, ReturnToPost }

    /// <summary>
    /// Modular guard AI: State-pattern FSM with pre-allocated state objects
    /// (zero GC on transitions) driven by two senses:
    ///
    ///  - <see cref="FieldOfView"/> (vision) fills a detection meter proportional to
    ///    target exposure and distance; meter thresholds escalate the state,
    ///  - <see cref="INoiseListener"/> (hearing) — noises push the AI into
    ///    Suspicious/Alert with the noise origin as the investigation point.
    ///
    /// Escalation ladder:
    ///   Patrol → (faint noise / glimpse) → Suspicious → (loud noise, second
    ///   stimulus, meter full) → Alert → (clear sight of target) → Combat.
    ///   De-escalation happens through timers back down to ReturnToPost → Patrol.
    /// </summary>
    [RequireComponent(typeof(NavMeshAgent))]
    [RequireComponent(typeof(FieldOfView))]
    public sealed class EnemyAIController : MonoBehaviour, INoiseListener
    {
        // ------------------------------------------------------------ inspector
        [Header("Patrol")]
        [SerializeField] private Transform[] _waypoints;
        [SerializeField] private float _walkSpeed = 1.6f, _alertSpeed = 3.2f, _combatSpeed = 4.2f;
        [SerializeField] private float _waypointPauseSeconds = 1.5f;

        [Header("Detection meter")]
        [Tooltip("Seconds of full exposure needed to go from 0 to Combat.")]
        [SerializeField] private float _timeToSpot = 1.2f;
        [SerializeField] private float _meterDecayPerSecond = 0.35f;
        [SerializeField, Range(0f, 1f)] private float _suspicionThreshold = 0.35f;

        [Header("Hearing")]
        [Tooltip("Loudness that merely turns the head / triggers investigation.")]
        [SerializeField, Range(0f, 1f)] private float _faintNoise = 0.12f;
        [Tooltip("Loudness that immediately escalates to Alert (gunshots, glass).")]
        [SerializeField, Range(0f, 1f)] private float _loudNoise = 0.55f;

        [Header("Timers")]
        [SerializeField] private float _investigateSeconds = 5f;
        [SerializeField] private float _searchSeconds = 10f;
        [SerializeField] private float _shootIntervalSeconds = 0.8f;

        // --------------------------------------------------------------- events
        /// <summary>Observer hooks: animator, barks ("Wer da?!"), squad coordinator.</summary>
        public event Action<AIState> StateChanged;
        public event Action<Vector3> ShotFired;

        public AIState State { get; private set; }
        public float DetectionMeter { get; private set; }   // 0..1 for the UI eye icon
        public Vector3 LastStimulusPosition { get; private set; }

        // ---------------------------------------------------------------- state
        private NavMeshAgent _agent;
        private FieldOfView  _fov;
        private int _noiseSlot = -1;

        private IAIState _current;
        private PatrolState _patrol; private SuspiciousState _suspicious;
        private AlertState _alert;   private CombatState _combat;
        private ReturnState _return;

        Transform INoiseListener.ListenerTransform => transform;

        private void Awake()
        {
            _agent = GetComponent<NavMeshAgent>();
            _fov   = GetComponent<FieldOfView>();

            _patrol     = new PatrolState(this);
            _suspicious = new SuspiciousState(this);
            _alert      = new AlertState(this);
            _combat     = new CombatState(this);
            _return     = new ReturnState(this);
        }

        private void OnEnable()
        {
            if (NoiseManager.Instance != null)
                _noiseSlot = NoiseManager.Instance.Register(this);
        }

        private void OnDisable()
        {
            if (NoiseManager.Instance != null && _noiseSlot >= 0)
                NoiseManager.Instance.Unregister(_noiseSlot);
            _noiseSlot = -1;
        }

        private void Start() => TransitionTo(_patrol, AIState.Patrol);

        private void Update()
        {
            TickDetectionMeter(Time.deltaTime);
            _current?.Tick(Time.deltaTime);
        }

        // ----------------------------------------------------------- perception
        /// <summary>
        /// Vision fills the meter continuously; states read thresholds instead of
        /// reacting to one-frame glimpses — that is what makes leaning out of cover
        /// for half a second survivable.
        /// </summary>
        private void TickDetectionMeter(float dt)
        {
            float exposure = _fov.VisibleTarget != null ? _fov.TargetExposure : 0f;
            if (exposure > 0f)
            {
                DetectionMeter = Mathf.Min(1f, DetectionMeter + exposure * dt / _timeToSpot);
                LastStimulusPosition = _fov.VisibleTarget.position;
            }
            else
            {
                DetectionMeter = Mathf.Max(0f, DetectionMeter - _meterDecayPerSecond * dt);
            }
        }

        void INoiseListener.OnNoiseHeard(in NoiseEvent noise, float loudness)
        {
            if (loudness < _faintNoise) return;
            LastStimulusPosition = noise.Position;

            bool loud = loudness >= _loudNoise
                        || noise.Type == NoiseType.Gunshot
                        || noise.Type == NoiseType.Explosion;

            switch (State)
            {
                case AIState.Patrol:
                case AIState.ReturnToPost:
                    TransitionTo(loud ? _alert : (IAIState)_suspicious,
                                 loud ? AIState.Alert : AIState.Suspicious);
                    break;
                case AIState.Suspicious:
                    // A second stimulus while already investigating escalates.
                    if (loud) TransitionTo(_alert, AIState.Alert);
                    else _suspicious.Refresh(noise.Position);
                    break;
                case AIState.Alert:
                    _alert.Refresh(noise.Position);
                    break;
                // Combat ignores noises — it already knows where the target is.
            }
        }

        private void TransitionTo(IAIState next, AIState id)
        {
            _current?.Exit();
            _current = next;
            State = id;
            _current.Enter();
            StateChanged?.Invoke(id);
        }

        // ============================================================= STATES ==

        private interface IAIState { void Enter(); void Exit(); void Tick(float dt); }

        private abstract class BaseState : IAIState
        {
            protected readonly EnemyAIController C;
            protected BaseState(EnemyAIController c) => C = c;
            public virtual void Enter() { }
            public virtual void Exit() { }
            public abstract void Tick(float dt);

            /// <summary>Shared escalation checks used by every non-combat state.</summary>
            protected bool TryEscalateFromVision()
            {
                if (C.DetectionMeter >= 1f && C._fov.VisibleTarget != null)
                { C.TransitionTo(C._combat, AIState.Combat); return true; }
                return false;
            }
        }

        // ------------------------------------------------------------ 1. PATROL
        private sealed class PatrolState : BaseState
        {
            private int _index; private float _pause;
            public PatrolState(EnemyAIController c) : base(c) { }

            public override void Enter()
            {
                C._agent.speed = C._walkSpeed;
                C._agent.isStopped = false;
                MoveToCurrent();
            }

            public override void Tick(float dt)
            {
                if (TryEscalateFromVision()) return;
                if (C.DetectionMeter >= C._suspicionThreshold)
                { C.TransitionTo(C._suspicious, AIState.Suspicious); return; }

                if (C._waypoints == null || C._waypoints.Length == 0) return;
                if (C._agent.pathPending || C._agent.remainingDistance > 0.3f) return;

                _pause += dt;                     // linger at the waypoint, look around
                if (_pause < C._waypointPauseSeconds) return;
                _pause = 0f;
                _index = (_index + 1) % C._waypoints.Length;
                MoveToCurrent();
            }

            private void MoveToCurrent()
            {
                if (C._waypoints != null && C._waypoints.Length > 0)
                    C._agent.SetDestination(C._waypoints[_index].position);
            }
        }

        // -------------------------------------------------------- 2. SUSPICIOUS
        /// <summary>Walks to the stimulus origin and sweeps the area by rotating.</summary>
        private sealed class SuspiciousState : BaseState
        {
            private float _timer;
            public SuspiciousState(EnemyAIController c) : base(c) { }

            public override void Enter()
            {
                _timer = 0f;
                C._agent.speed = C._walkSpeed;
                C._agent.isStopped = false;
                C._agent.SetDestination(C.LastStimulusPosition);
            }

            public void Refresh(Vector3 newOrigin)
            {
                _timer = 0f;
                C._agent.SetDestination(newOrigin);
            }

            public override void Tick(float dt)
            {
                if (TryEscalateFromVision()) return;

                bool arrived = !C._agent.pathPending && C._agent.remainingDistance < 0.5f;
                if (arrived)
                {
                    // Sweep: slow turn in place, ears open, meter still ticking.
                    C.transform.Rotate(0f, 65f * dt, 0f);
                    _timer += dt;
                    if (_timer >= C._investigateSeconds)
                        C.TransitionTo(C._return, AIState.ReturnToPost);
                }
            }
        }

        // ------------------------------------------------------------- 3. ALERT
        /// <summary>
        /// Weapon up, fast search around the last known position. Any confirmed
        /// sight (meter ≥ suspicion threshold is enough here) drops into Combat.
        /// </summary>
        private sealed class AlertState : BaseState
        {
            private float _timer, _repathTimer;
            public AlertState(EnemyAIController c) : base(c) { }

            public override void Enter()
            {
                _timer = 0f; _repathTimer = 0f;
                C._agent.speed = C._alertSpeed;
                C._agent.isStopped = false;
                C._agent.SetDestination(C.LastStimulusPosition);
            }

            public void Refresh(Vector3 origin)
            {
                _timer = 0f;
                C._agent.SetDestination(origin);
            }

            public override void Tick(float dt)
            {
                if (C._fov.VisibleTarget != null
                    && C.DetectionMeter >= C._suspicionThreshold)
                { C.TransitionTo(C._combat, AIState.Combat); return; }

                _timer += dt; _repathTimer += dt;

                // Search pattern: every 2.5 s pick a point on a ring around the
                // last stimulus (deterministic-ish sweep, no allocations).
                if (_repathTimer >= 2.5f && !C._agent.pathPending
                    && C._agent.remainingDistance < 0.6f)
                {
                    _repathTimer = 0f;
                    float a = (_timer * 1.7f) % (2f * Mathf.PI);
                    Vector3 probe = C.LastStimulusPosition
                        + new Vector3(Mathf.Cos(a), 0f, Mathf.Sin(a)) * 4f;
                    C._agent.SetDestination(probe);
                }

                if (_timer >= C._searchSeconds)
                    C.TransitionTo(C._return, AIState.ReturnToPost);
            }
        }

        // ------------------------------------------------------------ 4. COMBAT
        /// <summary>
        /// Engages the visible target: hold effective range, face, fire on interval.
        /// Losing sight hands over to Alert centred on the last seen position.
        /// </summary>
        private sealed class CombatState : BaseState
        {
            private const float PreferredRange = 9f;
            private float _shootTimer;
            public CombatState(EnemyAIController c) : base(c) { }

            public override void Enter()
            {
                _shootTimer = 0f;
                C._agent.speed = C._combatSpeed;
                C._agent.isStopped = false;
            }

            public override void Tick(float dt)
            {
                Transform target = C._fov.VisibleTarget;
                if (target == null)
                {
                    C.DetectionMeter = C._suspicionThreshold;  // stays wary
                    C.TransitionTo(C._alert, AIState.Alert);
                    return;
                }

                C.LastStimulusPosition = target.position;
                Vector3 to = target.position - C.transform.position; to.y = 0f;
                float dist = to.magnitude;

                // Face the target directly (agent rotation is too lazy in a firefight).
                if (dist > 0.01f)
                    C.transform.rotation = Quaternion.Slerp(C.transform.rotation,
                        Quaternion.LookRotation(to), 10f * dt);

                // Keep range: advance if too far, hold if inside.
                if (dist > PreferredRange) C._agent.SetDestination(target.position);
                else C._agent.SetDestination(C.transform.position);

                _shootTimer += dt;
                if (_shootTimer >= C._shootIntervalSeconds)
                {
                    _shootTimer = 0f;
                    C.ShotFired?.Invoke(target.position);   // weapon system subscribes
                }
            }
        }

        // ---------------------------------------------------- 5. RETURN TO POST
        private sealed class ReturnState : BaseState
        {
            public ReturnState(EnemyAIController c) : base(c) { }

            public override void Enter()
            {
                C._agent.speed = C._walkSpeed;
                C._agent.isStopped = false;
                if (C._waypoints != null && C._waypoints.Length > 0)
                    C._agent.SetDestination(C._waypoints[0].position);
            }

            public override void Tick(float dt)
            {
                if (TryEscalateFromVision()) return;
                if (C.DetectionMeter >= C._suspicionThreshold)
                { C.TransitionTo(C._suspicious, AIState.Suspicious); return; }
                if (!C._agent.pathPending && C._agent.remainingDistance < 0.4f)
                    C.TransitionTo(C._patrol, AIState.Patrol);
            }
        }
    }
}
