import { Check, Lock, LockOpen, Trash2 } from "lucide-react";
import { deletePoll, togglePollClosed, vote } from "@/app/actions/polls";
import { SubmitButton } from "./SubmitButton";
import { personName } from "./ui";

export type PollWithVotes = {
  id: string;
  question: string;
  multiple: boolean;
  closed: boolean;
  createdById: string;
  createdBy: { name: string | null; email: string };
  options: { id: string; text: string; votes: { userId: string; user: { name: string | null; email: string } }[] }[];
};

export function PollCard({ poll, userId, canManage, canVote }: { poll: PollWithVotes; userId: string; canManage: boolean; canVote: boolean }) {
  const voters = new Set(poll.options.flatMap((o) => o.votes.map((v) => v.userId)));
  const total = Math.max(1, voters.size);
  const canEdit = canManage || poll.createdById === userId;
  const open = canVote && !poll.closed;

  return (
    <div className="card">
      <div className="mb-3">
        <div className="text-[17px] font-bold leading-snug">{poll.question}</div>
        <div className="mt-0.5 text-xs text-ink-3">
          {personName(poll.createdBy)} · {voters.size} hlasujících
          {poll.multiple && " · více možností"}
          {poll.closed && " · uzavřeno"}
        </div>
      </div>
      <form action={vote.bind(null, poll.id)} className="space-y-2">
        {poll.options.map((option) => {
          const mine = option.votes.some((v) => v.userId === userId);
          const pct = Math.round((option.votes.length / total) * 100);
          return (
            <label
              key={option.id}
              className={`relative block cursor-pointer overflow-hidden rounded-2xl border p-3 transition has-[:checked]:border-brand ${
                mine ? "border-brand/60" : "border-line"
              }`}
            >
              <span className="absolute inset-y-0 left-0 bg-brand-soft transition-all" style={{ width: `${pct}%` }} aria-hidden />
              <span className="relative flex items-center gap-3">
                {open && (
                  <input
                    type={poll.multiple ? "checkbox" : "radio"}
                    name="optionId"
                    value={option.id}
                    defaultChecked={mine}
                    className="h-5 w-5 accent-[rgb(var(--brand))]"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-semibold">
                    {option.text}
                    {mine && <Check className="h-4 w-4 text-brand" />}
                  </span>
                  {option.votes.length > 0 && (
                    <span className="block truncate text-xs text-ink-2">{option.votes.map((v) => personName(v.user)).join(", ")}</span>
                  )}
                </span>
                <span className="text-sm font-bold tabular-nums text-brand">{pct}%</span>
              </span>
            </label>
          );
        })}
        {open && <SubmitButton className="btn-primary btn-sm mt-1">Hlasovat</SubmitButton>}
      </form>
      {canEdit && (
        <div className="mt-3 flex gap-2 border-t border-line/70 pt-3">
          <form action={togglePollClosed.bind(null, poll.id)}>
            <SubmitButton className="btn-secondary btn-sm">
              {poll.closed ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {poll.closed ? "Otevřít" : "Uzavřít"}
            </SubmitButton>
          </form>
          <form action={deletePoll.bind(null, poll.id)}>
            <SubmitButton className="btn-danger btn-sm" confirm="Opravdu smazat anketu?">
              <Trash2 className="h-3.5 w-3.5" /> Smazat
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}

export const pollInclude = {
  createdBy: true,
  options: { orderBy: { sortOrder: "asc" as const }, include: { votes: { include: { user: true } } } },
};
