<?php
declare(strict_types=1);

namespace TurboGit\Forge\Changeset;

/** Wynik operacji apply/rollback: sukces z licznikiem albo odmowa z powodem. */
final class ApplyResult
{
    private function __construct(
        public readonly bool $success,
        public readonly int $count = 0,
        public readonly string $reason = ''
    ) {}

    public static function ok(int $count): self { return new self(true, $count); }
    public static function denied(string $reason): self { return new self(false, 0, $reason); }
}
