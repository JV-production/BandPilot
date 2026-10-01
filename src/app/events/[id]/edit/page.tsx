import { notFound } from "next/navigation";
import { updateEvent } from "@/app/actions/events";
import { requireUser } from "@/lib/auth";
import { canManageBand, isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { EventForm } from "@/components/EventForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Upravit akci" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id }, include: { band: true } });
  if (!event || !(await canManageBand(user, event.bandId))) notFound();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Upravit akci" subtitle={event.band.name} back={{ href: `/events/${id}`, label: event.title }} />
      <EventForm action={updateEvent.bind(null, id)} event={event} submitLabel="Uložit změny" showFee={isAdmin(user)} />
    </div>
  );
}
