import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { redirect } from "next/navigation";
import { canLogIn, loginLocked, parseEmails } from "./access";
import { isProduction } from "./env";
import { prisma } from "./prisma";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

const adminEmails = parseEmails(process.env.ADMIN_EMAILS);

// Přihlášení jen e-mailem slouží pro vývoj a náhledy – v ostré verzi je vždy vypnuté.
export const devLoginEnabled = process.env.ENABLE_DEV_LOGIN === "true" && !isProduction;

const providers: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Organizátor může uživatele založit předem e-mailem – po přihlášení přes Google se účet propojí.
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: { scope: GOOGLE_SCOPES, access_type: "offline", prompt: "consent" },
      },
    }),
  );
}

if (devLoginEnabled) {
  providers.push(
    CredentialsProvider({
      id: "dev",
      name: "Vývojové přihlášení",
      credentials: { email: { label: "E-mail", type: "email" } },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        if (!email) return null;
        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, name: email.split("@")[0] },
        });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user }) {
      // Vývoj a náhled (jen testovací data) – bez omezení.
      if (devLoginEnabled) return true;
      const email = user.email?.toLowerCase();
      const existing = email ? await prisma.user.findUnique({ where: { email } }) : null;
      const allowed = canLogIn({
        email,
        known: !!existing,
        isAdmin: existing?.role === "ADMIN",
        adminEmails,
        locked: loginLocked(),
      });
      return allowed ? true : "/login?error=AccessDenied";
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      const email = user.email?.toLowerCase();
      if (email && adminEmails.includes(email)) {
        await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
      }
      // Při opakovaném přihlášení přes Google uložíme čerstvé tokeny (adapter je ukládá jen poprvé).
      if (account?.provider === "google") {
        await prisma.account.updateMany({
          where: { provider: "google", providerAccountId: account.providerAccountId },
          data: {
            access_token: account.access_token,
            expires_at: account.expires_at,
            scope: account.scope,
            id_token: account.id_token,
            ...(account.refresh_token ? { refresh_token: account.refresh_token } : {}),
          },
        });
      }
    },
  },
};

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  // Při uzamčení aplikace odhlásíme i ty, kdo už přihlášení byli.
  if (user && loginLocked() && !canLogIn({ email: user.email, known: true, isAdmin: user.role === "ADMIN", adminEmails, locked: true })) {
    return null;
  }
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
