<?php
declare(strict_types=1);

namespace TurboGit\Forge\Modules;

/**
 * Szkielety pozostałych modułów. Wszystkie domyślnie WYŁĄCZONE i NON-MUTATING na tym etapie.
 * Każdy z nich zostanie rozwinięty w osobnym PR, z pełnym cyklem PREVIEW → APPROVE → APPLY → ROLLBACK
 * tam, gdzie w ogóle dokonuje zmian. Trzymane w jednym pliku dla przejrzystości szkieletu.
 */

/** Product Forge Content — generowanie/porządkowanie treści (opisy, dane techniczne). */
final class ContentModule extends AbstractModule
{
    public function key(): string { return 'content'; }
    public function title(): string { return 'Product Forge Content'; }
}

/** Product Forge SEO — tytuły, meta, focus keyword, breadcrumb schema, kanonikale (integracja Rank Math). */
final class SeoModule extends AbstractModule
{
    public function key(): string { return 'seo'; }
    public function title(): string { return 'Product Forge SEO'; }
}

/** Product Forge B2B — role warsztatów, ceny B2B, reguły, priorytet. */
final class B2BModule extends AbstractModule
{
    public function key(): string { return 'b2b'; }
    public function title(): string { return 'Product Forge B2B'; }
}

/** Product Forge VIN Requests — zgłoszenia VIN, zdjęcie tabliczki, dobór „czy pasuje?". */
final class VinRequestsModule extends AbstractModule
{
    public function key(): string { return 'vin_requests'; }
    public function title(): string { return 'Product Forge VIN Requests'; }
}

/** Product Forge Returns — zwrot starej turbiny / kaucja (core deposit) i statusy. */
final class ReturnsModule extends AbstractModule
{
    public function key(): string { return 'returns'; }
    public function title(): string { return 'Product Forge Returns'; }
}

/** Product Forge Claims — reklamacje, w tym uproszczona ścieżka dla kwalifikujących się partnerów B2B. */
final class ClaimsModule extends AbstractModule
{
    public function key(): string { return 'claims'; }
    public function title(): string { return 'Product Forge Claims'; }
}
