"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { oneOf, requiredStr, str } from "@/lib/form";
import { syncUpcomingForUser } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export async function inviteUser(formData: FormData) {
  await requireAdmin();
  const email = requiredStr(formData, "email", "E-mail").toLowerCase();
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: str(formData, "name"), role: oneOf(str(formData, "role"), ["ADMIN", "USER"], "USER") },
  });
  revalidatePath("/admin/users");
}

export async function setUserRole(userId: string, formData: FormData) {
  const admin = await requireAdmin();
  if (admin.id === userId) throw new Error("Svou vlastní roli změnit nemůžete.");
  await prisma.user.update({
    where: { id: userId },
    data: { role: oneOf(str(formData, "role"), ["ADMIN", "USER"], "USER") },
  });
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) throw new Error("Sami sebe smazat nemůžete.");
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const calendarSync = formData.get("calendarSync") === "on";
  await prisma.user.update({
    where: { id: user.id },
    data: { name: str(formData, "name"), phone: str(formData, "phone"), calendarSync },
  });
  if (calendarSync && !user.calendarSync) after(() => syncUpcomingForUser(user.id));
  revalidatePath("/settings");
}

export async function resyncMyCalendar() {
  const user = await requireUser();
  await syncUpcomingForUser(user.id);
  revalidatePath("/settings");
}

export async function regenerateCalendarToken() {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { calendarToken: crypto.randomUUID() } });
  revalidatePath("/settings");
}
