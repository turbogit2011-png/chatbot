import { Paperclip, Download, FileText, Image as ImageIcon, FileSpreadsheet, Mail } from "lucide-react";
import { buildSignedFileUrl } from "@/lib/security/storage";
import { formatDateTime } from "@/lib/utils";
import type { RfqAttachment } from "@prisma/client";

const KIND_ICON: Record<string, typeof FileText> = {
  PDF: FileText,
  IMAGE: ImageIcon,
  XLSX: FileSpreadsheet,
  CSV: FileSpreadsheet,
  DOCX: FileText,
  EMAIL: Mail,
  TEXT: FileText,
};

export function LeftPanel({
  orgId,
  subject,
  sourceEmailRaw,
  receivedAt,
  attachments,
}: {
  orgId: string;
  subject: string;
  sourceEmailRaw: string | null;
  receivedAt: Date;
  attachments: RfqAttachment[];
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto border-r border-border bg-white">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Original request</h2>
      </div>

      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{subject}</p>
        <p className="text-xs text-gray-500">Received {formatDateTime(receivedAt)}</p>
      </div>

      {sourceEmailRaw ? (
        <div className="border-b border-border px-4 py-3">
          <p className="mb-1.5 text-xs font-medium text-gray-500">Message body</p>
          <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-[13px] leading-relaxed text-gray-700">
            {sourceEmailRaw}
          </p>
        </div>
      ) : null}

      <div className="px-4 py-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <Paperclip size={12} /> Attachments ({attachments.length})
        </p>
        <div className="space-y-2">
          {attachments.map((att) => {
            const Icon = KIND_ICON[att.kind] ?? FileText;
            const url = buildSignedFileUrl(att.storageKey, orgId, 600);
            return (
              <a
                key={att.id}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 hover:bg-gray-50"
              >
                <Icon size={16} className="shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-gray-800">{att.fileName}</p>
                  <p className="text-[11px] text-gray-500">
                    {att.kind} · {(att.sizeBytes / 1024).toFixed(0)} KB
                  </p>
                </div>
                <Download size={14} className="shrink-0 text-gray-300" />
              </a>
            );
          })}
          {attachments.length === 0 && <p className="text-xs text-gray-400">No attachments on this request.</p>}
        </div>
      </div>
    </div>
  );
}
