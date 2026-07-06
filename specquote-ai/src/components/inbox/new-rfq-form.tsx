"use client";

import { useActionState, useState } from "react";
import { createRfqAction } from "@/lib/actions/rfq";
import type { FormState } from "@/lib/actions/org";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { Account, Contact } from "@prisma/client";
import { UploadCloud } from "lucide-react";

const initialState: FormState = {};

export function NewRfqForm({ accounts }: { accounts: (Account & { contacts: Contact[] })[] }) {
  const [state, formAction, pending] = useActionState(createRfqAction, initialState);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const selectedAccount = accounts.find((a) => a.id === accountId);

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-border bg-white p-6 shadow-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Customer account</Label>
          <Select name="accountId" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Contact person</Label>
          <Select name="contactId" defaultValue="">
            <option value="">— none on file —</option>
            {selectedAccount?.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label>Subject</Label>
        <Input name="subject" required placeholder="e.g. RFQ — hydraulic cylinders for line 4" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Channel</Label>
          <Select name="channel" defaultValue="EMAIL">
            <option value="EMAIL">E-mail</option>
            <option value="UPLOAD">Upload</option>
            <option value="MANUAL">Manual entry</option>
          </Select>
        </div>
        <div>
          <Label>Destination country</Label>
          <Input name="destinationCountry" placeholder="Poland" />
        </div>
        <div>
          <Label>Response due date</Label>
          <Input name="dueDate" type="date" />
        </div>
      </div>

      <div>
        <Label>Estimated potential value (EUR)</Label>
        <Input name="estimatedValue" type="number" step="100" placeholder="12500" />
      </div>

      <div>
        <Label>Pasted e-mail / request text (optional)</Label>
        <Textarea name="emailText" rows={5} placeholder="Paste the customer's e-mail body here…" />
      </div>

      <div>
        <Label>Attachments (PDF, JPG, PNG, XLSX, CSV, DOCX, EML)</Label>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-gray-50 px-4 py-6 text-center hover:border-brand-400 hover:bg-brand-50/40">
          <UploadCloud size={20} className="text-gray-400" />
          <span className="text-sm text-gray-600">Click to choose files</span>
          <input name="files" type="file" multiple className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv,.docx,.eml,.txt" />
        </label>
      </div>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" variant="brand" size="lg" disabled={pending}>
          {pending ? "Parsing with AI…" : "Create & parse RFQ"}
        </Button>
      </div>
    </form>
  );
}
