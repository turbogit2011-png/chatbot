# Testowalność warstwy logiki

`FitmentService` separuje sanitizację i scoring od warstwy transportowej WP (REST/AJAX),
dzięki czemu można dodawać testy jednostkowe metod prywatnych przez refactor do Value Object.
