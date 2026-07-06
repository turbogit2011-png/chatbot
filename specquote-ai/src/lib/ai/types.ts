/**
 * AI provider abstraction shared by every adapter (Mock, Gemini, ...).
 * Nothing outside src/lib/ai should import a concrete provider directly —
 * always go through `getAIProvider()` in ./index.ts.
 */

export type RfqHeaderFieldKey =
  | "customer_name"
  | "contact_person"
  | "contact_email"
  | "request_date"
  | "requested_due_date"
  | "delivery_terms"
  | "destination_country"
  | "requested_delivery_date";

export const RFQ_HEADER_FIELD_KEYS: RfqHeaderFieldKey[] = [
  "customer_name",
  "contact_person",
  "contact_email",
  "request_date",
  "requested_due_date",
  "delivery_terms",
  "destination_country",
  "requested_delivery_date",
];

export const FIELD_LABELS: Record<string, string> = {
  customer_name: "Customer name",
  contact_person: "Contact person",
  contact_email: "Contact e-mail",
  request_date: "Request date",
  requested_due_date: "Requested due date",
  delivery_terms: "Delivery terms",
  destination_country: "Destination country",
  requested_delivery_date: "Requested delivery date",
  product_family: "Product family",
  product_name: "Product name",
  part_number: "Part number",
  quantity: "Quantity",
  unit: "Unit",
  dimensions: "Dimensions",
  material: "Material",
  finish: "Finish",
  tolerance: "Tolerance",
  voltage: "Voltage",
  pressure: "Pressure",
  temperature: "Temperature",
  certification_requirements: "Certification requirements",
};

export interface ExtractedHeaderField {
  fieldKey: RfqHeaderFieldKey;
  value: string;
  confidence: number; // 0..1
  sourceAttachmentFileName?: string;
  sourceRef?: string; // e.g. "page 2" or "row 14"
}

export interface ExtractedLineItem {
  rawDescription: string;
  productFamily?: string;
  partNumber?: string;
  quantity?: number;
  unit?: string;
  dimensions?: string;
  material?: string;
  finish?: string;
  tolerance?: string;
  voltage?: string;
  pressure?: string;
  temperature?: string;
  certificationRequirements?: string;
  confidence: number;
  sourceRef?: string;
}

export interface DocumentParseInput {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  kind: "PDF" | "IMAGE" | "XLSX" | "CSV" | "DOCX" | "EMAIL" | "TEXT";
  textContent?: string; // for TEXT/CSV/EML, or extracted text passed in
  buffer?: Buffer;
}

export interface DocumentParseResult {
  headerFields: ExtractedHeaderField[];
  lineItems: ExtractedLineItem[];
  attachmentsSummary: string;
  uncertainties: string[];
  overallConfidence: number;
}

export interface MissingInfoSuggestion {
  fieldKey: string;
  description: string;
}

export interface ClientQuestionDraft {
  subject: string;
  body: string;
}

export interface QuoteComposerInput {
  customerName: string;
  contactName: string;
  language: string;
  currency: string;
  lineItems: Array<{
    description: string;
    sku?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    leadTimeDays: number;
  }>;
  paymentTerms: string;
  deliveryTerms: string;
  validUntilISO: string;
  quoteNumber: string;
}

export interface QuoteComposerResult {
  emailSubject: string;
  emailBody: string;
}

/** Implemented by every parsing backend (Mock, Gemini, ...). */
export interface DocumentParser {
  parseDocument(input: DocumentParseInput): Promise<DocumentParseResult>;
}

/** Implemented by every backend that drafts customer-facing copy. */
export interface QuoteComposer {
  draftMissingInfoMessage(
    customerName: string,
    contactName: string,
    missing: MissingInfoSuggestion[],
    language: string,
  ): Promise<ClientQuestionDraft>;
  draftQuoteEmail(input: QuoteComposerInput): Promise<QuoteComposerResult>;
}

export interface AIProvider extends DocumentParser, QuoteComposer {
  readonly name: string;
}
