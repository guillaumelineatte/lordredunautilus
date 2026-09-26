import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage() {
  if (await getAdminSession()) redirect("/admin");
  return (
    <main className="grid min-h-svh place-items-center bg-[radial-gradient(ellipse_80%_60%_at_50%_110%,#1E3A5A_0%,#132438_55%,#0C1826_100%)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 grid justify-items-center gap-4 text-center">
          <Image
            src="/logo.png"
            alt="Logo de L'Ordre du Nautilus"
            width={88}
            height={88}
            className="rounded-full"
            priority
          />
          <div>
            <p className="kicker">Administration</p>
            <h1 className="mt-1 text-3xl">L&apos;Ordre du Nautilus</h1>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
