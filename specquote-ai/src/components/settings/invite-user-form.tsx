"use client";

import { useActionState } from "react";
import { inviteUserAction, type FormState } from "@/lib/actions/org";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/security/rbac";

const initialState: FormState = {};
const INVITABLE_ROLES = ["ADMIN", "SALES_MANAGER", "SALES_REP", "ESTIMATOR", "VIEWER"] as const;

export function InviteUserForm() {
  const [state, formAction, pending] = useActionState(inviteUserAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite a teammate</CardTitle>
      </CardHeader>
      <CardBody>
        <form action={formAction} className="flex items-end gap-3">
          <div className="flex-1">
            <Input name="email" type="email" placeholder="colleague@company.com" required />
          </div>
          <Select name="role" defaultValue="SALES_REP" className="w-48">
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="brand" disabled={pending}>
            {pending ? "Sending…" : "Send invite"}
          </Button>
        </form>
        {state?.error ? <p className="mt-2 text-sm text-red-600">{state.error}</p> : null}
        {state?.success ? <p className="mt-2 text-sm text-emerald-600">{state.success}</p> : null}
      </CardBody>
    </Card>
  );
}
