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
  const max = Math.max(1, ...poll.options.map((o) => o.votes.length));
  const canEdit = canManage || poll.createdById === userId;

  return (
    <div className="card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="font-bold">{poll.question}</div>
          <div className="text-xs text-slate-500">
            {personName(poll.createdBy)} · {voters.size} hlasujících
            {poll.multiple && " · více možností"}
            {poll.closed && " · uzavřeno"}
          </div>
        </div>
      </div>
      <form action={vote.bind(null, poll.id)} className="space-y-2">
        {poll.options.map((option) => {
          const mine = option.votes.some((v) => v.userId === userId);
          return (
            <label key={option.id} className="relative block overflow-hidden rounded-xl border border-slate-200 p-3">
              <span
                className="absolute inset-y-0 left-0 bg-brand-50"
                style={{ width: `${(option.votes.length / max) * 100}%` }}
                aria-hidden
              />
              <span className="relative flex items-center gap-3">
                {canVote && !poll.closed && (
                  <input
                    type={poll.multiple ? "checkbox" : "radio"}
                    name="optionId"
                    value={option.id}
                    defaultChecked={mine}
                    className="h-5 w-5 accent-brand-600"
                  />
                )}
                <span className="flex-1">
                  <span className={mine ? "font-semibold" : ""}>{option.text}</span>
                  {option.votes.length > 0 && (
                    <span className="block text-xs text-slate-500">{option.votes.map((v) => personName(v.user)).join(", ")}</span>
                  )}
                </span>
                <span className="text-sm font-bold text-brand-700">{option.votes.length}</span>
              </span>
            </label>
          );
        })}
        {canVote && !poll.closed && <SubmitButton className="btn-primary btn-sm">Hlasovat</SubmitButton>}
      </form>
      {canEdit && (
        <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
          <form action={togglePollClosed.bind(null, poll.id)}>
            <SubmitButton className="btn-secondary btn-sm">{poll.closed ? "Znovu otevřít" : "Uzavřít"}</SubmitButton>
          </form>
          <form action={deletePoll.bind(null, poll.id)}>
            <SubmitButton className="btn-danger btn-sm" confirm="Opravdu smazat anketu?">
              Smazat
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
