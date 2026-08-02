using System;
using UnityEngine;

namespace SkiJump.Skier
{
    using SkiJump.Physics;
    using SkiJump.Scoring;

    /// <summary>Fazy skoku — publiczne dla HUD, kamer i audio.</summary>
    public enum SkierPhase { Inrun, Takeoff, Flight, Landing, Outrun, Crash }

    /// <summary>Rodzaj lądowania wybrany przez gracza.</summary>
    public enum LandingStyle { TwoFooted, Telemark }

    /// <summary>
    /// Maszyna stanów zawodnika (State Pattern).
    ///
    /// Stany są prealokowane w Awake i reużywane — przejścia nie alokują pamięci.
    /// Zdarzenia (Observer Pattern) wystawiane jako C# events; subskrybenci
    /// (kamera, HUD, audio, FISScoringSystem) rejestrują się raz na starcie.
    ///
    /// Wejście: abstrakcja ISkierInput pozwala podpiąć dotyk, żyroskop
    /// lub sztuczne wejście do testów automatycznych (Command Pattern po stronie
    /// implementacji input bufferingu).
    /// </summary>
    [RequireComponent(typeof(SkierPhysicsController))]
    public sealed class SkierStateMachine : MonoBehaviour
    {
        // ------------------------------------------------------------ inspector
        [Header("Najazd")]
        [Tooltip("Siła napędzająca w torach przy idealnym balansie [N].")]
        [SerializeField] private float _inrunDriveForce = 90f;
        [Tooltip("Kara aerodynamiczna za zły balans (0..1 => mnożnik oporu).")]
        [SerializeField] private float _balancePenalty = 0.35f;

        [Header("Wybicie")]
        [Tooltip("Szerokość okna idealnego wybicia [s] wokół krawędzi progu.")]
        [SerializeField] private float _perfectTakeoffWindow = 0.06f;
        [Tooltip("Maksymalna dopuszczalna odchyłka timingu [s] — powyżej brak wybicia.")]
        [SerializeField] private float _maxTakeoffOffset = 0.30f;
        [Tooltip("Impuls pionowy przy perfekcyjnym wybiciu [N*s].")]
        [SerializeField] private float _takeoffImpulse = 260f;

        [Header("Lądowanie")]
        [Tooltip("Maks. prędkość pionowa bezpiecznego lądowania [m/s].")]
        [SerializeField] private float _maxSafeVerticalSpeed = 7.5f;
        [Tooltip("Maks. kąt między nartami a zeskokiem przy przyziemieniu [deg].")]
        [SerializeField] private float _maxSafeContactAngle = 24f;

        [Header("Referencje")]
        [SerializeField] private Transform _takeoffEdge;   // krawędź progu
        [SerializeField] private Ragdoll  _ragdoll;        // aktywowany przy upadku

        // ------------------------------------------------------------- events
        /// <summary>Observer Pattern — powiadomienia o zmianie fazy.</summary>
        public event Action<SkierPhase> PhaseChanged;
        /// <summary>Jakość wybicia 0..1 (1 = perfekcyjny timing).</summary>
        public event Action<float> TakeoffExecuted;
        /// <summary>Dystans [m], styl lądowania, telemetria stabilności do oceny sędziów.</summary>
        public event Action<float, LandingStyle, FlightTelemetry> Landed;
        public event Action Crashed;

        // -------------------------------------------------------------- state
        private SkierPhysicsController _physics;
        private WindSystem _wind;
        private ISkierInput _input;

        private ISkierState _current;
        private InrunState   _inrun;
        private TakeoffState _takeoff;
        private FlightState  _flight;
        private LandingState _landing;
        private CrashState   _crash;
        private OutrunState  _outrun;

        public SkierPhase Phase { get; private set; }
        public SkierPhysicsController Physics => _physics;
        public ISkierInput Input => _input;

        // Telemetria lotu zbierana dla sędziów — struct, kopiowana bez alokacji.
        private FlightTelemetry _telemetry;

        private void Awake()
        {
            _physics = GetComponent<SkierPhysicsController>();
            _wind    = WindSystem.Instance;
            _input   = GetComponent<ISkierInput>() ?? new TouchSkierInput();

            // Prealokacja stanów — zero GC przy przejściach.
            _inrun   = new InrunState(this);
            _takeoff = new TakeoffState(this);
            _flight  = new FlightState(this);
            _landing = new LandingState(this);
            _crash   = new CrashState(this);
            _outrun  = new OutrunState(this);
        }

        private void Start() => TransitionTo(_inrun, SkierPhase.Inrun);

        private void Update()      => _current?.Tick(Time.deltaTime);
        private void FixedUpdate() => _current?.FixedTick(Time.fixedDeltaTime);

        private void OnCollisionEnter(Collision collision)
            => _current?.OnGroundContact(collision);

        private void TransitionTo(ISkierState next, SkierPhase phase)
        {
            _current?.Exit();
            _current = next;
            Phase = phase;
            _current.Enter();
            PhaseChanged?.Invoke(phase);
        }

        // ============================================================ STANY ===

        private interface ISkierState
        {
            void Enter();
            void Exit();
            void Tick(float dt);
            void FixedTick(float dt);
            void OnGroundContact(Collision collision);
        }

        /// <summary>Baza — puste implementacje, stany nadpisują tylko potrzebne haki.</summary>
        private abstract class SkierStateBase : ISkierState
        {
            protected readonly SkierStateMachine M;
            protected SkierStateBase(SkierStateMachine machine) => M = machine;
            public virtual void Enter() { }
            public virtual void Exit() { }
            public virtual void Tick(float dt) { }
            public virtual void FixedTick(float dt) { }
            public virtual void OnGroundContact(Collision collision) { }
        }

        // ----------------------------------------------------------- 1. INRUN
        /// <summary>
        /// Najazd: gracz balansuje ciałem (akcelerometr / wirtualny joystick).
        /// Idealny balans = pełna siła napędowa i minimalny opór; odchył = kara.
        /// Tap w strefie progu przechodzi do wybicia.
        /// </summary>
        private sealed class InrunState : SkierStateBase
        {
            public InrunState(SkierStateMachine m) : base(m) { }

            public override void Enter() => M._physics.SetAerodynamicsEnabled(false);

            public override void FixedTick(float dt)
            {
                float balance = M._input.Balance;                 // -1..1
                float quality = 1f - Mathf.Abs(balance);          // 1 = ideał
                float drive   = M._inrunDriveForce
                                * Mathf.Lerp(1f - M._balancePenalty, 1f, quality);
                M._physics.Body.AddForce(M.transform.forward * drive, ForceMode.Force);
            }

            public override void Tick(float dt)
            {
                if (M._input.ConsumeJumpTap())
                    M.TransitionTo(M._takeoff, SkierPhase.Takeoff);
            }
        }

        // --------------------------------------------------------- 2. TAKEOFF
        /// <summary>
        /// Wybicie: jakość zależy od odległości czasowej tapnięcia od momentu,
        /// w którym środek masy mija krawędź progu. Okno perfekcyjne
        /// (+/- _perfectTakeoffWindow) daje pełny impuls.
        /// </summary>
        private sealed class TakeoffState : SkierStateBase
        {
            public TakeoffState(SkierStateMachine m) : base(m) { }

            public override void Enter()
            {
                // Odchyłka czasowa: dystans do krawędzi / prędkość pozioma.
                Vector3 toEdge = M._takeoffEdge.position - M._physics.Body.position;
                float speed    = Mathf.Max(1f, M._physics.Body.linearVelocity.magnitude);
                float offset   = Mathf.Abs(Vector3.Dot(toEdge, M.transform.forward)) / speed;

                float quality = offset <= M._perfectTakeoffWindow
                    ? 1f
                    : Mathf.Clamp01(1f - (offset - M._perfectTakeoffWindow)
                                         / (M._maxTakeoffOffset - M._perfectTakeoffWindow));

                M._physics.Body.AddForce(
                    (M.transform.up + M.transform.forward * 0.15f).normalized
                    * (M._takeoffImpulse * (0.55f + 0.45f * quality)),
                    ForceMode.Impulse);

                M._telemetry.Reset();
                M._telemetry.TakeoffQuality = quality;
                M._wind?.BeginWindMeasurement();

                M.TakeoffExecuted?.Invoke(quality);
                M.TransitionTo(M._flight, SkierPhase.Flight);
            }
        }

        // ---------------------------------------------------------- 3. FLIGHT
        /// <summary>
        /// Lot: żyroskop / dwa kciuki sterują pochyleniem tułowia i rozwarciem V.
        /// Stan zbiera telemetrię stabilności (wariancja AoA) dla noty sędziowskiej.
        /// </summary>
        private sealed class FlightState : SkierStateBase
        {
            public FlightState(SkierStateMachine m) : base(m) { }

            public override void Enter() => M._physics.SetAerodynamicsEnabled(true);
            public override void Exit()  => M._physics.SetAerodynamicsEnabled(false);

            public override void Tick(float dt)
            {
                M._physics.SetTorsoPitchInput(M._input.TorsoPitch);
                M._physics.SetVStyleInput(M._input.VStyle);
            }

            public override void FixedTick(float dt)
                => M._telemetry.AccumulateFlightSample(
                    M._physics.LastAngleOfAttackDeg, dt);

            public override void OnGroundContact(Collision collision)
            {
                // Kontakt z zeskokiem => rozstrzygamy lądowanie vs upadek.
                Rigidbody body   = M._physics.Body;
                float verticalV  = -body.linearVelocity.y;
                Vector3 normal   = collision.GetContact(0).normal; // GetContact: bez alokacji
                float contactAng = Vector3.Angle(M.transform.up, normal);

                bool safe = verticalV <= M._maxSafeVerticalSpeed
                            && contactAng <= M._maxSafeContactAngle;

                if (!safe) { M.TransitionTo(M._crash, SkierPhase.Crash); return; }

                M._telemetry.LandingVerticalSpeed = verticalV;
                M._telemetry.LandingContactAngle  = contactAng;
                M.TransitionTo(M._landing, SkierPhase.Landing);
            }
        }

        // --------------------------------------------------------- 4. LANDING
        /// <summary>
        /// Lądowanie: krótkie okno na decyzję Telemark (drugi tap) vs dwie nogi.
        /// Telemark przy zbyt dużej prędkości pionowej grozi podparciem (upadkiem).
        /// </summary>
        private sealed class LandingState : SkierStateBase
        {
            private const float DecisionWindow = 0.25f; // [s] okno na telemark
            private float _timer;
            private float _distance;

            public LandingState(SkierStateMachine m) : base(m) { }

            public override void Enter()
            {
                _timer = 0f;
                _distance = Vector3.Distance(
                    M._takeoffEdge.position, M._physics.Body.position);
                M._telemetry.MeasuredWind = M._wind != null
                    ? M._wind.EndWindMeasurement() : 0f;
            }

            public override void Tick(float dt)
            {
                _timer += dt;

                if (M._input.ConsumeJumpTap())
                {
                    // Telemark na granicy bezpieczeństwa — ryzyko podparcia.
                    bool risky = M._telemetry.LandingVerticalSpeed
                                 > M._maxSafeVerticalSpeed * 0.85f;
                    if (risky && UnityEngine.Random.value < 0.5f)
                    {
                        M.TransitionTo(M._crash, SkierPhase.Crash);
                        return;
                    }
                    Finish(LandingStyle.Telemark);
                }
                else if (_timer >= DecisionWindow)
                {
                    Finish(LandingStyle.TwoFooted);
                }
            }

            private void Finish(LandingStyle style)
            {
                M._telemetry.Landing = style;
                M.Landed?.Invoke(_distance, style, M._telemetry);
                M.TransitionTo(M._outrun, SkierPhase.Outrun);
            }
        }

        // ----------------------------------------------------------- 5. CRASH
        /// <summary>Upadek: aktywacja ragdolla z dyssypacją energii.</summary>
        private sealed class CrashState : SkierStateBase
        {
            public CrashState(SkierStateMachine m) : base(m) { }

            public override void Enter()
            {
                M._physics.SetAerodynamicsEnabled(false);
                if (M._ragdoll != null)
                    M._ragdoll.Activate(M._physics.Body.linearVelocity);
                M.Crashed?.Invoke();
            }
        }

        // ---------------------------------------------------------- 6. OUTRUN
        /// <summary>Odjazd: hamowanie pługiem, stabilizacja — koniec przejazdu.</summary>
        private sealed class OutrunState : SkierStateBase
        {
            public OutrunState(SkierStateMachine m) : base(m) { }

            public override void FixedTick(float dt)
            {
                Rigidbody body = M._physics.Body;
                // liniowe hamowanie do zatrzymania
                body.AddForce(-body.linearVelocity.normalized
                              * Mathf.Min(220f, body.linearVelocity.sqrMagnitude),
                              ForceMode.Force);
            }
        }
    }

    // ====================================================================== //

    /// <summary>
    /// Telemetria przejazdu — struct przekazywana sędziom (FISScoringSystem).
    /// Wariancję AoA liczymy algorytmem Welforda (online, bez buforów).
    /// </summary>
    public struct FlightTelemetry
    {
        public float TakeoffQuality;        // 0..1
        public float LandingVerticalSpeed;  // m/s
        public float LandingContactAngle;   // deg
        public float MeasuredWind;          // m/s (+ przedni)
        public LandingStyle Landing;

        private int   _samples;
        private float _mean, _m2;
        public  float FlightTime { get; private set; }

        /// <summary>Odchylenie standardowe kąta natarcia — miara stabilności lotu.</summary>
        public float AoaStdDev => _samples > 1 ? Mathf.Sqrt(_m2 / (_samples - 1)) : 0f;

        public void Reset() => this = default;

        public void AccumulateFlightSample(float aoaDeg, float dt)
        {
            FlightTime += dt;
            _samples++;
            float delta = aoaDeg - _mean;
            _mean += delta / _samples;
            _m2   += delta * (aoaDeg - _mean);
        }
    }

    /// <summary>
    /// Abstrakcja wejścia gracza — implementacje: dotyk + żyroskop (produkcja),
    /// klawiatura (edytor), replay/AI (testy).
    /// </summary>
    public interface ISkierInput
    {
        /// <summary>Balans na najeździe, -1..1 (akcelerometr lub joystick).</summary>
        float Balance { get; }
        /// <summary>Pochylenie tułowia w locie, -1..1 (żyroskop pitch lub lewy kciuk).</summary>
        float TorsoPitch { get; }
        /// <summary>Rozwarcie nart V, 0..1 (prawy kciuk).</summary>
        float VStyle { get; }
        /// <summary>Zwraca true jednorazowo po tapnięciu (bufor konsumowany).</summary>
        bool ConsumeJumpTap();
    }

    /// <summary>
    /// Produkcyjne wejście mobilne: akcelerometr (balans), żyroskop (tułów),
    /// pionowy swipe prawym kciukiem (V), tap (wybicie/telemark).
    /// Odpytywane w Update — bez alokacji.
    /// </summary>
    public sealed class TouchSkierInput : ISkierInput
    {
        private bool _tapBuffered;
        private float _vStyle;

        public float Balance    => Mathf.Clamp(UnityEngine.Input.acceleration.x * 2f, -1f, 1f);
        public float TorsoPitch => Mathf.Clamp(-UnityEngine.Input.gyro.rotationRateUnbiased.x, -1f, 1f);
        public float VStyle     => _vStyle;

        public bool ConsumeJumpTap()
        {
            Poll();
            if (!_tapBuffered) return false;
            _tapBuffered = false;
            return true;
        }

        private void Poll()
        {
            for (int i = 0; i < UnityEngine.Input.touchCount; i++)
            {
                Touch t = UnityEngine.Input.GetTouch(i);
                bool rightHalf = t.position.x > Screen.width * 0.5f;

                if (t.phase == TouchPhase.Began && !rightHalf)
                    _tapBuffered = true;

                if (rightHalf && (t.phase == TouchPhase.Moved || t.phase == TouchPhase.Stationary))
                    _vStyle = Mathf.Clamp01(t.position.y / Screen.height);
            }
        }
    }

    /// <summary>Minimalny ragdoll z dyssypacją energii przy upadku.</summary>
    public sealed class Ragdoll : MonoBehaviour
    {
        [SerializeField] private Rigidbody[] _bones;
        [SerializeField, Range(0f, 1f)] private float _energyRetention = 0.55f;

        public void Activate(Vector3 inheritedVelocity)
        {
            Vector3 v = inheritedVelocity * _energyRetention; // dyssypacja energii
            for (int i = 0; i < _bones.Length; i++)
            {
                _bones[i].isKinematic = false;
                _bones[i].linearVelocity = v;
            }
        }
    }
}
