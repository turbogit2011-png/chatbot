"""
VIN Decoder — wyciąga markę i silnik z numeru VIN.
WMI (pierwsze 3 znaki) → marka pojazdu.
Pozycja 4-8 → model/silnik (częściowe wsparcie).
"""

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
    # Mercedes
    "WDB": "Mercedes", "WDC": "Mercedes", "WDD": "Mercedes",
    "WDF": "Mercedes", "WMX": "Mercedes",
    # Skoda
    "TMB": "Skoda",
    # SEAT
    "VSS": "SEAT",
    # Porsche
    "WP0": "Porsche",
    # Opel
    "W0L": "Opel",
    # Ford DE
    "WF0": "Ford",
    # Ford US
    "1FT": "Ford", "1FA": "Ford", "2FA": "Ford",
    # Renault
    "VF1": "Renault", "VF3": "Renault", "VF4": "Renault",
    "VF6": "Renault", "VF7": "Renault",
    # Peugeot
    "VF3": "Peugeot",  # overlap handled by order
    # Citroen
    "VF7": "Citroen",
    # Toyota
    "JT1": "Toyota", "JT2": "Toyota", "JT3": "Toyota",
    "SB1": "Toyota", "SB2": "Toyota",
    # Honda
    "JHM": "Honda", "2HG": "Honda",
    # Nissan
    "JN1": "Nissan", "JN6": "Nissan",
    # Mazda
    "JM1": "Mazda", "JMZ": "Mazda",
    # Volvo
    "YV1": "Volvo", "YV4": "Volvo",
    # Fiat
    "ZFA": "Fiat", "ZFF": "Ferrari",
    # Hyundai
    "KMH": "Hyundai", "KNM": "Hyundai",
    # Kia
    "KNA": "Kia", "KNC": "Kia",
}

# Podstawowa mapa: marka → typowe turbiny
BRAND_TURBO_HINTS = {
    "BMW":        ["N47", "M47", "N57", "M57", "B47", "GT1749V", "GT2256V", "TF035"],
    "Audi":       ["BKD", "BMN", "CBAB", "GT1749V", "K03", "K04", "BorgWarner KP39"],
    "Volkswagen": ["ASZ", "BXE", "CBAB", "GT1749V", "KP39", "BV39"],
    "Mercedes":   ["OM651", "OM642", "OM646", "GT1749V", "GT2056V", "TF035HM"],
    "Skoda":      ["BXE", "ASZ", "GT1749V", "KP39"],
    "Ford":       ["HHJA", "UFBA", "GT1544V", "GT2052EL"],
    "Opel":       ["Z19DTH", "A20DTH", "GT1749V", "GT2052ELS"],
    "Toyota":     ["1CD-FTV", "2AD-FHV", "CT16V", "CT20V"],
    "Renault":    ["K9K", "M9R", "GT1544V", "GT2052EL"],
    "Peugeot":    ["DV6", "DW10", "GT1544V"],
    "Citroen":    ["DV6", "DW10", "GT1544V"],
}


def decode_vin(vin: str) -> dict:
    """
    Zwraca słownik z informacjami wyciągniętymi z VIN.
    Nie weryfikuje pełnej poprawności — to uproszczone mapowanie WMI.
    """
    vin = vin.strip().upper()
    result = {
        "vin": vin,
        "valid_format": False,
        "brand": "",
        "country": "",
        "turbo_hints": [],
        "wmi": "",
        "note": "",
    }

    if len(vin) != 17:
        result["note"] = "VIN powinien mieć dokładnie 17 znaków."
        return result

    # Basic checksum-light (US/EU VIN format)
    if not vin.isalnum():
        result["note"] = "VIN zawiera niedozwolone znaki."
        return result

    result["valid_format"] = True
    wmi = vin[:3]
    result["wmi"] = wmi

    # Country from first char
    country_map = {
        "W": "Niemcy", "V": "Francja", "T": "Czechy/Węgry",
        "J": "Japonia", "K": "Korea", "Y": "Szwecja/Finlandia",
        "Z": "Włochy", "S": "Wielka Brytania",
        "1": "USA", "2": "Kanada", "3": "Meksyk",
    }
    result["country"] = country_map.get(vin[0], "Nieznany")

    # Brand
    brand = WMI_MAP.get(wmi, "")
    if not brand:
        # Try first 2 chars
        for k, v in WMI_MAP.items():
            if vin.startswith(k[:2]):
                brand = v
                break
    result["brand"] = brand
    result["turbo_hints"] = BRAND_TURBO_HINTS.get(brand, [])

    if brand:
        result["note"] = f"Wykryto: {brand} ({result['country']})"
    else:
        result["note"] = "Nie udało się automatycznie zidentyfikować marki."

    return result


def extract_search_terms(vin_result: dict) -> str:
    """Zwraca frazę wyszukiwania dla WooCommerce na podstawie VIN."""
    brand = vin_result.get("brand", "")
    if brand:
        return f"turbosprężarka {brand}"
    return "turbosprężarka"
