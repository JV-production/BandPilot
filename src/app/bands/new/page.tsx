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
          <input id="name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="description">Popis</label>
          <textarea id="description" name="description" rows={3} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="color">Barva</label>
          <input id="color" name="color" type="color" defaultValue="#6366f1" className="h-11 w-20 rounded-lg border border-slate-300" />
        </div>
        <SubmitButton>Vytvořit kapelu</SubmitButton>
      </form>
    </div>
  );
}
