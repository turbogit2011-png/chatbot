# Turbo-Git Forge (wtyczka WordPress)

Jedna, profesjonalna wtyczka. Namespace `TurboGit\Forge`. **Safety-first.**

## Gwarancje bezpieczeństwa (egzekwowane w kodzie)
- **Brak tworzenia produktów** — silnik zmian operuje wyłącznie na istniejących `product_id`.
- **Brak zmian bez cyklu** `PREVIEW → EXPORT CHANGESET → APPROVE → APPLY → VERIFY → ROLLBACK`.
- **Backup przed zmianą** — changeset zapisuje wartości `before` każdego pola → rollback możliwy zawsze.
- **APPLY** tylko dla changesetu `APPROVED` + `manage_options` + jawna zgoda; zmiany masowe (>10) wymagają
  osobnego potwierdzenia bulk.
- **Capability checks + nonces** przy każdej operacji (`Support/Security`).
- **Audit log** append-only (`{prefix}tgf_audit_log`) — kto, kiedy, co, jaki changeset.
- **Wszystkie moduły domyślnie WYŁĄCZONE.**
- **Sekrety nigdy nie w tej wtyczce** — trafiają do env po stronie serwera/BFF.

## Moduły (domyślnie OFF)
`catalog` (na razie tylko raport jakości, read-only), `content`, `seo`, `b2b`, `vin_requests`,
`returns` (zwrot starej turbiny / kaucja), `claims` (reklamacje).

## Struktura
```
turbo-git-forge.php         # nagłówek, guard, autoloader, aktywacja (tylko audit log + moduły OFF)
composer.json               # PSR-4 TurboGit\Forge\ -> src/
src/Plugin.php              # bootstrap
src/Support/Security.php    # caps + nonces
src/Support/AuditLog.php    # dziennik audytu
src/Changeset/*             # ChangesetEngine, Changeset, ApplyResult
src/Modules/*               # ModuleRegistry, AbstractModule, CatalogModule, StubModules
src/Admin/AdminPage.php     # panel kontrolny (read-only)
```

## Status
**NOT READY FOR PRODUCTION** — to szkielet architektury bezpieczeństwa. Moduły mutujące dane powstają
w kolejnych PR-ach, każdy z pełnym cyklem changeset i testami. Instalacja tej wersji nie zmienia żadnych
danych produktów (tworzy jedynie tabelę audit logu i opcję z pustą listą włączonych modułów).
