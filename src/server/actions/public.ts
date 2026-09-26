"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { contactInput, publicRegistrationInput } from "@/lib/validation/schemas";
import { cancelByToken, parseOrFail, registerPublic, submitContact } from "../service/public";

export async function registerForEvent(
  raw: unknown,
): Promise<ActionResult<{ status: "REGISTERED" | "WAITLISTED"; emailSent: boolean }>> {
  const parsed = parseOrFail(publicRegistrationInput, raw);
  if (!parsed.ok) return parsed.result;
  return registerPublic(parsed.data);
}

export async function cancelRegistration(
  token: unknown,
): Promise<ActionResult<{ eventTitle: string }>> {
  const parsed = z.string().min(10).max(100).safeParse(token);
  if (!parsed.success) return { ok: false, error: "Ce lien d'annulation n'est plus valable." };
  return cancelByToken(parsed.data);
}

export async function sendContactMessage(raw: unknown): Promise<ActionResult<{ email: string }>> {
  const parsed = parseOrFail(contactInput, raw);
  if (!parsed.ok) return parsed.result;
  return submitContact(parsed.data);
}
