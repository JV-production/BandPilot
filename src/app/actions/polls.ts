"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { requiredStr } from "@/lib/form";
import { canManageBand, getMembership, isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function revalidatePoll(bandId: string, eventId: string | null) {
  revalidatePath(`/bands/${bandId}`);
  if (eventId) revalidatePath(`/events/${eventId}`);
}

/** Anketu může založit kterýkoli člen kapely. */
export async function createPoll(bandId: string, eventId: string | null, formData: FormData) {
  const user = await requireUser();
  if (!isAdmin(user) && !(await getMembership(user, bandId))) throw new Error("Nejste členem kapely.");
  const options = (formData.get("options") as string | null ?? "")
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
  if (options.length < 2) throw new Error("Anketa potřebuje alespoň dvě možnosti (každou na nový řádek).");

  await prisma.poll.create({
    data: {
      bandId,
      eventId,
      question: requiredStr(formData, "question", "Otázka"),
      multiple: formData.get("multiple") === "on",
      createdById: user.id,
      options: { create: options.map((text, i) => ({ text, sortOrder: i })) },
    },
  });
  revalidatePoll(bandId, eventId);
}

export async function vote(pollId: string, formData: FormData) {
  const user = await requireUser();
  const poll = await prisma.poll.findUnique({ where: { id: pollId }, include: { options: true } });
  if (!poll) throw new Error("Anketa neexistuje.");
  if (poll.closed) throw new Error("Anketa je uzavřená.");
  if (!(await getMembership(user, poll.bandId))) throw new Error("Hlasovat mohou jen členové kapely.");

  const validIds = new Set(poll.options.map((o) => o.id));
  const chosen = formData.getAll("optionId").map(String).filter((id) => validIds.has(id));
  const selected = poll.multiple ? chosen : chosen.slice(0, 1);

  await prisma.$transaction([
    prisma.pollVote.deleteMany({ where: { userId: user.id, option: { pollId } } }),
    ...selected.map((optionId) => prisma.pollVote.create({ data: { optionId, userId: user.id } })),
  ]);
  revalidatePoll(poll.bandId, poll.eventId);
}

export async function togglePollClosed(pollId: string) {
  const user = await requireUser();
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll) return;
  if (poll.createdById !== user.id && !(await canManageBand(user, poll.bandId))) {
    throw new Error("Anketu může uzavřít jen autor nebo vedoucí.");
  }
  await prisma.poll.update({ where: { id: pollId }, data: { closed: !poll.closed } });
  revalidatePoll(poll.bandId, poll.eventId);
}

export async function deletePoll(pollId: string) {
  const user = await requireUser();
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll) return;
  if (poll.createdById !== user.id && !(await canManageBand(user, poll.bandId))) {
    throw new Error("Anketu může smazat jen autor nebo vedoucí.");
  }
  await prisma.poll.delete({ where: { id: pollId } });
  revalidatePoll(poll.bandId, poll.eventId);
}
