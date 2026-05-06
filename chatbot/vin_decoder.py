"""
VIN Decoder — pełne dekodowanie numeru VIN.

Warstwa 1: WMI lookup (marka, kraj) — działa zawsze, offline
Warstwa 2: VDS parser (rok, silnik) — offline, na podstawie znanych schematów
Warstwa 3: API zewnętrzne — pełne dane (model, pojemność, kod silnika)
           Wspierane API: NHTSA (US/darmowe), AutoDNA (EU/płatne), VINCheck.info

Konfiguracja w panelu Ustawienia → VIN API.
"""

import re
import os
import sys
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ─────────────────────────────────────────────────────────────────────────────
# WARSTWA 1 — WMI: World Manufacturer Identifier (znaki 1-3)
# Standard ISO 3779 — publicznie dostępny
# ─────────────────────────────────────────────────────────────────────────────

WMI_MAP = {
    # BMW
    "WBA": "BMW", "WBB": "BMW", "WBC": "BMW", "WBD": "BMW",
    "WBE": "BMW", "WBF": "BMW", "WBG": "BMW", "WBH": "BMW",
    "WBS": "BMW", "WBW": "BMW", "WBX": "BMW", "WBY": "BMW",
    # Audi
    "WAU": "Audi", "WA1": "Audi",
    # Volkswagen
    "WVW": "Volkswagen", "WV1": "Volkswagen", "WV2": "Volkswagen",
    "WV3": "Volkswagen", "WV6": "Volkswagen",
    # Mercedes-Benz
    "WDB": "Mercedes", "WDC": "Mercedes", "WDD": "Mercedes",
    "WDF": "Mercedes", "WMX": "Mercedes", "WME": "Mercedes",
    # Skoda
    "TMB": "Skoda",
    # SEAT
    "VSS": "SEAT", "VS6": "SEAT",
    # Porsche
    "WP0": "Porsche", "WP1": "Porsche",
    # Opel / Vauxhall
    "W0L": "Opel", "W0V": "Opel",
    # Ford (Europa)
    "WF0": "Ford", "WFO": "Ford",
    # Ford (USA/Kanada)
    "1FA": "Ford", "1FB": "Ford", "1FC": "Ford", "1FD": "Ford",
    "1FT": "Ford", "2FA": "Ford", "3FA": "Ford",
    # Renault
    "VF1": "Renault", "VF4": "Renault", "VF6": "Renault",
    # Peugeot
    "VF3": "Peugeot",
    # Citroen
    "VF7": "Citroen",
    # Fiat / Alfa / Lancia
    "ZFA": "Fiat", "ZAR": "Alfa Romeo", "ZLA": "Lancia",
    "ZFF": "Ferrari", "ZHW": "Lamborghini",
    # Toyota
    "JT1": "Toyota", "JT2": "Toyota", "JT3": "Toyota",
    "SB1": "Toyota", "SB2": "Toyota",
    # Honda
    "JHM": "Honda", "2HG": "Honda",
    # Nissan
    "JN1": "Nissan", "JN6": "Nissan", "VNK": "Nissan",
    # Mazda
    "JM1": "Mazda", "JMZ": "Mazda",
    # Mitsubishi
    "JA3": "Mitsubishi", "JA4": "Mitsubishi",
    # Subaru
    "JF1": "Subaru", "JF2": "Subaru",
    # Volvo
    "YV1": "Volvo", "YV4": "Volvo",
    # Hyundai
    "KMH": "Hyundai", "KNM": "Hyundai",
    # Kia
    "KNA": "Kia", "KNC": "Kia", "KND": "Kia",
    # Land Rover / Jaguar
    "SAL": "Land Rover", "SAJ": "Jaguar",
    # Volvo (Szwecja)
    "YV2": "Volvo",
    # Saab
    "YS3": "Saab",
    # Isuzu
    "JAA": "Isuzu",
}

COUNTRY_MAP = {
    "W": "Niemcy",   "V": "Francja",    "T": "Czechy/Węgry/Turcja",
    "J": "Japonia",  "K": "Korea Pd.",  "Y": "Szwecja/Finlandia",
    "Z": "Włochy",   "S": "Wielka Brytania", "L": "Chiny",
    "1": "USA",      "2": "Kanada",     "3": "Meksyk",
    "9": "Brazylia", "6": "Australia",  "A": "RPA",
}

# ─────────────────────────────────────────────────────────────────────────────
# WARSTWA 2 — VDS: Vehicle Descriptor Section (znaki 4-8)
# Pozycja 10 = rok modelowy (standardowy kod roku VIN)
# ─────────────────────────────────────────────────────────────────────────────

# Znak pozycji 10 → rok modelowy (standard SAE J853)
MODEL_YEAR_MAP = {
    "A": 1980, "B": 1981, "C": 1982, "D": 1983, "E": 1984,
    "F": 1985, "G": 1986, "H": 1987, "J": 1988, "K": 1989,
    "L": 1990, "M": 1991, "N": 1992, "P": 1993, "R": 1994,
    "S": 1995, "T": 1996, "V": 1997, "W": 1998, "X": 1999,
    "Y": 2000, "1": 2001, "2": 2002, "3": 2003, "4": 2004,
    "5": 2005, "6": 2006, "7": 2007, "8": 2008, "9": 2009,
    "A": 2010, "B": 2011, "C": 2012, "D": 2013, "E": 2014,
    "F": 2015, "G": 2016, "H": 2017, "J": 2018, "K": 2019,
    "L": 2020, "M": 2021, "N": 2022, "P": 2023, "R": 2024,
    "S": 2025, "T": 2026,
}

# Marka → typowe kody silników diesel i ich turbiny
BRAND_ENGINE_TURBO = {
    "BMW": {
        "engines": {
            "N47": {"displacement": "2.0d", "turbos": ["GT1749V", "BorgWarner B03"], "power": "143-177KM"},
            "M47": {"displacement": "2.0d", "turbos": ["GT1749V"], "power": "136-150KM"},
            "N57": {"displacement": "3.0d", "turbos": ["GT2260V", "GT2256VK"], "power": "245-313KM"},
            "M57": {"displacement": "3.0d", "turbos": ["GT2260V"], "power": "218-286KM"},
            "B47": {"displacement": "2.0d", "turbos": ["BorgWarner B03", "GT1646V"], "power": "150-231KM"},
            "B57": {"displacement": "3.0d", "turbos": ["GT2260VK", "TF035"], "power": "249-395KM"},
        },
        "turbo_hints": ["GT1749V", "GT2260V", "N47 turbo", "M57 turbo"]
    },
    "Audi": {
        "engines": {
            "BKD": {"displacement": "2.0 TDI", "turbos": ["GT1749V"], "power": "140KM"},
            "BMN": {"displacement": "2.0 TDI", "turbos": ["BorgWarner BV43"], "power": "170KM"},
            "CBAB": {"displacement": "2.0 TDI", "turbos": ["BorgWarner KP39"], "power": "140KM"},
            "CDUC": {"displacement": "3.0 TDI", "turbos": ["BorgWarner K04"], "power": "204KM"},
            "CRCA": {"displacement": "3.0 TDI Biturbo", "turbos": ["BorgWarner K04 x2"], "power": "245KM"},
        },
        "turbo_hints": ["GT1749V", "KP39", "K03", "K04", "BorgWarner"]
    },
    "Volkswagen": {
        "engines": {
            "ASZ": {"displacement": "1.9 TDI", "turbos": ["GT1749V"], "power": "130KM"},
            "BXE": {"displacement": "1.9 TDI", "turbos": ["GT1749V"], "power": "105KM"},
            "CBAB": {"displacement": "2.0 TDI", "turbos": ["BorgWarner KP39"], "power": "140KM"},
            "CLJA": {"displacement": "2.0 TDI", "turbos": ["BorgWarner BV43"], "power": "184KM"},
        },
        "turbo_hints": ["GT1749V", "KP39", "BV39", "BV43"]
    },
    "Mercedes": {
        "engines": {
            "OM611": {"displacement": "2.2 CDI", "turbos": ["GT1749V"], "power": "143KM"},
            "OM646": {"displacement": "2.2 CDI", "turbos": ["GT1749V"], "power": "136-170KM"},
            "OM651": {"displacement": "2.2 CDI", "turbos": ["GT1752S", "BorgWarner KP35"], "power": "136-204KM"},
            "OM642": {"displacement": "3.0 CDI", "turbos": ["GT2256V"], "power": "190-265KM"},
        },
        "turbo_hints": ["GT1749V", "GT2256V", "TF035HM"]
    },
    "Ford": {
        "engines": {
            "HHJA": {"displacement": "1.6 TDCi", "turbos": ["GT1544V"], "power": "90-115KM"},
            "UFBA": {"displacement": "2.0 TDCi", "turbos": ["GT2052EL"], "power": "136KM"},
            "G6DA": {"displacement": "2.2 TDCi", "turbos": ["GT2052EL"], "power": "155KM"},
        },
        "turbo_hints": ["GT1544V", "GT2052EL"]
    },
    "Opel": {
        "engines": {
            "Z17DTH": {"displacement": "1.7 CDTI", "turbos": ["GT1544V"], "power": "100KM"},
            "Z19DTH": {"displacement": "1.9 CDTI", "turbos": ["GT1749MV"], "power": "120KM"},
            "A20DTH": {"displacement": "2.0 CDTI", "turbos": ["GT2052ELS"], "power": "130-160KM"},
        },
        "turbo_hints": ["GT1749V", "GT2052ELS", "BorgWarner BV43"]
    },
    "Toyota": {
        "engines": {
            "1CD-FTV": {"displacement": "2.0 D-4D", "turbos": ["CT16V"], "power": "116KM"},
            "2AD-FHV": {"displacement": "2.2 D-4D", "turbos": ["CT20V"], "power": "150-177KM"},
            "1KD-FTV": {"displacement": "3.0 D-4D", "turbos": ["CT26"], "power": "163KM"},
        },
        "turbo_hints": ["CT16V", "CT20V", "CT26"]
    },
    "Renault": {
        "engines": {
            "K9K": {"displacement": "1.5 dCi", "turbos": ["GT1544V"], "power": "68-110KM"},
            "M9R": {"displacement": "2.0 dCi", "turbos": ["GT2052EL"], "power": "150-173KM"},
        },
        "turbo_hints": ["GT1544V", "GT2052EL"]
    },
    "Peugeot": {
        "engines": {
            "DV6": {"displacement": "1.6 HDi", "turbos": ["GT1544V"], "power": "90-115KM"},
            "DW10": {"displacement": "2.0 HDi", "turbos": ["GT2052EL"], "power": "107-136KM"},
        },
        "turbo_hints": ["GT1544V", "GT2052EL"]
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# WARSTWA 3 — Zewnętrzne API
# ─────────────────────────────────────────────────────────────────────────────

def _api_nhtsa(vin: str) -> dict | None:
    """
    NHTSA VIN API — darmowe, ale tylko samochody US/certyfikowane.
    https://vpic.nhtsa.dot.gov/api/
    """
    try:
        url = f"https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/{vin}?format=json"
        r = requests.get(url, timeout=8)
        if r.status_code != 200:
            return None
        data = r.json().get("Results", [])
        result = {}
        for item in data:
            key = item.get("Variable", "")
            val = item.get("Value", "") or ""
            if "Make" in key:
                result["brand"] = val
            elif "Model" == key:
                result["model"] = val
            elif "Model Year" in key:
                result["year"] = val
            elif "Engine" in key and val:
                result.setdefault("engine_info", []).append(f"{key}: {val}")
            elif "Displacement" in key and val:
                result["displacement"] = val
        return result if result.get("brand") else None
    except Exception:
        return None


def _api_autodna(vin: str, api_key: str) -> dict | None:
    """
    AutoDNA API — polska firma, baza europejska.
    Rejestracja: https://www.autodna.com/api
    Darmowe konto: 100 zapytań/miesiąc.
    """
    try:
        url = "https://api.autodna.com/v1/vin"
        r = requests.get(url, params={"vin": vin, "apikey": api_key}, timeout=10)
        if r.status_code != 200:
            return None
        data = r.json()
        basic = data.get("vehicle_info", {})
        return {
            "brand": basic.get("make", ""),
            "model": basic.get("model", ""),
            "year": basic.get("year", ""),
            "engine_code": basic.get("engine_code", ""),
            "displacement": basic.get("engine_capacity", ""),
            "fuel": basic.get("fuel_type", ""),
            "power_kw": basic.get("power_kw", ""),
            "transmission": basic.get("transmission", ""),
            "body": basic.get("body_type", ""),
            "color": basic.get("color", ""),
            "source": "AutoDNA",
        }
    except Exception:
        return None


def _api_carmd(vin: str, api_key: str) -> dict | None:
    """
    CarMD API — opcjonalnie, głównie rynek US.
    """
    try:
        url = f"https://api.carmd.com/v3.0/decode?vin={vin}"
        r = requests.get(url, headers={
            "Authorization": f"Basic {api_key}",
            "partner-token": api_key
        }, timeout=10)
        if r.status_code != 200:
            return None
        data = r.json().get("data", {})
        return {
            "brand": data.get("make", ""),
            "model": data.get("model", ""),
            "year": data.get("year", ""),
            "engine": data.get("engine", ""),
            "source": "CarMD",
        }
    except Exception:
        return None

# ─────────────────────────────────────────────────────────────────────────────
# GŁÓWNA FUNKCJA DEKODOWANIA
# ─────────────────────────────────────────────────────────────────────────────

def decode_vin(vin: str, api_key: str = "", api_provider: str = "autodna") -> dict:
    """
    Pełne dekodowanie VIN — kaskadowe warstwy:
    1. WMI lookup (zawsze offline)
    2. Model year z pozycji 10
    3. API zewnętrzne (jeśli podano klucz)

    Args:
        vin: 17-znakowy numer VIN
        api_key: klucz do API zewnętrznego (opcjonalny)
        api_provider: "autodna" | "nhtsa" | "carmd"

    Returns:
        dict z pełnymi danymi pojazdu i sugestiami turbosprężarek
    """
    vin = vin.strip().upper().replace(" ", "").replace("-", "")

    result = {
        "vin": vin,
        "valid_format": False,
        "source": "WMI offline",
        "brand": "",
        "model": "",
        "year": "",
        "engine_code": "",
        "displacement": "",
        "fuel": "",
        "power": "",
        "country": "",
        "wmi": "",
        "turbo_suggestions": [],
        "engine_details": {},
        "note": "",
        "api_data": None,
    }

    # ── Walidacja ────────────────────────────────────────────────────────────
    if len(vin) != 17:
        result["note"] = f"Nieprawidłowa długość VIN: {len(vin)} znaków (wymagane 17)."
        return result

    forbidden = set("IOQ")  # VIN nie zawiera liter I, O, Q
    if any(c in forbidden for c in vin):
        result["note"] = "VIN zawiera niedozwolone litery (I, O lub Q)."
        return result

    if not re.match(r'^[A-HJ-NPR-Z0-9]{17}$', vin):
        result["note"] = "VIN zawiera niedozwolone znaki."
        return result

    result["valid_format"] = True

    # ── Warstwa 1: WMI (znaki 1-3) ───────────────────────────────────────────
    wmi = vin[:3]
    result["wmi"] = wmi
    result["country"] = COUNTRY_MAP.get(vin[0], "Nieznany")

    brand = WMI_MAP.get(wmi, "")
    if not brand:
        # Fallback: próbuj pierwsze 2 znaki
        for k, v in WMI_MAP.items():
            if wmi.startswith(k[:2]):
                brand = v
                break
    result["brand"] = brand

    # ── Warstwa 2: Model year (znak 10) ──────────────────────────────────────
    year_char = vin[9]  # pozycja 10 (indeks 9)
    year = MODEL_YEAR_MAP.get(year_char, "")
    result["year"] = str(year) if year else ""

    # ── Sugestie silników i turbo (offline, wg marki) ────────────────────────
    if brand in BRAND_ENGINE_TURBO:
        result["turbo_suggestions"] = BRAND_ENGINE_TURBO[brand]["turbo_hints"]
        result["engine_details"] = BRAND_ENGINE_TURBO[brand]["engines"]

    # ── Warstwa 3: API zewnętrzne ─────────────────────────────────────────────
    if api_key:
        api_result = None
        if api_provider == "autodna":
            api_result = _api_autodna(vin, api_key)
        elif api_provider == "nhtsa":
            api_result = _api_nhtsa(vin)
        elif api_provider == "carmd":
            api_result = _api_carmd(vin, api_key)

        if api_result:
            result["api_data"] = api_result
            result["source"] = api_result.get("source", api_provider)
            # Nadpisz danymi z API (dokładniejsze)
            for field in ["brand", "model", "year", "engine_code",
                          "displacement", "fuel", "power_kw"]:
                if api_result.get(field):
                    result[field] = api_result[field]

            # Dopasuj sugestie turbo na podstawie kodu silnika z API
            engine_code = api_result.get("engine_code", "")
            if engine_code and brand in BRAND_ENGINE_TURBO:
                engines = BRAND_ENGINE_TURBO[brand]["engines"]
                if engine_code in engines:
                    engine_info = engines[engine_code]
                    result["turbo_suggestions"] = engine_info["turbos"]
                    result["displacement"] = result["displacement"] or engine_info["displacement"]
                    result["power"] = engine_info["power"]
                    result["note"] = (
                        f"Kod silnika {engine_code} → "
                        f"{engine_info['displacement']} {engine_info['power']} | "
                        f"Typowe turbiny: {', '.join(engine_info['turbos'])}"
                    )

    # ── Czytelna notatka finalna ──────────────────────────────────────────────
    if not result["note"]:
        parts = [p for p in [brand, result["model"], result["year"], result["displacement"]] if p]
        if parts:
            result["note"] = " ".join(parts)
            if result["turbo_suggestions"]:
                result["note"] += f" | Turbiny: {', '.join(result['turbo_suggestions'][:3])}"
        elif not brand:
            result["note"] = "Nie rozpoznano marki z WMI. Podaj klucz API dla pełnego dekodowania."

    return result


def extract_search_terms(vin_result: dict) -> str:
    """Buduje optymalną frazę wyszukiwania dla WooCommerce na podstawie wyniku VIN."""
    brand = vin_result.get("brand", "")
    model = vin_result.get("model", "")
    displacement = vin_result.get("displacement", "")
    engine_code = vin_result.get("engine_code", "")

    parts = ["turbosprężarka"]
    if brand:
        parts.append(brand)
    if model:
        parts.append(model)
    if displacement:
        parts.append(displacement)
    if engine_code:
        parts.append(engine_code)

    return " ".join(parts) if len(parts) > 1 else "turbosprężarka"


def format_for_chat(vin_result: dict) -> str:
    """Formatuje wynik VIN do wiadomości chatbota (Markdown)."""
    if not vin_result.get("valid_format"):
        return f"Nieprawidłowy VIN: {vin_result.get('note', 'sprawdź numer')}"

    brand = vin_result.get("brand", "?")
    model = vin_result.get("model", "")
    year = vin_result.get("year", "")
    displacement = vin_result.get("displacement", "")
    engine_code = vin_result.get("engine_code", "")
    country = vin_result.get("country", "")
    turbos = vin_result.get("turbo_suggestions", [])
    source = vin_result.get("source", "WMI")

    lines = [f"**Wynik dekodowania VIN** *(źródło: {source})*\n"]
    lines.append(f"🚗 **Pojazd:** {brand} {model}".strip())
    if year:
        lines.append(f"📅 **Rok:** {year}")
    if country:
        lines.append(f"🏭 **Kraj produkcji:** {country}")
    if displacement:
        lines.append(f"⚙️ **Silnik:** {displacement}")
    if engine_code:
        lines.append(f"🔑 **Kod silnika:** `{engine_code}`")

    if turbos:
        lines.append(f"\n🔧 **Pasujące turbiny:** {', '.join(turbos[:4])}")
        lines.append("\nSzukam w sklepie pasujących turbosprężarek...")
    else:
        lines.append("\nPodaj model i silnik — dopasuje właściwą turbosprężarkę.")

    return "\n".join(lines)
