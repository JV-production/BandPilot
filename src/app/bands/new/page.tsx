import { createBand } from "@/app/actions/bands";
import { requireAdmin } from "@/lib/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Nová kapela" };

export default async function NewBandPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Nová kapela" back={{ href: "/bands", label: "Kapely" }} />
      <form action={createBand} className="card space-y-4">
        <div>
          <label className="label" htmlFor="name">Název *</label>
          <input id="name" name="name" required className="input" placeholder="např. Rocková Smršť" />
        </div>
        <div>
          <label className="label" htmlFor="description">Popis</label>
          <textarea id="description" name="description" rows={3} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="color">Barva kapely</label>
          <input id="color" name="color" type="color" defaultValue="#E0680F" className="h-12 w-20 cursor-pointer rounded-xl border border-line bg-surface p-1" />
        </div>
        <SubmitButton className="btn-primary w-full">Vytvořit kapelu</SubmitButton>
      </form>
    </div>
  );
}
