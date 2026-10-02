import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, Car, Users } from "lucide-react";
import { devLoginEnabled, getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LoginButtons } from "./LoginButtons";

export const metadata = { title: "Přihlášení" };

const FEATURES = [
  { icon: CalendarCheck, text: "Koncerty rovnou v Google Kalendáři" },
  { icon: Users, text: "Kdo hraje, záskoky a hlasování" },
  { icon: Car, text: "Doprava – kdo s kým jede" },
];

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return (
    <div className="safe-top relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0b0d] px-5 text-white">
      {/* oranžová záře v pozadí */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, #E0680F 0%, transparent 65%)" }}
        aria-hidden
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center [--brand:236_118_24]">
          <Logo size="lg" />
        </div>
        <p className="mb-8 text-center text-[15px] leading-relaxed text-white/70">
          Organizace koncertů, sestav a dopravy vaší kapely na jednom místě.
        </p>
        <ul className="mb-8 space-y-3">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-white/85">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.07] text-[#F08A2E]">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              {text}
            </li>
          ))}
        </ul>
        <LoginButtons googleEnabled={googleEnabled} devEnabled={devLoginEnabled} />
        <p className="mt-6 text-center text-xs leading-relaxed text-white/45">
          Přístup do kapel vám přidělí organizátor.{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-white/70">
            Ochrana osobních údajů
          </Link>
        </p>
      </div>
    </div>
  );
}
