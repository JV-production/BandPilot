import Link from "next/link";
import { ChevronDown, Trash2, UserPlus } from "lucide-react";
import { deleteUser, inviteUser, setUserRole } from "@/app/actions/users";
import { requireAdmin } from "@/lib/auth";
import { BAND_ROLE, USER_ROLE } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/SubmitButton";
import { Avatar, PageHeader, personName } from "@/components/ui";

export const metadata = { title: "Lidé" };

export default async function UsersPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({
    include: { memberships: { include: { band: true } }, accounts: { select: { provider: true } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Lidé" subtitle="Do kapel přidělujete členy na stránce konkrétní kapely." />

      <details className="card group p-0 sm:p-0">
        <summary className="flex cursor-pointer items-center gap-2 p-4 font-semibold text-brand">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft">
            <UserPlus className="h-4 w-4" />
          </span>
          Přidat uživatele
        </summary>
        <form action={inviteUser} className="grid gap-3 px-4 pb-4 sm:grid-cols-3 sm:items-end">
          <div>
            <label className="label">E-mail *</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label">Jméno</label>
            <input name="name" className="input" />
          </div>
          <div>
            <label className="label">Role</label>
            <select name="role" className="input">
              <option value="USER">Uživatel</option>
              <option value="ADMIN">Organizátor</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <SubmitButton>Přidat</SubmitButton>
          </div>
        </form>
      </details>

      <div className="list">
        {users.map((u) => {
          const linked = u.accounts.some((a) => a.provider === "google");
          return (
            <div key={u.id}>
              <div className="list-row items-start">
                <Avatar user={u} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{personName(u)}</span>
                    {u.role === "ADMIN" && <span className="badge bg-brand-soft text-brand">{USER_ROLE[u.role]}</span>}
                  </div>
                  <div className="truncate text-xs text-ink-3">
                    {u.email} · {linked ? "přihlášen přes Google" : "zatím se nepřihlásil"}
                  </div>
                  {u.memberships.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {u.memberships.map((m) => (
                        <Link key={m.id} href={`/bands/${m.bandId}`} className="chip">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.band.color }} />
                          {m.band.name} · {BAND_ROLE[m.role]}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {u.id !== admin.id && (
                <details className="group px-4 pb-3">
                  <summary className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand">
                    Upravit <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <form action={setUserRole.bind(null, u.id)} className="flex gap-2">
                      <select name="role" defaultValue={u.role} className="input min-h-[36px] py-1 text-xs">
                        <option value="USER">Uživatel</option>
                        <option value="ADMIN">Organizátor</option>
                      </select>
                      <SubmitButton className="btn-secondary btn-sm">Uložit</SubmitButton>
                    </form>
                    <form action={deleteUser.bind(null, u.id)}>
                      <SubmitButton className="btn-danger btn-sm" confirm={`Smazat uživatele ${u.email}?`}>
                        <Trash2 className="h-3.5 w-3.5" /> Smazat
                      </SubmitButton>
                    </form>
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
