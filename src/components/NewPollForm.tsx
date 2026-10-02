import { Plus } from "lucide-react";
import { createPoll } from "@/app/actions/polls";
import { SubmitButton } from "./SubmitButton";

export function NewPollForm({ bandId, eventId }: { bandId: string; eventId: string | null }) {
  return (
    <details className="card group p-0 sm:p-0">
      <summary className="flex cursor-pointer items-center gap-2 p-4 font-semibold text-brand">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft">
          <Plus className="h-4 w-4 transition group-open:rotate-45" />
        </span>
        Nová anketa
      </summary>
      <form action={createPoll.bind(null, bandId, eventId)} className="space-y-3 px-4 pb-4">
        <div>
          <label className="label">Otázka</label>
          <input name="question" required className="input" placeholder="Např. Jaké tričko na koncert?" />
        </div>
        <div>
          <label className="label">Možnosti (každá na nový řádek)</label>
          <textarea name="options" required rows={4} className="input" placeholder={"Černé\nBílé"} />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" name="multiple" className="h-5 w-5 accent-[rgb(var(--brand))]" /> Povolit více odpovědí
        </label>
        <SubmitButton>Vytvořit anketu</SubmitButton>
      </form>
    </details>
  );
}
