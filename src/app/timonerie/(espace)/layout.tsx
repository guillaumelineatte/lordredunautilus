import { AdminShell } from "@/components/admin/shell";
import { requireAdminPage } from "@/server/auth/session";
import { unreadMessagesCount } from "@/server/queries/admin";

export const dynamic = "force-dynamic";

export default async function AdminAreaLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  const unread = await unreadMessagesCount();
  return <AdminShell unread={unread}>{children}</AdminShell>;
}
