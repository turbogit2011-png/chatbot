# Turbo Selector Pro

Turbo Selector Pro to produkcyjny plugin WordPress/WooCommerce do kaskadowego doboru turbosprężarek (marka → model → generacja → silnik) z własnym modelem danych i logiką dopasowań.

## Wymagania
- WordPress 6.4+
- PHP 8.0+
- WooCommerce

## Instalacja
1. Skopiuj katalog `turbo-selector-pro` do `/wp-content/plugins/`.
2. Aktywuj plugin w panelu WP.
3. Przy aktywacji tworzone są tabele `wp_tsp_*` i domyślne ustawienia.

## Struktura katalogów
- `turbo-selector-pro.php` bootstrap pluginu
- `src/Core` aktywacja, migracje, autoload, ustawienia
- `src/Database` definicja tabel i indeksów
- `src/Repositories` warstwa zapytań
- `src/Services` logika dopasowania, scoring confidence, cache
- `src/API` endpointy REST
- `src/Admin` panel administracyjny
- `src/Shortcodes` `[turbo_selector]`, `[turbo_selector_results]`
- `src/Integrations` integracja WooCommerce i canonical
- `assets` CSS/JS frontend + admin
- `templates` render selectora i wyników

## Tabele
- `wp_tsp_vehicle_makes`
- `wp_tsp_vehicle_models`
- `wp_tsp_vehicle_generations`
- `wp_tsp_vehicle_engines`
- `wp_tsp_fitments`
- `wp_tsp_search_logs`

## Admin
Menu: **Turbo Selector Pro**
- Dashboard
- Marki
- Modele
- Generacje
- Silniki
- Dopasowania
- Import / Export
- Ustawienia
- Logi wyszukiwań

## Shortcode
- `[turbo_selector]`
- `[turbo_selector_results]`

Parametry selectora:
- `mode="inline|compact|hero"`
- `show_results="true|false"`
- `theme="dark|light"`
- `hide_labels="true|false"`
- `submit_text="..."`

## REST API
- `GET /wp-json/tsp/v1/makes`
- `GET /wp-json/tsp/v1/models/{make_id}`
- `GET /wp-json/tsp/v1/generations/{model_id}`
- `GET /wp-json/tsp/v1/engines/{generation_id}`
- `POST /wp-json/tsp/v1/search`

Format odpowiedzi:
```json
{"success":true,"data":{},"message":""}
```

## CSV Import/Export (format)
Nagłówki obsługiwane przez importer:
- `entity,make,model,generation,platform_code,body_type,year_from,year_to,engine_label,displacement,fuel_type,engine_type,power_hp,power_kw,engine_code,emission_standard,has_dpf,has_start_stop,product_id,oem_number,turbo_number,fitment_notes,is_primary,is_active`

Klucz logiczny aktualizacji fitmentu:
`product_id + make + model + generation + engine_code`

## Hooki/filtry
- `tsp_selector_fields`
- `tsp_matching_products_query_args`
- `tsp_fitment_confidence`
- `tsp_results_item_data`
- `tsp_before_results`
- `tsp_after_results`

## AI Ready
Publiczna metoda:
`TurboSelectorPro\Services\FitmentService::find_matching_products(array $criteria)`

Obsługiwane kryteria:
`make, model, generation, year, engine, power, engine_code, oem_number, turbo_number`

Zwraca:
- listę produktów
- confidence
- uzasadnienie
- brakujące dane

## Rozbudowa Enterprise (roadmap)
- Pełny importer CSV z preview, walidacją kolumn i raportem błędów.
- Rozbudowany CRUD na klasach `WP_List_Table` + bulk actions.
- Gutenberg block z dynamic render callback.
- Rule engine dopasowań + integracja z TecDoc API.
- Rozszerzone testy integracyjne WP + E2E.
