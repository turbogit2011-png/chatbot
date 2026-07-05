<?php
declare(strict_types=1);

namespace TurboGit\Forge\Modules;

/**
 * Bazowy moduł Forge. Każdy moduł:
 *  - jest domyślnie WYŁĄCZONY,
 *  - deklaruje, czy potrafi cokolwiek zmieniać (mutating) — domyślnie NIE,
 *  - nigdy nie tworzy produktów (twarda blokada w silniku zmian).
 */
abstract class AbstractModule
{
    abstract public function key(): string;
    abstract public function title(): string;

    /** Czy moduł w ogóle wykonuje zmiany na produkcji (poza PREVIEW/raportem). */
    public function isMutating(): bool
    {
        return false;
    }

    public function isEnabled(): bool
    {
        $enabled = (array) get_option('tgf_modules_enabled', []);
        return in_array($this->key(), $enabled, true);
    }

    /** Wywoływane tylko dla modułów jawnie włączonych. */
    public function boot(): void {}
}
