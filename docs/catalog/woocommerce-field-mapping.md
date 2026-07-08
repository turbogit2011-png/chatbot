# Mapowanie: Master Catalog → WooCommerce

WooCommerce = źródło prawdy dla cen, stanów, zamówień. Dane techniczne trzymamy jako **atrybuty
produktu** i **meta** w przestrzeni `_tgf_` (prefiks wtyczki), aby nie kolidować z innymi wtyczkami.

| Pole kontraktu | WooCommerce | Mechanizm |
|---|---|---|
| `internal_sku` | pole SKU produktu | natywne (docelowo `TG-…`) |
| `product_id` | ID produktu | natywne |
| `turbo_number_primary` | atrybut `pa_turbo-number` + meta `_tgf_turbo_primary` | atrybut (filtr) + meta (status) |
| `turbo_numbers_all` | meta `_tgf_turbo_all` (JSON) | meta |
| `oe_numbers` | atrybut `pa_oe` + meta `_tgf_oe` | atrybut + meta |
| `vehicle_make/model/generation` | atrybuty `pa_make`,`pa_model`,`pa_generation` | atrybuty (filtry/fasety) |
| `engine_code`,`engine_capacity`,`power_hp`,`fuel_type` | atrybuty `pa_engine-code`,`pa_engine`,`pa_power`,`pa_fuel` | atrybuty |
| `turbo_manufacturer` | atrybut `pa_turbo-manufacturer` | atrybut (**≠** kategoria marki pojazdu) |
| `condition` | meta `_tgf_condition` = `refurbished` | meta + reguła |
| `warranty_months` | meta `_tgf_warranty_months` | meta |
| `refurbishment_scope`,`test_method`,`chra_brand` | meta `_tgf_*` | meta |
| `old_turbo_return_required`,`deposit_amount`,`old_turbo_return_deadline` | meta `_tgf_core_*` | meta |
| `b2b_price`,`b2b_rules` | meta `_tgf_b2b_*` | meta (widoczne tylko dla roli `b2b_customer`) |
| `price`,`sale_price`,`stock_status`,`lead_time` | natywne WooCommerce | **nie duplikujemy** we froncie |
| `focus_keyword`,`seo_title`,`seo_description`,`canonical_url` | Rank Math meta | integracja z Rank Math |
| status pola (VERIFIED/…) | meta `_tgf_status_<pole>` | meta |

**Zasady:** (1) każdy zapis meta przez wtyczkę → wpis w audit log + backup poprzedniej wartości.
(2) `pa_turbo-manufacturer` to inny słownik niż kategorie/`pa_make`. (3) Migracja SKU wymaga
mapy 301 i osobnej, zatwierdzonej operacji changeset.
