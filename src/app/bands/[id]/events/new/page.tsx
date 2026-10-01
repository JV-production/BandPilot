import { notFound } from "next/navigation";
import { createEvent } from "@/app/actions/events";
import { requireUser } from "@/lib/auth";
import { canManageBand, isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { EventForm } from "@/components/EventForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Nová akce" };

export default async function NewEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const band = await prisma.band.findUnique({ where: { id } });
  if (!band || !(await canManageBand(user, id))) notFound();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nová akce" subtitle={band.name} back={{ href: `/bands/${id}`, label: band.name }} />
      <EventForm action={createEvent.bind(null, id)} submitLabel="Vytvořit akci" showFee={isAdmin(user)} />
    </div>
  );
}
