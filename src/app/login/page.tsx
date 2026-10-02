import Link from "next/link";
import { redirect } from "next/navigation";
import { devLoginEnabled, getCurrentUser } from "@/lib/auth";
import { LoginButtons } from "./LoginButtons";

export const metadata = { title: "Přihlášení" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return (
    <div className="safe-top flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white px-4">
      <div className="card w-full max-w-sm text-center">
        <div className="mb-2 text-5xl">🎸</div>
        <h1 className="text-2xl font-extrabold">BandPilot</h1>
        <p className="mt-1 text-sm text-slate-600">Koncerty, sestavy, doprava a hlasování vaší kapely na jednom místě.</p>
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
