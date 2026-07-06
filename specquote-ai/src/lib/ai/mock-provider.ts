import {
  CERTIFICATIONS,
  DELIVERY_TERMS,
  FINISHES,
  MATERIALS,
  PRODUCT_FAMILIES,
  TOLERANCES,
  UNITS,
} from "@/lib/domain-data";
import { hashString, pick, pickWeightedConfidence, seededRandom } from "./rng";
import type {
  AIProvider,
  ClientQuestionDraft,
  DocumentParseInput,
  DocumentParseResult,
  ExtractedHeaderField,
  ExtractedLineItem,
  MissingInfoSuggestion,
  QuoteComposerInput,
  QuoteComposerResult,
  RfqHeaderFieldKey,
} from "./types";

const VOLTAGE_FAMILIES = new Set(["Servo Motors", "Frequency Inverters", "Control Panel Enclosures"]);
const PRESSURE_FAMILIES = new Set(["Pneumatic Cylinders", "Hydraulic Pumps", "Solenoid Valves", "Check Valves"]);
const TEMPERATURE_FAMILIES = new Set(["HVAC Air Handling Units", "Thermocouples"]);

function extractEmail(text: string): string | undefined {
  const match = text.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
  return match?.[0];
}

function extractQuantity(text: string): number | undefined {
  const match = text.match(/(?:qty|quantity|ilość|szt\.?)\s*[:=]?\s*(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

/**
 * MockAIProvider — fully offline, deterministic-per-attachment stand-in for
 * a real multimodal model. It never calls out to the network. Every
 * extracted field always carries a confidence score + source reference so
 * the UI/behaviour is identical to what a real provider would produce.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async parseDocument(input: DocumentParseInput): Promise<DocumentParseResult> {
    const seed = hashString(input.attachmentId + input.fileName);
    const rand = seededRandom(seed);

    const lineItemCount = input.kind === "XLSX" || input.kind === "CSV" ? 1 + Math.floor(rand() * 3) : 1;
    const lineItems: ExtractedLineItem[] = [];
    const uncertainties: string[] = [];

    for (let i = 0; i < lineItemCount; i++) {
      const family = pick(rand, PRODUCT_FAMILIES);
      const hasPartNumber = rand() > 0.25;
      const hasQuantity = rand() > 0.15;
      const hasMaterial = rand() > 0.3;
      const hasTolerance = rand() > 0.45;
      const hasDimensions = rand() > 0.35;

      const textQuantity = input.textContent ? extractQuantity(input.textContent) : undefined;

      const item: ExtractedLineItem = {
        rawDescription: `${family} — extracted from ${input.fileName}`,
        productFamily: family,
        partNumber: hasPartNumber
          ? `${family
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()}-${1000 + Math.floor(rand() * 8999)}`
          : undefined,
        quantity: textQuantity ?? (hasQuantity ? Math.round((1 + rand() * 199) * 10) / 10 : undefined),
        unit: pick(rand, UNITS),
        dimensions: hasDimensions ? `${20 + Math.floor(rand() * 380)}x${20 + Math.floor(rand() * 380)}x${5 + Math.floor(rand() * 45)} mm` : undefined,
        material: hasMaterial ? pick(rand, MATERIALS) : undefined,
        finish: rand() > 0.5 ? pick(rand, FINISHES) : undefined,
        tolerance: hasTolerance ? pick(rand, TOLERANCES) : undefined,
        voltage: VOLTAGE_FAMILIES.has(family) && rand() > 0.3 ? `${pick(rand, [24, 230, 400, 690])} V` : undefined,
        pressure: PRESSURE_FAMILIES.has(family) && rand() > 0.3 ? `${(1 + rand() * 15).toFixed(1)} bar` : undefined,
        temperature: TEMPERATURE_FAMILIES.has(family) && rand() > 0.3 ? `${-20 + Math.floor(rand() * 140)} °C` : undefined,
        certificationRequirements: rand() > 0.55 ? pick(rand, CERTIFICATIONS) : undefined,
        confidence: pickWeightedConfidence(rand),
        sourceRef:
          input.kind === "PDF" || input.kind === "IMAGE"
            ? `page ${1 + Math.floor(rand() * 3)}`
            : input.kind === "XLSX" || input.kind === "CSV"
              ? `row ${2 + i}`
              : "message body",
      };

      if (!item.quantity) uncertainties.push(`Missing quantity for "${item.productFamily}" (line ${i + 1}).`);
      if (!item.material) uncertainties.push(`Material not specified for "${item.productFamily}" (line ${i + 1}).`);
      if (!item.tolerance && (family.includes("Bearing") || family.includes("Gearbox") || family.includes("Screw")))
        uncertainties.push(`Tolerance class not specified for "${item.productFamily}" (line ${i + 1}).`);
      if (!item.partNumber) uncertainties.push(`Ambiguous or missing part number for "${item.productFamily}" (line ${i + 1}).`);

      lineItems.push(item);
    }

    const headerFields: ExtractedHeaderField[] = [];
    const pushField = (fieldKey: RfqHeaderFieldKey, value: string | undefined, confidence: number) => {
      if (!value) return;
      headerFields.push({
        fieldKey,
        value,
        confidence,
        sourceAttachmentFileName: input.fileName,
        sourceRef: input.kind === "EMAIL" || input.kind === "TEXT" ? "message header" : `page 1`,
      });
    };

    const emailFromText = input.textContent ? extractEmail(input.textContent) : undefined;
    if (emailFromText) pushField("contact_email", emailFromText, pickWeightedConfidence(rand, 0.85, 0.99));

    if (rand() > 0.4) pushField("delivery_terms", pick(rand, DELIVERY_TERMS), pickWeightedConfidence(rand, 0.6, 0.9));
    else uncertainties.push("Delivery terms (Incoterms) not stated in the request.");

    if (rand() > 0.5) {
      pushField(
        "requested_delivery_date",
        new Date(Date.now() + (7 + Math.floor(rand() * 60)) * 86400000).toISOString().slice(0, 10),
        pickWeightedConfidence(rand, 0.55, 0.85),
      );
    } else {
      uncertainties.push("No requested delivery date found — assumed standard lead time.");
    }

    const overallConfidence =
      [...headerFields.map((f) => f.confidence), ...lineItems.map((l) => l.confidence)].reduce((a, b) => a + b, 0) /
      Math.max(1, headerFields.length + lineItems.length);

    return {
      headerFields,
      lineItems,
      attachmentsSummary: `${input.kind} document "${input.fileName}" — detected ${lineItems.length} technical line item(s) covering ${[...new Set(lineItems.map((l) => l.productFamily))].join(", ")}.`,
      uncertainties,
      overallConfidence: Math.round(overallConfidence * 100) / 100,
    };
  }

  async draftMissingInfoMessage(
    customerName: string,
    contactName: string,
    missing: MissingInfoSuggestion[],
    language: string,
  ): Promise<ClientQuestionDraft> {
    const isPolish = language.toLowerCase().startsWith("pl");
    const items = missing.map((m) => m.description);

    if (isPolish) {
      return {
        subject: `Prośba o uzupełnienie danych do zapytania ofertowego — ${customerName}`,
        body: [
          `Dzień dobry ${contactName || ""},`.trim(),
          "",
          "Dziękujemy za przesłane zapytanie ofertowe. Aby przygotować dokładną i wiążącą ofertę, prosimy o potwierdzenie poniższych informacji:",
          "",
          ...items.map((i, idx) => `${idx + 1}. ${i}`),
          "",
          "Po otrzymaniu tych danych przygotujemy ofertę w ciągu 1 dnia roboczego.",
          "",
          "Z poważaniem,",
          "Zespół handlowy",
        ].join("\n"),
      };
    }

    return {
      subject: `Additional information needed for your RFQ — ${customerName}`,
      body: [
        `Hello ${contactName || "there"},`,
        "",
        "Thank you for your request for quotation. To prepare an accurate offer, could you please confirm the following:",
        "",
        ...items.map((i, idx) => `${idx + 1}. ${i}`),
        "",
        "As soon as we have this information, we'll turn the quote around within one business day.",
        "",
        "Best regards,",
        "Sales Team",
      ].join("\n"),
    };
  }

  async draftQuoteEmail(input: QuoteComposerInput): Promise<QuoteComposerResult> {
    const isPolish = input.language.toLowerCase().startsWith("pl");
    const lines = input.lineItems
      .map((li) => `- ${li.description}${li.sku ? ` (${li.sku})` : ""}: ${li.quantity} ${li.unit} — lead time ${li.leadTimeDays} days`)
      .join("\n");

    if (isPolish) {
      return {
        emailSubject: `Oferta ${input.quoteNumber} — ${input.customerName}`,
        emailBody: [
          `Dzień dobry ${input.contactName || ""},`.trim(),
          "",
          `W załączeniu przesyłamy ofertę nr ${input.quoteNumber} zgodnie z Państwa zapytaniem.`,
          "",
          lines,
          "",
          `Warunki płatności: ${input.paymentTerms}`,
          `Warunki dostawy: ${input.deliveryTerms}`,
          `Oferta ważna do: ${new Date(input.validUntilISO).toLocaleDateString("pl-PL")}`,
          "",
          "Pozostajemy do dyspozycji w razie pytań.",
          "",
          "Z poważaniem,",
          "Zespół handlowy",
        ].join("\n"),
      };
    }

    return {
      emailSubject: `Quote ${input.quoteNumber} — ${input.customerName}`,
      emailBody: [
        `Hello ${input.contactName || "there"},`,
        "",
        `Please find attached quote ${input.quoteNumber} based on your request.`,
        "",
        lines,
        "",
        `Payment terms: ${input.paymentTerms}`,
        `Delivery terms: ${input.deliveryTerms}`,
        `Valid until: ${new Date(input.validUntilISO).toLocaleDateString("en-GB")}`,
        "",
        "Please let us know if you have any questions.",
        "",
        "Best regards,",
        "Sales Team",
      ].join("\n"),
    };
  }
}
