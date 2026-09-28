import "server-only";
import type { ReactElement } from "react";
import { render, toPlainText } from "react-email";
import { Resend } from "resend";
import { env } from "../env";
import { AdminEmail, type AdminEmailProps } from "./templates";

let client: Resend | null = null;
function resend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  client ??= new Resend(env.RESEND_API_KEY);
  return client;
}

export async function sendMail(
  to: string,
  subject: string,
  element: ReactElement,
): Promise<boolean> {
  const html = await render(element);
  const text = toPlainText(html);
  const r = resend();
  if (!r) {
    console.info(
      `\n[e-mail non envoyé : RESEND_API_KEY absente]\nÀ : ${to}\nObjet : ${subject}\n${text}\n`,
    );
    return false;
  }
  const { error } = await r.emails.send({ from: env.MAIL_FROM, to, subject, html, text });
  if (error) {
    console.error("[mail]", error);
    return false;
  }
  return true;
}

// ADMIN_NOTIFY_EMAIL, ou à défaut le mail du compte admin
async function adminRecipient(): Promise<string | null> {
  if (env.ADMIN_NOTIFY_EMAIL) return env.ADMIN_NOTIFY_EMAIL;
  const { db } = await import("../db");
  const admin = await db.adminUser.findFirst({ select: { email: true } });
  return admin?.email ?? null;
}

export async function notifyAdmin(subject: string, props: AdminEmailProps): Promise<boolean> {
  const to = await adminRecipient();
  if (!to) return false;
  return sendMail(to, subject, AdminEmail(props));
}

export function siteUrl(path = ""): string {
  return `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}${path}`;
}
