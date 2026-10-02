"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function LoginButtons({ googleEnabled, devEnabled }: { googleEnabled: boolean; devEnabled: boolean }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div className="space-y-4">
      {googleEnabled ? (
        <button
          className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-2xl bg-white text-[15px] font-semibold text-[#1f1f1f] shadow-lg transition active:scale-[0.98] disabled:opacity-70"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            signIn("google", { callbackUrl: "/" });
          }}
        >
          <GoogleIcon />
          {loading ? "Přesměrovávám…" : "Pokračovat přes Google"}
        </button>
      ) : (
        <p className="rounded-2xl bg-white/[0.07] p-3 text-sm text-amber-300">
          Přihlášení přes Google není nakonfigurované (chybí GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).
        </p>
      )}
      {devEnabled && (
        <form
          className="space-y-2 rounded-2xl bg-white/[0.05] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            signIn("dev", { email, callbackUrl: "/" });
          }}
        >
          <label className="block text-xs font-medium text-white/60" htmlFor="dev-email">
            Vývojové přihlášení (jen e-mail)
          </label>
          <input
            id="dev-email"
            type="email"
            required
            className="block min-h-[46px] w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 text-base text-white placeholder:text-white/35 focus:border-[#E0680F] focus:outline-none"
            placeholder="vas@email.cz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="min-h-[44px] w-full rounded-xl bg-white/10 text-sm font-semibold text-white hover:bg-white/15">Přihlásit</button>
        </form>
      )}
    </div>
  );
}
