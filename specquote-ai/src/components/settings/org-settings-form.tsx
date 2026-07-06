"use client";

import { useActionState } from "react";
import { updateOrgSettingsAction, type FormState } from "@/lib/actions/org";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Organization } from "@prisma/client";

const initialState: FormState = {};

export function OrgSettingsForm({ org, editable }: { org: Organization; editable: boolean }) {
  const [state, formAction, pending] = useActionState(updateOrgSettingsAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Organization name</Label>
            <Input name="name" defaultValue={org.name} disabled={!editable} />
          </div>
          <div>
            <Label>Currency</Label>
            <Input name="currency" defaultValue={org.currency} disabled={!editable} />
          </div>
          <div>
            <Label>Language</Label>
            <Input name="language" defaultValue={org.language} disabled={!editable} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Margin & approval rules</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-3 gap-4">
          <div>
            <Label>Default margin %</Label>
            <Input name="defaultMarginPercent" type="number" defaultValue={org.defaultMarginPercent} disabled={!editable} />
          </div>
          <div>
            <Label>Minimum margin before approval %</Label>
            <Input name="minMarginPercent" type="number" defaultValue={org.minMarginPercent} disabled={!editable} />
          </div>
          <div>
            <Label>Max discount before approval %</Label>
            <Input name="maxDiscountPercent" type="number" defaultValue={org.maxDiscountPercent} disabled={!editable} />
          </div>
          <div className="col-span-3">
            <Label>High-value review threshold</Label>
            <Input name="highValueThreshold" type="number" defaultValue={org.highValueThreshold} disabled={!editable} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document branding</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4">
          <div>
            <Label>Primary color</Label>
            <Input name="brandingPrimaryColor" type="color" defaultValue={org.brandingPrimaryColor} disabled={!editable} />
          </div>
          <div>
            <Label>PDF footer text</Label>
            <Input name="brandingFooterText" defaultValue={org.brandingFooterText ?? ""} disabled={!editable} />
          </div>
        </CardBody>
      </Card>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      {editable && (
        <Button type="submit" variant="brand" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      )}
    </form>
  );
}
