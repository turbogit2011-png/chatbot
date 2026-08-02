using System;
using UnityEngine;

namespace SkiJump.Physics
{
    /// <summary>
    /// Dynamiczny system wiatru 3D oparty na szumie Perlina.
    ///
    /// Model = wiatr bazowy (kierunek + siła ustawiane per skocznia / per seria)
    ///        + podmuchy (gust) o niskiej częstotliwości
    ///        + turbulencja o wysokiej częstotliwości, zmienna w przestrzeni.
    ///
    /// Wiatr jest funkcją (pozycja, czas) — zawodnik na progu i w połowie zeskoku
    /// może dostać inny podmuch, co odwzorowuje realne warunki na skoczni.
    ///
    /// GC-free: SampleWind nie alokuje; średnia do kompensaty FIS liczona
    /// akumulacyjnie bez kolekcji.
    /// </summary>
    [DefaultExecutionOrder(-100)]
    public sealed class WindSystem : MonoBehaviour
    {
        public static WindSystem Instance { get; private set; }

        // ------------------------------------------------------------ inspector
        [Header("Wiatr bazowy")]
        [Tooltip("Kierunek bazowy w płaszczyźnie XZ [deg]. 0 = wiatr w plecy (tylny), 180 = pod narty (przedni).")]
        [SerializeField] private float _baseDirectionDeg = 180f;
        [Tooltip("Średnia siła wiatru [m/s].")]
        [SerializeField, Range(0f, 8f)] private float _baseSpeed = 1.6f;

        [Header("Podmuchy (Perlin, niska częstotliwość)")]
        [SerializeField, Range(0f, 6f)]  private float _gustStrength = 2.2f;
        [SerializeField, Range(0.01f, 1f)] private float _gustFrequency = 0.07f;

        [Header("Turbulencja (Perlin, wysoka częstotliwość, zmienna w przestrzeni)")]
        [SerializeField, Range(0f, 3f)]  private float _turbulenceStrength = 0.8f;
        [SerializeField, Range(0.01f, 2f)] private float _spatialFrequency = 0.045f;

        [Header("Składowa pionowa")]
        [Tooltip("Udział składowej pionowej (noszenie/duszenie) względem poziomej.")]
        [SerializeField, Range(0f, 1f)] private float _verticalRatio = 0.35f;

        // ---------------------------------------------------------------- state
        private float _seedA, _seedB, _seedC;   // offsety szumu — inne pole na każdą oś
        private float _time;

        // Akumulator do średniej wiatru podczas lotu (kompensata FIS).
        private float _windSum;      // suma rzutu wiatru na oś skoczni (+ pod narty)
        private int   _windSamples;
        private bool  _recording;

        /// <summary>Oś skoczni w płaszczyźnie poziomej (kierunek lotu zawodnika).</summary>
        public Vector3 HillForward { get; set; } = Vector3.forward;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;

            // Losowe ziarna — każda sesja ma inny przebieg wiatru.
            var rng = new System.Random();
            _seedA = (float)rng.NextDouble() * 1000f;
            _seedB = (float)rng.NextDouble() * 1000f;
            _seedC = (float)rng.NextDouble() * 1000f;
        }

        private void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        private void Update() => _time += Time.deltaTime;

        // ------------------------------------------------------------------ api
        /// <summary>
        /// Zwraca wektor wiatru [m/s] w danym punkcie przestrzeni i bieżącej chwili.
        /// Brak alokacji — wyłącznie operacje na strukturach.
        /// </summary>
        public Vector3 SampleWind(Vector3 position)
        {
            float t = _time;

            // --- podmuch globalny (zmienny w czasie, wspólny dla całej skoczni)
            // Perlin zwraca 0..1 -> mapujemy na -1..1.
            float gust = (Mathf.PerlinNoise(_seedA, t * _gustFrequency) - 0.5f) * 2f;

            // powolny dryf kierunku bazowego +/- 25 deg
            float dirDrift = (Mathf.PerlinNoise(_seedB, t * _gustFrequency * 0.5f) - 0.5f) * 50f;
            float dirRad   = (_baseDirectionDeg + dirDrift) * Mathf.Deg2Rad;

            float horizontalSpeed = Mathf.Max(0f, _baseSpeed + gust * _gustStrength);
            float wx = Mathf.Sin(dirRad) * horizontalSpeed;
            float wz = Mathf.Cos(dirRad) * horizontalSpeed;

            // --- turbulencja lokalna (zmienna w przestrzeni i czasie, per oś)
            float px = position.x * _spatialFrequency;
            float pz = position.z * _spatialFrequency;
            float ty = position.y * _spatialFrequency + t * 0.9f;

            wx += (Mathf.PerlinNoise(px + _seedA, ty) - 0.5f) * 2f * _turbulenceStrength;
            wz += (Mathf.PerlinNoise(pz + _seedB, ty) - 0.5f) * 2f * _turbulenceStrength;

            // --- składowa pionowa: noszenie przy wietrze pod narty, duszenie w plecy
            float headwind = -(wx * HillForward.x + wz * HillForward.z); // + = przedni
            float wy = headwind * _verticalRatio
                     + (Mathf.PerlinNoise(_seedC, ty) - 0.5f) * _turbulenceStrength;

            Vector3 result;
            result.x = wx; result.y = wy; result.z = wz;

            if (_recording)
            {
                _windSum += headwind;
                _windSamples++;
            }
            return result;
        }

        // ------------------------------------- pomiar do kompensaty punktowej FIS
        /// <summary>Rozpoczyna pomiar średniego wiatru (wywołać przy wybiciu).</summary>
        public void BeginWindMeasurement()
        {
            _windSum = 0f; _windSamples = 0; _recording = true;
        }

        /// <summary>
        /// Kończy pomiar i zwraca średni wiatr wzdłuż osi skoczni [m/s].
        /// Wartość dodatnia = wiatr przedni (pod narty), ujemna = tylny.
        /// </summary>
        public float EndWindMeasurement()
        {
            _recording = false;
            return _windSamples > 0 ? _windSum / _windSamples : 0f;
        }

        /// <summary>Konfiguracja warunków per seria (np. z ustawień zawodów).</summary>
        public void Configure(float baseDirectionDeg, float baseSpeed,
                              float gustStrength, float turbulence)
        {
            _baseDirectionDeg   = baseDirectionDeg;
            _baseSpeed          = baseSpeed;
            _gustStrength       = gustStrength;
            _turbulenceStrength = turbulence;
        }
    }
}
