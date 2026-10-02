"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button className="btn-outline w-full text-bad" onClick={() => signOut({ callbackUrl: "/login" })}>
      <LogOut className="h-4 w-4" /> Odhlásit se
    </button>
  );
}
