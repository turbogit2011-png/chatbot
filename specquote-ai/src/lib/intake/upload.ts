import { randomUUID } from "node:crypto";
import type { AttachmentKind } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { validateUpload } from "@/lib/security/file-validation";
import { storage } from "@/lib/security/storage";

export interface UploadFileInput {
  rfqId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface UploadResult {
  ok: boolean;
  error?: string;
  attachmentId?: string;
  kind?: AttachmentKind;
}

/** Validates and persists one RFQ attachment (private storage, never a public path). Call runAiParseForRfq afterwards to extract structured data from it. */
export async function uploadRfqAttachment(input: UploadFileInput): Promise<UploadResult> {
  const validation = validateUpload(input.fileName, input.mimeType, input.buffer.byteLength);
  if (!validation.ok || !validation.kind) {
    return { ok: false, error: validation.error };
  }

  const storageKey = `uploads/${input.rfqId}/${randomUUID()}-${input.fileName}`;
  await storage.save(storageKey, input.buffer);

  const attachment = await prisma.rfqAttachment.create({
    data: {
      rfqId: input.rfqId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.byteLength,
      storageKey,
      kind: validation.kind,
    },
  });

  return { ok: true, attachmentId: attachment.id, kind: validation.kind };
}
