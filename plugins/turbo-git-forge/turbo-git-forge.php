<?php
/**
 * Plugin Name:       Turbo-Git Forge
 * Description:        Bezpieczna platforma zarządzania katalogiem, SEO, B2B i danymi produktowymi Turbo-Git. Safety-first: brak zmian bez PREVIEW → CHANGESET → APPROVE → APPLY → VERIFY → ROLLBACK.
 * Version:           0.1.0
 * Requires PHP:      8.1
 * Requires at least: 6.4
 * Author:            Turbo-Git Forge
 * Text Domain:       turbo-git-forge
 *
 * BEZWZGLĘDNE ZASADY (egzekwowane w kodzie):
 *  - Nigdy nie tworzy produktów (blokada w każdym module).
 *  - Nigdy nie wykonuje zmian bez zatwierdzonego changesetu + jawnej zgody + backupu + możliwości rollbacku.
 *  - Wszystkie moduły domyślnie WYŁĄCZONE.
 *  - Żadnych klas TG_Catalog_Batch_01/02/03 — jedna profesjonalna platforma, namespace TurboGit\Forge.
 *  - Sekrety nigdy nie są w tej wtyczce — trafiają do env po stronie serwera/BFF.
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit; // brak bezpośredniego dostępu
}

define('TGF_VERSION', '0.1.0');
define('TGF_FILE', __FILE__);
define('TGF_DIR', plugin_dir_path(__FILE__));
define('TGF_URL', plugin_dir_url(__FILE__));

// Autoloader PSR-4 (Composer jeśli dostępny, w przeciwnym razie prosty fallback).
$tgf_autoload = TGF_DIR . 'vendor/autoload.php';
if (file_exists($tgf_autoload)) {
    require $tgf_autoload;
} else {
    spl_autoload_register(static function (string $class): void {
        $prefix = 'TurboGit\\Forge\\';
        if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
            return;
        }
        $rel  = substr($class, strlen($prefix));
        $path = TGF_DIR . 'src/' . str_replace('\\', '/', $rel) . '.php';
        if (is_readable($path)) {
            require $path;
        }
    });
}

register_activation_hook(__FILE__, static function (): void {
    // Bez migracji destrukcyjnych. Tylko utworzenie tabeli audit logu i domyślnych opcji (moduły OFF).
    \TurboGit\Forge\Support\AuditLog::install();
    add_option('tgf_modules_enabled', []); // wszystkie moduły domyślnie wyłączone
});

add_action('plugins_loaded', static function (): void {
    \TurboGit\Forge\Plugin::instance()->boot();
});
