"use client";

import { useTransition } from "react";
import { assignRfqAction } from "@/lib/actions/rfq";
import { Select } from "@/components/ui/input";
import type { User } from "@prisma/client";

export function AssignRepSelect({ rfqId, users, assignedToId }: { rfqId: string; users: User[]; assignedToId: string | null }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={assignedToId ?? ""}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value || null;
        startTransition(() => {
          assignRfqAction(rfqId, value);
        });
      }}
    >
      <option value="">Unassigned</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </Select>
  );
}
