import { RFQ_HEADER_FIELD_KEYS } from "./types";
import type {
  AIProvider,
  ClientQuestionDraft,
  DocumentParseInput,
  DocumentParseResult,
  MissingInfoSuggestion,
  QuoteComposerInput,
  QuoteComposerResult,
} from "./types";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiProviderError extends Error {}

/**
 * Thin adapter over the Gemini API (multimodal document understanding).
 * Requires GEMINI_API_KEY. Not exercised in this sandbox (no outbound key
 * configured) — reviewed for correctness of the request/response shape but
 * should be smoke-tested against a real key before relying on it in a pilot.
 */
export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "gemini-2.0-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  private async generate(parts: Array<Record<string, unknown>>): Promise<string> {
    const res = await fetch(`${API_BASE}/${this.model}:generateContent?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    });

    if (!res.ok) {
      throw new GeminiProviderError(`Gemini API error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      throw new GeminiProviderError("Gemini API returned no text content.");
    }
    return text;
  }

  async parseDocument(input: DocumentParseInput): Promise<DocumentParseResult> {
    const instructions = `You are a technical RFQ document parser for an industrial B2B distributor.
Extract structured data from the attached document ("${input.fileName}", type ${input.kind}).
Return ONLY minified JSON matching this TypeScript type, no prose:
{
  "headerFields": Array<{ "fieldKey": ${RFQ_HEADER_FIELD_KEYS.map((k) => `"${k}"`).join(" | ")}, "value": string, "confidence": number, "sourceRef": string }>,
  "lineItems": Array<{ "rawDescription": string, "productFamily"?: string, "partNumber"?: string, "quantity"?: number, "unit"?: string, "dimensions"?: string, "material"?: string, "finish"?: string, "tolerance"?: string, "voltage"?: string, "pressure"?: string, "temperature"?: string, "certificationRequirements"?: string, "confidence": number, "sourceRef"?: string }>,
  "attachmentsSummary": string,
  "uncertainties": string[],
  "overallConfidence": number
}
Confidence must be your genuine calibrated probability (0..1) that the value is correct. Never invent a part number or quantity — if unclear, omit it and add an entry to "uncertainties" instead.`;

    const parts: Array<Record<string, unknown>> = [{ text: instructions }];

    if (input.buffer && (input.kind === "PDF" || input.kind === "IMAGE")) {
      parts.push({
        inlineData: {
          mimeType: input.mimeType,
          data: input.buffer.toString("base64"),
        },
      });
    } else if (input.textContent) {
      parts.push({ text: `Document content:\n${input.textContent}` });
    }

    const text = await this.generate(parts);
    const parsed = JSON.parse(text) as DocumentParseResult;
    return parsed;
  }

  async draftMissingInfoMessage(
    customerName: string,
    contactName: string,
    missing: MissingInfoSuggestion[],
    language: string,
  ): Promise<ClientQuestionDraft> {
    const prompt = `Write a short, professional B2B e-mail in language "${language}" to customer "${customerName}" (contact: "${contactName}") asking them to confirm these missing technical details before a quote can be prepared: ${missing.map((m) => m.description).join("; ")}.
Return ONLY minified JSON: { "subject": string, "body": string }`;
    const text = await this.generate([{ text: prompt }]);
    return JSON.parse(text) as ClientQuestionDraft;
  }

  async draftQuoteEmail(input: QuoteComposerInput): Promise<QuoteComposerResult> {
    const prompt = `Write a short, professional B2B e-mail in language "${input.language}" to customer "${input.customerName}" (contact: "${input.contactName}") presenting quote number ${input.quoteNumber}, valid until ${input.validUntilISO}, payment terms ${input.paymentTerms}, delivery terms ${input.deliveryTerms}, covering line items: ${JSON.stringify(input.lineItems)}.
Return ONLY minified JSON: { "emailSubject": string, "emailBody": string }`;
    const text = await this.generate([{ text: prompt }]);
    return JSON.parse(text) as QuoteComposerResult;
  }
}
