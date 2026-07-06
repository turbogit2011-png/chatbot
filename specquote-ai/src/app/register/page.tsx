"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: AuthFormState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">
            S
          </div>
          <h1 className="text-lg font-semibold text-white">Create your organization</h1>
          <p className="mt-1 text-sm text-graphite-400">Start turning RFQs into approved quotes today.</p>
        </div>

        <div className="rounded-xl border border-graphite-700 bg-graphite-900 p-6 shadow-xl">
          <form action={formAction} className="space-y-4">
            <div>
              <Label className="text-graphite-400">Company name</Label>
              <Input name="companyName" required placeholder="Atlas Industrial Components" />
            </div>
            <div>
              <Label className="text-graphite-400">Your name</Label>
              <Input name="name" required placeholder="Jane Doe" />
            </div>
            <div>
              <Label className="text-graphite-400">Work e-mail</Label>
              <Input name="email" type="email" required placeholder="you@company.com" />
            </div>
            <div>
              <Label className="text-graphite-400">Password</Label>
              <Input name="password" type="password" required minLength={8} placeholder="At least 8 characters" />
            </div>
            {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
            <Button type="submit" variant="brand" className="w-full" size="lg" disabled={pending}>
              {pending ? "Creating…" : "Create organization"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-graphite-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
