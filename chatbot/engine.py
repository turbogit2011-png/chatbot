"""
TurboChat Engine — AI Sales Agent dla sklepu turbosprężarek.
Używa Claude z tool use do wyszukiwania produktów i dekodowania VIN.
"""
import json
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import anthropic
from config import Config
from database import get_config

# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM PROMPT
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Jesteś TurboDoradcą — ekspertem AI sklepu z turbosprężarkami.
Twoje imię to "Turbo AI". Pracujesz dla sklepu {store_name}.

TWOJA ROLA:
- Pomagasz klientom znaleźć właściwą turbosprężarkę do ich auta
- Odpowiadasz na pytania techniczne o turbinach (objawy awarii, montaż, regeneracja)
- Doradzasz i finalizujesz sprzedaż — każda odpowiedź powinna prowadzić do zakupu

ZASADY:
- Zawsze pytaj o markę, model i silnik auta (lub numer OEM turbo), jeśli klient tego nie podał
- Zawsze używaj narzędzi (tools) do wyszukiwania produktów — NIGDY nie wymyślaj produktów
- Jeśli klient poda VIN — użyj narzędzia decode_vin
- Każda odpowiedź z produktami powinna kończyć się zachętą do zakupu lub kontaktu
- Pisz po polsku; jeśli klient pisze po angielsku/niemiecku — odpowiedz w jego języku
- Bądź konkretny, krótki, pomocny i sprzedażowy (nie akademicki)
- Jeśli nie znasz odpowiedzi — zaproponuj kontakt z działem technicznym

TECHNICZNE:
- Turbosprężarki nowe — gwarancja 24 miesiące
- Turbosprężarki regenerowane — gwarancja 12 miesięcy
- Dostawa: 24h Polska, 3-5 dni Europa
- Zwroty: 30 dni bez podania przyczyny
- Kompatybilność możemy sprawdzić po numerze VIN — bezpłatnie

OBJAWY AWARII TURBO (wiedza techniczna):
- Czarny dym z rury wydechowej + brak mocy = uszkodzone łopatki lub pierścienie
- Niebieski dym (olej) = uszkodzone uszczelnienia wału
- Świst / gwizdanie = uszkodzone łożyska lub nieszczelność intercoolera
- Zwiększone zużycie oleju bez dymu = nieszczelność turbo
- Turbo "siada" na wyższych obrotach = zapchany aktuator VGT

FORMAT ODPOWIEDZI Z PRODUKTAMI:
Gdy zwracasz produkty z narzędzia — podaj krótkie podsumowanie i zachęć do zakupu.
Nie przepisuj całej odpowiedzi narzędzia — wybierz 2-3 najlepsze produkty.

Sklep: {store_name} | URL: {store_url}"""

# ─────────────────────────────────────────────────────────────────────────────
# TOOL DEFINITIONS
# ─────────────────────────────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "search_turbo",
        "description": "Wyszukuje turbosprężarki w sklepie pasujące do zapytania klienta. Używaj gdy klient podał markę/model/silnik/numer OEM.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Fraza wyszukiwania np. 'turbosprężarka BMW 320d' lub 'GT1749V'"
                },
                "brand": {"type": "string", "description": "Marka auta (BMW, Audi, VW itd.)"},
                "model": {"type": "string", "description": "Model auta (320d, A4 2.0 TDI itd.)"},
                "oem": {"type": "string", "description": "Numer OEM lub numer katalogowy turbo"}
            },
            "required": ["query"]
        }
    },
    {
        "name": "decode_vin",
        "description": "Dekoduje numer VIN pojazdu i określa markę auta, kraj produkcji oraz sugerowane turbosprężarki.",
        "input_schema": {
            "type": "object",
            "properties": {
                "vin": {
                    "type": "string",
                    "description": "17-znakowy numer VIN pojazdu"
                }
            },
            "required": ["vin"]
        }
    },
    {
        "name": "get_product_details",
        "description": "Pobiera szczegółowe informacje o konkretnym produkcie po jego ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_id": {
                    "type": "integer",
                    "description": "ID produktu w WooCommerce"
                }
            },
            "required": ["product_id"]
        }
    },
    {
        "name": "check_symptoms",
        "description": "Diagnozuje objawy awarii turbosprężarki i sugeruje następne kroki (naprawa, wymiana).",
        "input_schema": {
            "type": "object",
            "properties": {
                "symptoms": {
                    "type": "string",
                    "description": "Opis objawów awarii turbo podany przez klienta"
                },
                "car": {
                    "type": "string",
                    "description": "Marka i model auta (opcjonalnie)"
                }
            },
            "required": ["symptoms"]
        }
    }
]

# ─────────────────────────────────────────────────────────────────────────────
# TOOL EXECUTORS
# ─────────────────────────────────────────────────────────────────────────────

def _exec_search_turbo(inputs: dict) -> dict:
    from chatbot.product_finder import search_products, search_by_oem
    query = inputs.get("query", "")
    oem = inputs.get("oem", "")
    brand = inputs.get("brand", "")
    model = inputs.get("model", "")

    if oem:
        products = search_by_oem(oem)
    else:
        full_query = " ".join(filter(None, [query, brand, model]))
        products = search_products(full_query, limit=4)

    return {
        "found": len(products),
        "products": products,
        "search_query": query
    }


def _exec_decode_vin(inputs: dict) -> dict:
    from chatbot.vin_decoder import decode_vin, extract_search_terms
    vin = inputs.get("vin", "")
    result = decode_vin(vin)
    if result.get("brand"):
        from chatbot.product_finder import search_by_brand_model
        products = search_by_brand_model(result["brand"], limit=3)
        result["suggested_products"] = products
    return result


def _exec_get_product_details(inputs: dict) -> dict:
    from chatbot.product_finder import get_product_card
    pid = inputs.get("product_id")
    card = get_product_card(pid)
    if card:
        return card
    return {"error": "Produkt nie znaleziony"}


def _exec_check_symptoms(inputs: dict) -> dict:
    symptoms = inputs.get("symptoms", "").lower()
    car = inputs.get("car", "")

    diagnosis = []
    severity = "unknown"
    action = "Kontakt z serwisem"

    if any(w in symptoms for w in ["czarny dym", "czarne spaliny", "dymienie"]):
        diagnosis.append("Czarny dym — możliwe uszkodzenie łopatek turbo lub pierścieni uszczelniających. Turbina wymaga wymiany lub regeneracji.")
        severity = "critical"
        action = "Wymiana turbosprężarki"

    if any(w in symptoms for w in ["niebieski dym", "olej", "pali olej", "zużycie oleju"]):
        diagnosis.append("Niebieski dym / zużycie oleju — uszkodzone uszczelnienia wału turbiny. Konieczna wymiana lub regeneracja CHRA.")
        severity = "high"
        action = "Wymiana CHRA lub pełna turbosprężarka"

    if any(w in symptoms for w in ["świst", "gwizd", "piszczenie", "hałas"]):
        diagnosis.append("Świst/gwizd — najczęściej uszkodzone łożyska wału lub nieszczelność intercoolera. Sprawdź węże intercoolera przed wymianą turbo.")
        severity = "high"
        action = "Diagnostyka + ewentualna wymiana turbo"

    if any(w in symptoms for w in ["brak mocy", "słabo ciągnie", "nie ciągnie", "turbo nie działa"]):
        diagnosis.append("Brak mocy — możliwe: zapchany filtr powietrza, uszkodzony aktuator VGT, lub awaria turbiny. Sprawdź kody błędów OBD.")
        severity = "medium"
        action = "Diagnostyka OBD + sprawdzenie aktuatora"

    if any(w in symptoms for w in ["turbo na impulsach", "wchodzi", "nie wchodzi", "opóźnienie"]):
        diagnosis.append("Przerywana praca turbo — możliwe: zapchany filtr oleju, zatkany aktuator VGT lub problem z sterownikiem. Wymień olej i filtr przed diagnozą turbo.")
        severity = "medium"
        action = "Wymiana oleju + diagnostyka VGT"

    if not diagnosis:
        diagnosis.append("Opisz dokładniej objawy: kolor dymu, dźwięki, kiedy się pojawiają (zimny/ciepły silnik, przy jakich obrotach).")
        severity = "unknown"
        action = "Potrzeba więcej informacji"

    return {
        "diagnosis": diagnosis,
        "severity": severity,
        "recommended_action": action,
        "car": car,
        "next_step": f"Wyszukaj turbosprężarkę dla Twojego auta ({car}) — sprawdź dostępność w sklepie."
    }


TOOL_EXECUTORS = {
    "search_turbo": _exec_search_turbo,
    "decode_vin": _exec_decode_vin,
    "get_product_details": _exec_get_product_details,
    "check_symptoms": _exec_check_symptoms,
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENGINE
# ─────────────────────────────────────────────────────────────────────────────

class TurboChatEngine:
    def __init__(self):
        self.api_key = get_config("anthropic_key", "") or Config.ANTHROPIC_API_KEY
        self.store_name = get_config("store_name", "TurboShop")
        self.store_url = get_config("woo_url", "")
        self.model = Config.CLAUDE_MODEL
        self._client = None

    def _client_ready(self) -> bool:
        if not self.api_key:
            return False
        if self._client is None:
            self._client = anthropic.Anthropic(api_key=self.api_key)
        return True

    def _build_system(self) -> str:
        return SYSTEM_PROMPT.format(
            store_name=self.store_name,
            store_url=self.store_url or "twojsklep.pl"
        )

    def chat(self, session_id: str, user_message: str) -> dict:
        """
        Główna metoda — przyjmuje wiadomość użytkownika, zwraca odpowiedź.
        Obsługuje agentic loop (tool use).
        """
        from chatbot.conversation import get_history, save_message

        # Save user message
        save_message(session_id, "user", user_message)
        history = get_history(session_id, max_messages=16)

        if not self._client_ready():
            return self._fallback_response(user_message, session_id)

        messages = history  # already includes the user message we just saved
        products_shown = []
        final_text = ""

        # Agentic loop (max 5 tool rounds)
        for _ in range(5):
            response = self._client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=self._build_system(),
                tools=TOOLS,
                messages=messages,
            )

            # Collect text
            text_parts = []
            tool_uses = []
            for block in response.content:
                if hasattr(block, "text"):
                    text_parts.append(block.text)
                if block.type == "tool_use":
                    tool_uses.append(block)

            final_text = "\n".join(text_parts)

            if response.stop_reason == "end_turn" or not tool_uses:
                break

            # Execute tools
            tool_results = []
            for tool_use in tool_uses:
                try:
                    executor = TOOL_EXECUTORS.get(tool_use.name)
                    if executor:
                        result = executor(tool_use.input)
                        # Collect products for widget rendering
                        if tool_use.name == "search_turbo":
                            products_shown.extend(result.get("products", []))
                        elif tool_use.name == "decode_vin":
                            products_shown.extend(result.get("suggested_products", []))
                    else:
                        result = {"error": f"Unknown tool: {tool_use.name}"}
                except Exception as e:
                    result = {"error": str(e)}

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_use.id,
                    "content": json.dumps(result, ensure_ascii=False),
                })

            # Continue with tool results
            messages = messages + [
                {"role": "assistant", "content": response.content},
                {"role": "user", "content": tool_results},
            ]

        # Save assistant reply
        save_message(session_id, "assistant", final_text, products_shown[:3])

        return {
            "message": final_text,
            "products": products_shown[:3],
            "session_id": session_id,
        }

    def _fallback_response(self, user_message: str, session_id: str) -> dict:
        """Odpowiedź bez AI — prosta logika regułowa."""
        from chatbot.product_finder import search_products
        from chatbot.conversation import save_message

        msg_lower = user_message.lower()
        products = []

        # Simple intent detection
        if any(w in msg_lower for w in ["cześć", "hej", "dzień dobry", "witam", "hello"]):
            text = (f"Cześć! Jestem Turbo AI — Twój doradca {self.store_name}.\n\n"
                    "Pomogę Ci znaleźć właściwą turbosprężarkę do Twojego auta.\n\n"
                    "Powiedz mi:\n"
                    "• **Jaką masz markę i model auta?** (np. BMW 320d, Audi A4 2.0 TDI)\n"
                    "• **Lub podaj numer VIN** — sprawdzę, co potrzebujesz\n"
                    "• **Lub wpisz numer OEM turbo** jeśli go znasz")

        elif any(w in msg_lower for w in ["bmw", "audi", "volkswagen", "vw", "mercedes",
                                           "ford", "opel", "toyota", "renault", "skoda"]):
            products = search_products(user_message, limit=3)
            text = (f"Znalazłem {len(products)} turbosprężarek pasujących do Twojego zapytania.\n\n"
                    "Sprawdź propozycje poniżej. Aby potwierdzić kompatybilność, "
                    "podaj mi **numer VIN** lub **numer silnika** — zweryfikuję dopasowanie bezpłatnie.")

        elif any(w in msg_lower for w in ["cena", "ile kosztuje", "koszt", "price"]):
            text = ("Ceny turbosprężarek zależą od marki auta i typu turbo:\n\n"
                    "• Turbina **regenerowana**: od 800 do 2500 zł\n"
                    "• Turbina **nowa**: od 1500 do 5000 zł\n"
                    "• **CHRA** (wkład turbo): od 400 do 1200 zł\n\n"
                    "Powiedz mi do jakiego auta szukasz — podam dokładną cenę.")

        elif any(w in msg_lower for w in ["gwarancja", "zwrot", "warranty"]):
            text = ("**Nasza gwarancja:**\n\n"
                    "• Turbosprężarki **nowe**: 24 miesiące\n"
                    "• Turbosprężarki **regenerowane**: 12 miesięcy\n"
                    "• **Zwroty**: 30 dni bez podania przyczyny\n\n"
                    "W razie problemu — wymieniamy lub zwracamy 100% środków.")

        elif any(w in msg_lower for w in ["dostawa", "wysyłka", "kiedy", "jak długo"]):
            text = ("**Dostawa:**\n\n"
                    "• 🇵🇱 Polska: **24 godziny** (produkty na stanie)\n"
                    "• 🇪🇺 Europa: **3-5 dni roboczych**\n"
                    "• Darmowa dostawa od 500 zł\n"
                    "• Ekspresowa dostawa na następny dzień")

        else:
            products = search_products(user_message, limit=3)
            text = (f"Szukam turbosprężarki dla Twojego zapytania...\n\n"
                    "Aby lepiej dobrać produkt, powiedz mi:\n"
                    "• **Marka i model auta** (np. BMW 320d 2005)\n"
                    "• **Pojemność i kod silnika** (np. 2.0 TDI, N47)\n"
                    "• Lub **numer VIN** — sprawdzę bezpłatnie\n\n"
                    "Możesz też zadzwonić — oddzwaniamy w ciągu 30 minut.")
            if not products:
                text += "\n\n📞 Zadzwoń lub napisz na czacie — pomożemy natychmiast!"

        save_message(session_id, "assistant", text, products)
        return {"message": text, "products": products, "session_id": session_id}
