import { getAIProvider } from "@/lib/ai";
import type { QuoteComposerInput } from "@/lib/ai/types";

export interface QuoteEmailResult {
  subject: string;
  body: string;
}

/** Produces the ready-to-send e-mail text for a quote. The PDF is attached separately by the caller (route handler) — this only drafts the message body via the configured AIProvider. */
export async function buildQuoteEmail(input: QuoteComposerInput): Promise<QuoteEmailResult> {
  const provider = getAIProvider();
  const draft = await provider.draftQuoteEmail(input);
  return { subject: draft.emailSubject, body: draft.emailBody };
}
