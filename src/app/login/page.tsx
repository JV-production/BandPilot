import Link from "next/link";
import { redirect } from "next/navigation";
import { loginLocked } from "@/lib/access";
import { devLoginEnabled, getCurrentUser } from "@/lib/auth";
import { LoginButtons } from "./LoginButtons";

export const metadata = { title: "Přihlášení" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { error } = await searchParams;
  const locked = loginLocked();
  const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return (
    <div className="safe-top flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4">
      <div className="card w-full max-w-sm text-center">
        <div className="mb-2 text-5xl">🎸</div>
        <h1 className="text-2xl font-extrabold">BandPilot</h1>
        <p className="mt-1 text-sm text-slate-600">Koncerty, sestavy, doprava a hlasování vaší kapely na jednom místě.</p>
        {error === "AccessDenied" && (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
            {locked
              ? "Aplikace je dočasně uzavřená. Zkuste to prosím později."
              : "Tento účet nemá přístup. Požádejte organizátora, aby vás přidal do kapely."}
          </p>
        )}
        {locked && error !== "AccessDenied" && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Aplikace je dočasně uzavřená – přihlásit se může jen organizátor.</p>
        )}
        <div className="mt-6">
          <LoginButtons googleEnabled={googleEnabled} devEnabled={devLoginEnabled} />
        </div>
        <p className="mt-6 text-xs text-slate-500">
          Přihlášením přes Google povolíte zápis koncertů do svého Google Kalendáře.
          Přístup do kapel vám přidělí organizátor.
        </p>
        <Link href="/privacy" className="mt-3 inline-block text-xs text-brand-600 underline">
          Zásady ochrany osobních údajů
        </Link>
      </div>
    </div>
  );
}
