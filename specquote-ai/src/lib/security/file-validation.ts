import type { AttachmentKind } from "@prisma/client";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB per file

const MIME_TO_KIND: Record<string, AttachmentKind> = {
  "application/pdf": "PDF",
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
  "image/webp": "IMAGE",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.ms-excel": "XLSX",
  "text/csv": "CSV",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "message/rfc822": "EMAIL",
  "text/plain": "TEXT",
};

const EXTENSION_FALLBACK: Record<string, AttachmentKind> = {
  pdf: "PDF",
  jpg: "IMAGE",
  jpeg: "IMAGE",
  png: "IMAGE",
  webp: "IMAGE",
  xlsx: "XLSX",
  xls: "XLSX",
  csv: "CSV",
  docx: "DOCX",
  eml: "EMAIL",
  txt: "TEXT",
};

export interface FileValidationResult {
  ok: boolean;
  kind?: AttachmentKind;
  error?: string;
}

export function validateUpload(fileName: string, mimeType: string, sizeBytes: number): FileValidationResult {
  if (sizeBytes <= 0) {
    return { ok: false, error: "Empty file." };
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `File exceeds ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB limit.` };
  }

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const kind = MIME_TO_KIND[mimeType] ?? EXTENSION_FALLBACK[extension];

  if (!kind) {
    return { ok: false, error: `Unsupported file type: ${mimeType || extension || "unknown"}.` };
  }

  // Guard against disguised executables / path traversal in the filename.
  if (/[/\\]/.test(fileName) || fileName.includes("..")) {
    return { ok: false, error: "Invalid file name." };
  }

  return { ok: true, kind };
}
