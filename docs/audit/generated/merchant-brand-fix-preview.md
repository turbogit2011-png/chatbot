# Google Merchant — poprawka marki + gotowosc feedu (PREVIEW)

Zrodlo: `packages/catalog/data/products.normalized.json` (109 produktow). **PREVIEW — zero zapisu.** APPLY tylko przez wtyczke (changeset + zgoda + rollback).

## Poprawka `google_brand` (glowny problem Merchant)

- Zmian do naniesienia: **109** (kazdy produkt dostaje jawny `google_brand`).
- `VERIFIED` (producent turbiny znany): **99**
- `NEEDS_REVIEW` (brak producenta → proponowany 'Turbo-Git', do potwierdzenia): **10**

Przyklady:
| ID | before (marka pojazdu) | after (google_brand) | pewnosc |
|---|---|---|---|
| 29104 | Audi, Seat, Volkswagen | Garrett | VERIFIED |
| 29341 | Ford | Garrett | VERIFIED |
| 29344 | Audi | Garrett | VERIFIED |
| 29350 | Volkswagen | Garrett | VERIFIED |
| 29354 | Ford | Garrett | VERIFIED |
| 29361 | Ford | Garrett | VERIFIED |
| 29445 | BMW | Mitsubishi OE | VERIFIED |
| 29450 | BMW | Mitsubishi OE | VERIFIED |
| 29455 | BMW | Mitsubishi OE | VERIFIED |
| 29460 | BMW | Mitsubishi OE | VERIFIED |
| 29466 | Audi, Seat, Skoda | KKK | VERIFIED |
| 29472 | Audi, Seat, Skoda | KKK | VERIFIED |

## Gotowosc feedu do kampanii
- **READY: 93/109** · **BLOCKED: 16/109**

### Zablokowane (brak pola krytycznego) — pierwsze 15
| ID | SKU | Nazwa | Powod |
|---|---|---|---|
| 29104 |  | Turbosprężarka regenerowana Garrett GTC1549MVZ 2.0 | brak kondycji (Stan) |
| 29341 |  | Turbosprężarka GARRETT 850840 do Ford Transit 2.0  | brak numeru turbo/OE; brak kondycji (Stan) |
| 29344 | GAR-874595 | Turbosprężarka GARRETT 874595 - Audi A4 B9 / A5 F5 | brak kondycji (Stan) |
| 29350 |  | Regenerowane turbo Garrett 04L253022B VW T6 / Craf | brak kondycji (Stan) |
| 29354 |  | Turbosprężarka Garrett 838452 Ford Transit 2.0 TDC | brak numeru turbo/OE; brak kondycji (Stan) |
| 29361 |  | Turbosprężarka Garrett 852072 Ford 2.0 TDCi EcoBlu | brak numeru turbo/OE; brak kondycji (Stan) |
| 30172 |  | Regenerowana turbosprężarka Hyundai KIA 2.0 CRDi 1 | brak numeru turbo/OE; brak kondycji (Stan); brak producenta turbiny (brand=NEEDS_REVIEW) |
| 30173 |  | Regenerowana turbosprężarka Audi VW Skoda 1.9 TDI  | brak numeru turbo/OE; brak kondycji (Stan); brak producenta turbiny (brand=NEEDS_REVIEW) |
| 30174 |  | Regenerowana turbosprężarka Citroen Peugeot 2.7 HD | brak numeru turbo/OE; brak kondycji (Stan); brak producenta turbiny (brand=NEEDS_REVIEW) |
| 30175 |  | Regenerowana turbosprężarka Mercedes 3.0 CDI V6 OM | brak numeru turbo/OE; brak kondycji (Stan); brak producenta turbiny (brand=NEEDS_REVIEW) |
| 30176 |  | Regenerowana turbosprężarka Volvo 2.4 D D5244T5 18 | brak numeru turbo/OE; brak kondycji (Stan); brak producenta turbiny (brand=NEEDS_REVIEW) |
| 30177 |  | Regenerowana turbosprężarka Bi-Turbo Ford Mondeo S | brak numeru turbo/OE; brak kondycji (Stan); brak producenta turbiny (brand=NEEDS_REVIEW) |
| 30178 |  | Regenerowana turbosprężarka Bi-Turbo Renault Maste | brak numeru turbo/OE; brak kondycji (Stan); brak producenta turbiny (brand=NEEDS_REVIEW) |
| 30180 |  | Regenerowana turbosprężarka VW Audi Skoda Seat 1.9 | brak numeru turbo/OE; brak kondycji (Stan); brak producenta turbiny (brand=NEEDS_REVIEW) |
| 30181 |  | Regenerowana turbosprężarka Hyundai H-1 Starex iLo | brak numeru turbo/OE; brak kondycji (Stan); brak producenta turbiny (brand=NEEDS_REVIEW) |

> Zasada: produkt BLOCKED nie idzie do kampanii do czasu uzupelnienia (nie zgadujemy).
