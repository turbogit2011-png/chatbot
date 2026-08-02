using UnityEngine;

namespace SkiJump.Physics
{
    /// <summary>
    /// Silnik aerodynamiki zawodnika. Wylicza siłę nośną (Lift) i opór (Drag)
    /// na podstawie kąta natarcia (Angle of Attack), wychylenia ciała i lokalnego
    /// wektora wiatru pobieranego z <see cref="WindSystem"/>.
    ///
    /// Równania:
    ///   F_L = 0.5 * rho * v^2 * S * C_L(AoA)
    ///   F_D = 0.5 * rho * v^2 * S * C_D(AoA)
    ///
    /// Wymagania wydajnościowe:
    ///  - zero alokacji GC w FixedUpdate (wyłącznie struktury na stosie),
    ///  - krzywe C_L / C_D próbkowane z AnimationCurve wypiekanych do tablic
    ///    (lookup table) w Awake, aby uniknąć kosztu Evaluate na urządzeniach mobilnych.
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    [DisallowMultipleComponent]
    public sealed class SkierPhysicsController : MonoBehaviour
    {
        // ---------------------------------------------------------------- consts
        private const int   CurveLutSize   = 256;    // rozdzielczość LUT współczynników
        private const float MinAirSpeedSqr = 0.25f;  // poniżej 0.5 m/s aerodynamika pomijalna

        // ------------------------------------------------------------ inspector
        [Header("Środowisko")]
        [Tooltip("Gęstość powietrza [kg/m^3]. 1.10–1.25 zależnie od wysokości skoczni n.p.m.")]
        [SerializeField] private float _airDensity = 1.18f;

        [Header("Sylwetka zawodnika")]
        [Tooltip("Powierzchnia odniesienia ciała + nart w pozycji lotnej [m^2].")]
        [SerializeField] private float _referenceArea = 0.95f;

        [Tooltip("Dodatkowa powierzchnia z tytułu rozwarcia nart w stylu V (0..1 -> +m^2).")]
        [SerializeField] private float _vStyleAreaBonus = 0.18f;

        [Header("Współczynniki aerodynamiczne (oś X: AoA w stopniach -90..90)")]
        [SerializeField] private AnimationCurve _liftCoefficient = DefaultLiftCurve();
        [SerializeField] private AnimationCurve _dragCoefficient = DefaultDragCurve();

        [Header("Sterowanie sylwetką")]
        [Tooltip("Maksymalna szybkość zmiany pochylenia tułowia [deg/s].")]
        [SerializeField] private float _torsoPitchRate = 45f;
        [Tooltip("Zakres pochylenia tułowia względem osi nart [deg].")]
        [SerializeField] private float _torsoPitchMin = -12f, _torsoPitchMax = 28f;
        [Tooltip("Moment stabilizujący — jak mocno fizyka koryguje obrót ciała do zadanego AoA.")]
        [SerializeField] private float _attitudeTorque = 14f;

        // --------------------------------------------------------------- state
        private Rigidbody  _body;
        private WindSystem _wind;

        // LUT wypiekane z AnimationCurve — brak Evaluate() w pętli fizyki.
        private readonly float[] _liftLut = new float[CurveLutSize];
        private readonly float[] _dragLut = new float[CurveLutSize];

        // Wejścia sterowania (zapisywane przez FSM / input, czytane w FixedUpdate).
        private float _targetTorsoPitch;   // [deg] zadane pochylenie tułowia
        private float _currentTorsoPitch;  // [deg] wygładzone pochylenie
        private float _vStyleAmount;       // 0..1 rozwarcie nart w V
        private bool  _aeroEnabled;        // aerodynamika aktywna tylko w fazie lotu

        // Telemetria ostatniego kroku fizyki (dla HUD/sędziów) — pola, nie właściwości
        // z alokacją; struktury czytane przez inne systemy bez kopiowania łańcuchów.
        public float   LastAngleOfAttackDeg { get; private set; }
        public float   LastAirSpeed         { get; private set; }
        public Vector3 LastLiftForce        { get; private set; }
        public Vector3 LastDragForce        { get; private set; }
        public Vector3 LastWind             { get; private set; }

        public Rigidbody Body => _body;

        // ---------------------------------------------------------- life cycle
        private void Awake()
        {
            _body = GetComponent<Rigidbody>();
            _wind = WindSystem.Instance;

            BakeCurve(_liftCoefficient, _liftLut);
            BakeCurve(_dragCoefficient, _dragLut);
        }

        /// <summary>Włącza/wyłącza siły aerodynamiczne (FSM: tylko stan Flight).</summary>
        public void SetAerodynamicsEnabled(bool enabled) => _aeroEnabled = enabled;

        /// <summary>Wejście gracza: -1..1 mapowane na zakres pochylenia tułowia.</summary>
        public void SetTorsoPitchInput(float normalized)
        {
            normalized = Mathf.Clamp(normalized, -1f, 1f);
            _targetTorsoPitch = Mathf.Lerp(_torsoPitchMin, _torsoPitchMax, (normalized + 1f) * 0.5f);
        }

        /// <summary>Wejście gracza: rozwarcie nart w stylu V (0..1).</summary>
        public void SetVStyleInput(float normalized) => _vStyleAmount = Mathf.Clamp01(normalized);

        // -------------------------------------------------------------- physics
        private void FixedUpdate()
        {
            if (!_aeroEnabled)
                return;

            float dt = Time.fixedDeltaTime;

            // Wygładzenie sterowania sylwetką (rate limit — realistyczna bezwładność ciała).
            _currentTorsoPitch = Mathf.MoveTowards(
                _currentTorsoPitch, _targetTorsoPitch, _torsoPitchRate * dt);

            // 1. Prędkość względem powietrza: v_air = v_skier - v_wind.
            Vector3 wind     = _wind != null ? _wind.SampleWind(_body.position) : Vector3.zero;
            Vector3 airVel   = _body.linearVelocity - wind;
            float   speedSqr = airVel.sqrMagnitude;
            LastWind = wind;

            if (speedSqr < MinAirSpeedSqr)
                return;

            float   speed  = Mathf.Sqrt(speedSqr);
            Vector3 airDir = airVel / speed; // znormalizowany kierunek opływu

            // 2. Kąt natarcia: kąt między osią podłużną ciała (transform.forward,
            //    skorygowaną o pochylenie tułowia) a kierunkiem opływu.
            Vector3 chord = Quaternion.AngleAxis(-_currentTorsoPitch, transform.right)
                            * transform.forward;
            float aoa = Vector3.SignedAngle(airDir, chord, transform.right);
            LastAngleOfAttackDeg = aoa;

            // 3. Powierzchnia efektywna rośnie z rozwarciem V.
            float area = _referenceArea + _vStyleAmount * _vStyleAreaBonus;

            // 4. Współczynniki z LUT (bez Evaluate, bez alokacji).
            float cl = SampleLut(_liftLut, aoa);
            float cd = SampleLut(_dragLut, aoa);

            // 5. Ciśnienie dynamiczne q = 0.5 * rho * v^2.
            float q = 0.5f * _airDensity * speedSqr;

            // 6. Opór — przeciwnie do kierunku opływu; nośna — prostopadle do opływu,
            //    w płaszczyźnie wyznaczonej przez oś boczną zawodnika.
            Vector3 dragForce = -airDir * (q * area * cd);
            Vector3 liftDir   = Vector3.Cross(airDir, transform.right).normalized;
            Vector3 liftForce = liftDir * (q * area * cl);

            LastDragForce = dragForce;
            LastLiftForce = liftForce;

            _body.AddForce(dragForce + liftForce, ForceMode.Force);

            // 7. Moment pochylający — fizyka dąży do orientacji zgodnej z wejściem gracza,
            //    ale podmuch boczny/tylny realnie destabilizuje sylwetkę.
            float pitchError = _currentTorsoPitch - Vector3.SignedAngle(
                airDir, transform.forward, transform.right);
            _body.AddTorque(transform.right * (pitchError * _attitudeTorque), ForceMode.Force);
        }

        // ---------------------------------------------------------------- utils
        /// <summary>Wypieka AnimationCurve do tablicy float — jednorazowo w Awake.</summary>
        private static void BakeCurve(AnimationCurve curve, float[] lut)
        {
            for (int i = 0; i < CurveLutSize; i++)
            {
                float aoa = Mathf.Lerp(-90f, 90f, i / (float)(CurveLutSize - 1));
                lut[i] = curve.Evaluate(aoa);
            }
        }

        /// <summary>Próbkuje LUT z interpolacją liniową. AoA w stopniach [-90, 90].</summary>
        private static float SampleLut(float[] lut, float aoaDeg)
        {
            float t = Mathf.InverseLerp(-90f, 90f, Mathf.Clamp(aoaDeg, -90f, 90f))
                      * (CurveLutSize - 1);
            int   i = (int)t;
            if (i >= CurveLutSize - 1) return lut[CurveLutSize - 1];
            float frac = t - i;
            return lut[i] + (lut[i + 1] - lut[i]) * frac;
        }

        /// <summary>Krzywa C_L wzorowana na danych tunelowych FIS (maks. ~35–40 deg AoA).</summary>
        private static AnimationCurve DefaultLiftCurve() => new AnimationCurve(
            new Keyframe(-90f, 0.00f), new Keyframe(-20f, -0.15f),
            new Keyframe(0f, 0.10f),   new Keyframe(15f, 0.55f),
            new Keyframe(35f, 0.85f),  new Keyframe(50f, 0.60f),  // przeciągnięcie
            new Keyframe(90f, 0.10f));

        /// <summary>Krzywa C_D — minimalny opór przy małym AoA, rośnie kwadratowo.</summary>
        private static AnimationCurve DefaultDragCurve() => new AnimationCurve(
            new Keyframe(-90f, 1.30f), new Keyframe(-20f, 0.55f),
            new Keyframe(0f, 0.32f),   new Keyframe(15f, 0.42f),
            new Keyframe(35f, 0.75f),  new Keyframe(90f, 1.40f));
    }
}
