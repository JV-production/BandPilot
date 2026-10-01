import Link from "next/link";
import { deleteUser, inviteUser, setUserRole } from "@/app/actions/users";
import { requireAdmin } from "@/lib/auth";
import { BAND_ROLE, USER_ROLE } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader, personName } from "@/components/ui";

export const metadata = { title: "Uživatelé" };

export default async function UsersPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({
    include: { memberships: { include: { band: true } }, accounts: { select: { provider: true } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Uživatelé a přístupy" subtitle="Do kapel přidělujete členy na stránce konkrétní kapely." />

      <form action={inviteUser} className="card grid gap-3 sm:grid-cols-4 sm:items-end">
        <div className="sm:col-span-2">
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
        <div className="sm:col-span-4">
          <SubmitButton>Přidat uživatele</SubmitButton>
        </div>
      </form>

      <div className="card divide-y divide-slate-100 p-0 sm:p-0">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="font-semibold">
                {personName(u)} <span className="text-xs font-normal text-slate-500">{u.email}</span>
              </div>
              <div className="text-xs text-slate-500">
                {USER_ROLE[u.role]} · {u.accounts.some((a) => a.provider === "google") ? "propojeno s Googlem" : "zatím se nepřihlásil"}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {u.memberships.map((m) => (
                  <Link key={m.id} href={`/bands/${m.bandId}`} className="badge bg-slate-100 text-slate-700">
                    {m.band.name} · {BAND_ROLE[m.role]}
                  </Link>
                ))}
              </div>
            </div>
            {u.id !== admin.id && (
              <div className="flex gap-2">
                <form action={setUserRole.bind(null, u.id)} className="flex gap-2">
                  <select name="role" defaultValue={u.role} className="input min-h-[36px] py-1 text-xs">
                    <option value="USER">Uživatel</option>
                    <option value="ADMIN">Organizátor</option>
                  </select>
                  <SubmitButton className="btn-secondary btn-sm">Uložit</SubmitButton>
                </form>
                <form action={deleteUser.bind(null, u.id)}>
                  <SubmitButton className="btn-danger btn-sm" confirm={`Smazat uživatele ${u.email}?`}>✕</SubmitButton>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
