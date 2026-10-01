import { createPoll } from "@/app/actions/polls";
import { SubmitButton } from "./SubmitButton";

export function NewPollForm({ bandId, eventId }: { bandId: string; eventId: string | null }) {
  return (
    <details className="card">
      <summary className="cursor-pointer font-semibold text-brand-700">+ Nová anketa</summary>
      <form action={createPoll.bind(null, bandId, eventId)} className="mt-3 space-y-3">
        <div>
          <label className="label">Otázka</label>
          <input name="question" required className="input" placeholder="Např. Jaké tričko na koncert?" />
        </div>
        <div>
          <label className="label">Možnosti (každá na nový řádek)</label>
          <textarea name="options" required rows={4} className="input" placeholder={"Černé\nBílé"} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="multiple" className="h-5 w-5 accent-brand-600" /> Povolit více odpovědí
        </label>
        <SubmitButton>Vytvořit anketu</SubmitButton>
      </form>
    </details>
  );
}
