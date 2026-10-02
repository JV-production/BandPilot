// Rozlišení prostředí: ostrá verze (bandpilot.cz), náhled (Vercel Preview) a lokální vývoj.

export const isProduction = process.env.VERCEL_ENV === "production";
export const isPreview = process.env.VERCEL_ENV === "preview";

/** Databáze: náhled má VLASTNÍ databázi (PREVIEW_DATABASE_URL) a nikdy nesáhne na ostrá data. */
export function databaseUrl(): string | undefined {
  if (isPreview) {
    const url = process.env.PREVIEW_DATABASE_URL;
    if (!url) throw new Error("Náhledová verze nemá nastavenou PREVIEW_DATABASE_URL.");
    return url;
  }
  return process.env.DATABASE_URL;
}

/** Veřejná adresa aplikace. Náhled používá stálou adresu své větve. */
export function appBaseUrl(): string {
  if (isPreview && process.env.VERCEL_BRANCH_URL) return `https://${process.env.VERCEL_BRANCH_URL}`;
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

// NextAuth čte adresu z NEXTAUTH_URL – v náhledu ji nastavíme na adresu větve.
if (isPreview && process.env.VERCEL_BRANCH_URL) {
  process.env.NEXTAUTH_URL = appBaseUrl();
}
