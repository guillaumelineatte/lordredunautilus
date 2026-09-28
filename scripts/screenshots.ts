// Captures pour le guide d'utilisation (docs/captures), faites sur les données de démo.
// Lancer le serveur avant (npm run dev), puis :
//   npx tsx scripts/screenshots.ts
import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "@playwright/test";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3001";
const out = "docs/captures";

async function shot(page: Page, name: string, path: string, full = false) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  // on masque les blocs <code> pour qu'aucun secret ne traîne sur une capture
  await page.screenshot({
    path: `${out}/${name}.jpg`,
    type: "jpeg",
    quality: 78,
    fullPage: full,
    mask: [page.locator("code")],
    maskColor: "#243D5A",
  });
  console.log(`✔ ${name}`);
}

async function main() {
  await mkdir(out, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    locale: "fr-FR",
  });
  const page = await context.newPage();

  await shot(page, "site-accueil", "/");
  await shot(page, "site-agenda", "/evenements");
  await shot(page, "site-adherer", "/adherer", true);

  await page.goto(`${base}/timonerie/connexion`);
  await page.screenshot({ path: `${out}/admin-connexion.jpg`, type: "jpeg", quality: 78 });
  await page.getByLabel("Identifiant (e-mail)").fill(process.env.ADMIN_EMAIL ?? "");
  await page.getByLabel("Mot de passe").fill(process.env.ADMIN_INITIAL_PASSWORD ?? "");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(`${base}/timonerie`);

  await shot(page, "admin-tableau-de-bord", "/timonerie", true);
  await shot(page, "admin-adherents", "/timonerie/adherents");
  const memberHref = await page
    .locator("table a[href^='/timonerie/adherents/c']")
    .first()
    .getAttribute("href");
  if (memberHref) await shot(page, "admin-fiche-adherent", memberHref, true);
  await shot(page, "admin-evenements", "/timonerie/evenements");
  const eventHref = await page
    .locator("table a[href^='/timonerie/evenements/c']")
    .nth(1)
    .getAttribute("href");
  if (eventHref) await shot(page, "admin-inscrits", eventHref);
  await shot(page, "admin-galerie", "/timonerie/galerie");
  await shot(page, "admin-reglages", "/timonerie/contenus/reglages");
  await shot(page, "admin-documents", "/timonerie/documents");
  await shot(page, "admin-messages", "/timonerie/messages");
  await shot(page, "admin-journal", "/timonerie/journal");
  await shot(page, "admin-compte", "/timonerie/compte");

  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
