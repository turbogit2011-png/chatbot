"use client";

import { useActionState } from "react";
import { completeOnboardingAction, type FormState } from "@/lib/actions/org";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

const initialState: FormState = {};

export default function OnboardingPage() {
  const [state, formAction, pending] = useActionState(completeOnboardingAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-lg rounded-xl border border-border bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">A few defaults before you start</h1>
        <p className="mt-1 text-sm text-gray-500">
          You can change these anytime in Settings. They control currency, quote language and the margin
          guardrails that trigger manager approval.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Currency</Label>
              <Select name="currency" defaultValue="EUR">
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="PLN">PLN</option>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select name="language" defaultValue="en">
                <option value="en">English</option>
                <option value="pl">Polski</option>
                <option value="de">Deutsch</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Default margin %</Label>
              <Input name="defaultMarginPercent" type="number" step="1" defaultValue={25} />
            </div>
            <div>
              <Label>Minimum margin before approval %</Label>
              <Input name="minMarginPercent" type="number" step="1" defaultValue={15} />
            </div>
          </div>
          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          <Button type="submit" variant="brand" className="w-full" size="lg" disabled={pending}>
            {pending ? "Saving…" : "Finish setup"}
          </Button>
        </form>
      </div>
    </div>
  );
}
