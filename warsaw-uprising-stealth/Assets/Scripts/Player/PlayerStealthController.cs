using UnityEngine;
using WU1944.AI;
using WU1944.Stealth;

namespace WU1944.Player
{
    /// <summary>
    /// Mobile movement + stealth stance for the resistance fighter.
    ///
    /// Touch model (contextual):
    ///  - left half of the screen = floating virtual joystick (drag from touch-down),
    ///  - tap on the right half toggles crouch,
    ///  - joystick deflection picks the stance automatically:
    ///      ≤ 55 % = walk, > 55 % = run (running while crouched stands you up).
    ///
    /// Integrations:
    ///  - drives <see cref="SoundEmitter.TickFootsteps"/> with the current stance,
    ///  - implements <see cref="IStealthTarget"/>: crouching and cover shrink the
    ///    exposure the guards' <see cref="FieldOfView"/> perceives.
    ///
    /// Editor fallback: WASD + Left Shift (run) + C (crouch).
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    [RequireComponent(typeof(SoundEmitter))]
    public sealed class PlayerStealthController : MonoBehaviour, IStealthTarget
    {
        // ------------------------------------------------------------ inspector
        [Header("Movement")]
        [SerializeField] private float _walkSpeed = 2.4f;
        [SerializeField] private float _runSpeed = 5.2f;
        [SerializeField] private float _crouchSpeed = 1.3f;
        [SerializeField] private float _turnDegPerSecond = 540f;

        [Header("Touch")]
        [SerializeField] private float _joystickRadiusPx = 130f;
        [SerializeField, Range(0.3f, 0.9f)] private float _runDeflection = 0.55f;

        [Header("Stealth profile")]
        [SerializeField, Range(0f, 1f)] private float _crouchExposure = 0.45f;
        [Tooltip("Extra multiplier applied by CoverSystem when hugging a wall.")]
        [SerializeField, Range(0f, 1f)] private float _coverExposure = 0.25f;

        public bool IsCrouching { get; private set; }
        /// <summary>Set by CoverSystem when the player is attached to a cover edge.</summary>
        public bool InCover { get; set; }

        /// <summary>IStealthTarget — read by every guard's FieldOfView each scan.</summary>
        public float ExposureMultiplier
        {
            get
            {
                float e = IsCrouching ? _crouchExposure : 1f;
                if (InCover) e *= _coverExposure;
                return e;
            }
        }

        // ---------------------------------------------------------------- state
        private CharacterController _cc;
        private SoundEmitter _emitter;
        private Vector2 _stickOrigin;
        private int _stickFingerId = -1;
        private Vector2 _stick;          // -1..1

        private void Awake()
        {
            _cc = GetComponent<CharacterController>();
            _emitter = GetComponent<SoundEmitter>();
        }

        private void Update()
        {
            ReadInput();

            bool running = _stick.magnitude > _runDeflection;
            if (running && IsCrouching) IsCrouching = false;   // sprint stands you up

            float speed = IsCrouching ? _crouchSpeed : running ? _runSpeed : _walkSpeed;
            // Isometric mapping: screen up = world +Z, screen right = world +X.
            Vector3 move = new Vector3(_stick.x, 0f, _stick.y);
            if (move.sqrMagnitude > 1f) move.Normalize();

            _cc.SimpleMove(move * speed);

            if (move.sqrMagnitude > 0.001f)
            {
                transform.rotation = Quaternion.RotateTowards(transform.rotation,
                    Quaternion.LookRotation(move), _turnDegPerSecond * Time.deltaTime);

                NoiseType stance = IsCrouching ? NoiseType.FootstepCrouch
                                 : running     ? NoiseType.FootstepRun
                                               : NoiseType.FootstepWalk;
                _emitter.TickFootsteps(stance);
            }
        }

        // ------------------------------------------------------------- input
        private void ReadInput()
        {
            // --- touch: floating stick on the left, crouch-tap on the right
            for (int i = 0; i < Input.touchCount; i++)
            {
                Touch t = Input.GetTouch(i);
                bool leftHalf = t.position.x < Screen.width * 0.5f;

                if (t.phase == TouchPhase.Began)
                {
                    if (leftHalf && _stickFingerId == -1)
                    { _stickFingerId = t.fingerId; _stickOrigin = t.position; }
                    else if (!leftHalf)
                    { IsCrouching = !IsCrouching; }
                }
                else if (t.fingerId == _stickFingerId)
                {
                    if (t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled)
                    { _stickFingerId = -1; _stick = Vector2.zero; }
                    else
                    {
                        Vector2 d = (t.position - _stickOrigin) / _joystickRadiusPx;
                        _stick = Vector2.ClampMagnitude(d, 1f);
                    }
                }
            }

            // --- editor / desktop fallback
            if (Input.touchCount == 0)
            {
                _stick.x = Input.GetAxisRaw("Horizontal");
                _stick.y = Input.GetAxisRaw("Vertical");
                if (_stick.sqrMagnitude > 0.01f && !Input.GetKey(KeyCode.LeftShift))
                    _stick = Vector2.ClampMagnitude(_stick, _runDeflection - 0.05f);
                if (Input.GetKeyDown(KeyCode.C)) IsCrouching = !IsCrouching;
            }
        }
    }
}
