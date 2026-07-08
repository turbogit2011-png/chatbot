<?php
declare(strict_types=1);

namespace TurboGit\Forge;

use TurboGit\Forge\Admin\AdminPage;
use TurboGit\Forge\Modules\ModuleRegistry;

/**
 * Rdzeń platformy. Rejestruje moduły (domyślnie wyłączone) i panel kontrolny.
 * Nie wykonuje żadnych operacji zapisu przy starcie.
 */
final class Plugin
{
    private static ?self $instance = null;
    private ModuleRegistry $modules;

    public static function instance(): self
    {
        return self::$instance ??= new self();
    }

    private function __construct()
    {
        $this->modules = new ModuleRegistry();
    }

    public function boot(): void
    {
        // Rejestracja modułów. Każdy jest domyślnie OFF; włączenie wymaga jawnej opcji + capability.
        $this->modules->registerDefaults();

        if (is_admin()) {
            (new AdminPage($this->modules))->register();
        }

        // Uruchamiamy tylko moduły jawnie włączone przez administratora.
        $this->modules->bootEnabled();
    }

    public function modules(): ModuleRegistry
    {
        return $this->modules;
    }
}
