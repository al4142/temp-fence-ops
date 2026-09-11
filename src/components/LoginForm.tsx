"use client";

import { useActionState } from "react";
import { loginAction, type LoginResult } from "@/app/login/actions";

const initial: LoginResult | null = null;

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form
      action={formAction}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="admin@demo.local"
        />
      </label>
      <label className="mt-4 block text-sm font-medium text-slate-700">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      {state && !state.ok ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
