"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginButtons({ googleEnabled, devEnabled }: { googleEnabled: boolean; devEnabled: boolean }) {
  const [email, setEmail] = useState("");
  return (
    <div className="space-y-4">
      {googleEnabled ? (
        <button className="btn-primary w-full" onClick={() => signIn("google", { callbackUrl: "/" })}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path fill="#fff" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.7 14.55 2.75 12 2.75 6.9 2.75 2.75 6.9 2.75 12S6.9 21.25 12 21.25c5.34 0 8.88-3.75 8.88-9.04 0-.6-.07-1.06-.15-1.11z" />
          </svg>
          Přihlásit se přes Google
        </button>
      ) : (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Přihlášení přes Google není nakonfigurované (chybí GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).
        </p>
      )}
      {devEnabled && (
        <form
          className="space-y-2 border-t border-slate-200 pt-4 text-left"
          onSubmit={(e) => {
            e.preventDefault();
            signIn("dev", { email, callbackUrl: "/" });
          }}
        >
          <label className="label" htmlFor="dev-email">
            Vývojové přihlášení (jen e-mail)
          </label>
          <input
            id="dev-email"
            type="email"
            required
            className="input"
            placeholder="vas@email.cz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn-secondary w-full">Přihlásit</button>
        </form>
      )}
    </div>
  );
}
