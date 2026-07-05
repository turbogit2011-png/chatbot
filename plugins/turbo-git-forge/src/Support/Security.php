<?php
declare(strict_types=1);

namespace TurboGit\Forge\Support;

/**
 * Bramki bezpieczeństwa: capability checks + nonces. Używane przez KAŻDĄ operację, która cokolwiek zmienia.
 */
final class Security
{
    /** Uprawnienie wymagane do jakichkolwiek operacji Forge. */
    public const CAP = 'manage_woocommerce';

    /** Dodatkowe, wyższe uprawnienie do faktycznego APPLY na produkcji. */
    public const CAP_APPLY = 'manage_options';

    public static function canManage(): bool
    {
        return current_user_can(self::CAP);
    }

    public static function canApply(): bool
    {
        return current_user_can(self::CAP_APPLY);
    }

    public static function assertManage(): void
    {
        if (!self::canManage()) {
            wp_die(esc_html__('Brak uprawnień do Turbo-Git Forge.', 'turbo-git-forge'), 403);
        }
    }

    public static function nonceField(string $action): string
    {
        return wp_nonce_field('tgf_' . $action, 'tgf_nonce', true, false);
    }

    public static function verify(string $action): void
    {
        self::assertManage();
        $nonce = isset($_REQUEST['tgf_nonce']) ? sanitize_text_field((string) wp_unslash($_REQUEST['tgf_nonce'])) : '';
        if (!wp_verify_nonce($nonce, 'tgf_' . $action)) {
            wp_die(esc_html__('Nieprawidłowy token bezpieczeństwa (nonce).', 'turbo-git-forge'), 403);
        }
    }
}
