using System;
using UnityEngine;

namespace SkiJump.Scoring
{
    using SkiJump.Skier;

    /// <summary>Kompletny wynik przejazdu — struct, przekazywany bez alokacji.</summary>
    public struct JumpResult
    {
        public float Distance;          // [m]
        public float DistancePoints;    // punkty za odległość
        public float WindCompensation;  // +/- punkty za wiatr
        public float GateCompensation;  // +/- punkty za belkę
        public float StylePoints;       // suma 3 środkowych not
        public float TotalPoints;
        public bool  IsCrash;

        // Noty 5 sędziów jako pola struct — bez tablicy, więc bez alokacji GC.
        private float _j0, _j1, _j2, _j3, _j4;

        /// <summary>Nota sędziego i (0–4), zakres 0–20 pkt, krok 0.5.</summary>
        public float GetJudgeMark(int i) => i switch
        {
            0 => _j0, 1 => _j1, 2 => _j2, 3 => _j3, _ => _j4
        };

        public void SetJudgeMark(int i, float v)
        {
            switch (i)
            {
                case 0: _j0 = v; break;
                case 1: _j1 = v; break;
                case 2: _j2 = v; break;
                case 3: _j3 = v; break;
                default: _j4 = v; break;
            }
        }
    }

    /// <summary>
    /// Kalkulator punktowy zgodny z zasadami FIS (International Competition Rules,
    /// Ski Jumping):
    ///
    ///  1. Punkty za odległość: 60 pkt za skok na punkt K (na mamucie 120 pkt),
    ///     +/- "meter value" za każdy metr powyżej/poniżej K. Wartość metra
    ///     zależy od rozmiaru skoczni (tabela FIS, sekcja 431.2).
    ///  2. Kompensata wiatru: +/- (wiatr * wind factor). Wiatr przedni odejmuje
    ///     punkty (pomaga), tylny dodaje z mnożnikiem 1.5 (FIS stosuje wyższy
    ///     współczynnik dla wiatru w plecy). Wind factor certyfikowany per skocznia.
    ///  3. Kompensata belki: zmiana najazdu względem belki bazowej * gate factor.
    ///  4. Noty za styl: 5 sędziów, 0–20 pkt (krok 0.5); skrajne noty (najwyższa
    ///     i najniższa) odrzucane — liczą się 3 środkowe (maks. 60 pkt).
    ///
    /// Ocena stylu w symulacji jest deterministyczną funkcją telemetrii lotu
    /// (stabilność AoA), lądowania (telemark, twardość) i odjazdu, z małym szumem
    /// per sędzia — jak w realu, sędziowie różnią się o 0.5–1.0 pkt.
    /// </summary>
    public sealed class FISScoringSystem : MonoBehaviour
    {
        [Header("Profil skoczni")]
        [Tooltip("Punkt konstrukcyjny K [m].")]
        [SerializeField] private float _kPoint = 125f;
        [Tooltip("Rozmiar skoczni HS [m] — granica bezpiecznego lądowania.")]
        [SerializeField] private float _hillSize = 140f;
        [Tooltip("Certyfikowany współczynnik wiatru [pkt na m/s].")]
        [SerializeField] private float _windFactor = 10.8f;
        [Tooltip("Certyfikowany współczynnik belki [pkt na jedną belkę].")]
        [SerializeField] private float _gateFactor = 7.2f;
        [Tooltip("Belka bazowa ustalona przez jury.")]
        [SerializeField] private int _baseGate = 15;

        [Header("Referencje")]
        [SerializeField] private SkierStateMachine _skier;

        /// <summary>Aktualna belka startowa (jury / gracz w trybie ryzyka).</summary>
        public int CurrentGate { get; set; } = 15;

        /// <summary>Observer Pattern — wynik gotowy (HUD, tablica wyników, replay).</summary>
        public event Action<JumpResult> ResultReady;

        // Ziarna szumu sędziowskiego — stałe per zawody, różne per sędzia.
        private readonly float[] _judgeBias = new float[5];

        private void Awake()
        {
            var rng = new System.Random(12345);
            for (int i = 0; i < 5; i++)
                _judgeBias[i] = (float)(rng.NextDouble() - 0.5) * 1.0f; // +/- 0.5 pkt
        }

        private void OnEnable()
        {
            if (_skier == null) return;
            _skier.Landed  += OnLanded;
            _skier.Crashed += OnCrashed;
        }

        private void OnDisable()
        {
            if (_skier == null) return;
            _skier.Landed  -= OnLanded;
            _skier.Crashed -= OnCrashed;
        }

        // ------------------------------------------------------------- scoring
        private void OnLanded(float distance, LandingStyle style, FlightTelemetry t)
        {
            JumpResult r = Score(distance, style, t);
            ResultReady?.Invoke(r);
        }

        private void OnCrashed()
        {
            JumpResult r = default;
            r.IsCrash = true;
            // FIS: upadek = noty stylu maks. 17.0, w praktyce 8–12; odległość liczona.
            ResultReady?.Invoke(r);
        }

        /// <summary>Pełne przeliczenie wyniku — czyste wejście/wyjście, testowalne.</summary>
        public JumpResult Score(float distance, LandingStyle style, FlightTelemetry t)
        {
            JumpResult r = default;
            r.Distance = distance;

            // --- 1. punkty za odległość -------------------------------------
            float basePoints = _kPoint >= 170f ? 120f : 60f; // skocznie mamucie: 120
            r.DistancePoints = basePoints + (distance - _kPoint) * MeterValue(_kPoint);

            // --- 2. kompensata wiatru ---------------------------------------
            // t.MeasuredWind > 0 = przedni (pomaga) => punkty ujemne.
            float wind = t.MeasuredWind;
            r.WindCompensation = wind >= 0f
                ? -wind * _windFactor
                : -wind * _windFactor * 1.5f; // tylny rekompensowany mocniej

            // --- 3. kompensata belki ----------------------------------------
            r.GateCompensation = (_baseGate - CurrentGate) * _gateFactor;

            // --- 4. noty sędziowskie ----------------------------------------
            float baseMark = ComputeBaseStyleMark(distance, style, t);
            float min = float.MaxValue, max = float.MinValue, sum = 0f;
            for (int i = 0; i < 5; i++)
            {
                float mark = Mathf.Clamp(
                    Mathf.Round((baseMark + _judgeBias[i]) * 2f) * 0.5f, // krok 0.5
                    0f, 20f);
                r.SetJudgeMark(i, mark);
                sum += mark;
                if (mark < min) min = mark;
                if (mark > max) max = mark;
            }
            r.StylePoints = sum - min - max; // 3 środkowe noty

            r.TotalPoints = Mathf.Max(0f,
                r.DistancePoints + r.WindCompensation + r.GateCompensation + r.StylePoints);
            return r;
        }

        /// <summary>
        /// Tabela FIS 431.2 — wartość punktowa metra zależna od punktu K.
        /// </summary>
        public static float MeterValue(float kPoint)
        {
            if (kPoint < 25f)  return 4.8f;
            if (kPoint < 30f)  return 4.4f;
            if (kPoint < 35f)  return 4.0f;
            if (kPoint < 40f)  return 3.6f;
            if (kPoint < 50f)  return 3.2f;
            if (kPoint < 60f)  return 2.8f;
            if (kPoint < 70f)  return 2.4f;
            if (kPoint < 80f)  return 2.2f;
            if (kPoint < 100f) return 2.0f;
            if (kPoint < 170f) return 1.8f; // duże skocznie (np. K-125)
            return 1.2f;                    // loty narciarskie (K >= 170)
        }

        /// <summary>
        /// Deterministyczna ocena stylu wg kryteriów FIS: lot (stabilność),
        /// lądowanie (telemark / dwie nogi, twardość), odjazd.
        /// Nota wyjściowa 20.0 pomniejszana o potrącenia.
        /// </summary>
        private float ComputeBaseStyleMark(float distance, LandingStyle style,
                                           in FlightTelemetry t)
        {
            float mark = 20f;

            // Lot: niestabilność AoA (odchylenie standardowe) — do -5.0 pkt.
            mark -= Mathf.Min(5f, t.AoaStdDev * 0.45f);

            // Wybicie widoczne w locie: słaby timing psuje pierwszą fazę — do -1.5.
            mark -= (1f - t.TakeoffQuality) * 1.5f;

            // Lądowanie: brak telemarku = min. -2.0 (praktyka sędziowska FIS).
            if (style != LandingStyle.Telemark)
                mark -= 2f;

            // Twarde lądowanie (prędkość pionowa) — do -2.0.
            mark -= Mathf.Min(2f, Mathf.Max(0f, t.LandingVerticalSpeed - 3.5f) * 0.6f);

            // Lądowanie poza HS jest niebezpieczne — sędziowie tną za podpory/chwiania.
            if (distance > _hillSize)
                mark -= 1.5f;

            return Mathf.Clamp(mark, 6f, 20f);
        }
    }
}
