"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: AuthFormState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-graphite-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">
            S
          </div>
          <h1 className="text-lg font-semibold text-white">SpecQuote AI</h1>
          <p className="mt-1 text-sm text-graphite-400">From technical request to approved quote.</p>
        </div>

        <div className="rounded-xl border border-graphite-700 bg-graphite-900 p-6 shadow-xl">
          <form action={formAction} className="space-y-4">
            <div>
              <Label className="text-graphite-400">Work e-mail</Label>
              <Input name="email" type="email" required placeholder="you@company.com" autoComplete="email" />
            </div>
            <div>
              <Label className="text-graphite-400">Password</Label>
              <Input name="password" type="password" required placeholder="••••••••" autoComplete="current-password" />
            </div>
            {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
            <Button type="submit" variant="brand" className="w-full" size="lg" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-graphite-400">
          New to SpecQuote AI?{" "}
          <Link href="/register" className="font-medium text-white hover:underline">
            Create your organization
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-graphite-500">
          Demo login: <span className="text-graphite-300">owner@atlas-industrial.com</span> /{" "}
          <span className="text-graphite-300">demo1234</span>
        </p>
      </div>
    </div>
  );
}
