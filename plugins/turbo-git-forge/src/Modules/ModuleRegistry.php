<?php
declare(strict_types=1);

namespace TurboGit\Forge\Modules;

// Klasy szkieletowe zdefiniowane zbiorczo — zapewniamy ich załadowanie także przy prostym autoloaderze.
require_once __DIR__ . '/StubModules.php';

/**
 * Rejestr modułów. Jedna platforma — brak klas Batch_01/02/03.
 * Wszystkie moduły domyślnie wyłączone; włączenie = jawna opcja + capability + potwierdzenie zakresu.
 */
final class ModuleRegistry
{
    /** @var array<string,AbstractModule> */
    private array $modules = [];

    public function registerDefaults(): void
    {
        foreach ([
            new CatalogModule(),   // Product Forge Catalog (na razie tylko PREVIEW/raport)
            new ContentModule(),   // Product Forge Content
            new SeoModule(),       // Product Forge SEO
            new B2BModule(),       // Product Forge B2B
            new VinRequestsModule(), // Product Forge VIN Requests
            new ReturnsModule(),   // Product Forge Returns (zwrot starej turbiny / kaucja)
            new ClaimsModule(),    // Product Forge Claims (reklamacje)
        ] as $m) {
            $this->modules[$m->key()] = $m;
        }
    }

    public function bootEnabled(): void
    {
        foreach ($this->modules as $m) {
            if ($m->isEnabled()) {
                $m->boot();
            }
        }
    }

    /** @return array<string,AbstractModule> */
    public function all(): array
    {
        return $this->modules;
    }
}
