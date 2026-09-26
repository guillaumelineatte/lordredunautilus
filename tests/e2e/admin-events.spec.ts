import { expect, test } from "@playwright/test";
import { acceptDialogs, inDays, run } from "./helpers";

test("événement : publication, inscriptions publiques, liste d'attente, promotion, émargement", async ({
  page,
  browser,
  request,
}) => {
  acceptDialogs(page);
  const title = `Draft E2E ${run}`;

  await page.goto("/admin/evenements/nouveau");
  await page.getByLabel("Titre").fill(title);
  await page.getByLabel("Type").selectOption("DRAFT");
  await page.getByLabel("Date", { exact: true }).fill(inDays(20));
  await page.getByLabel("Début").fill("19:30");
  await page.getByLabel("Places", { exact: true }).fill("1");
  await page.getByLabel("Statut").selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Créer l'événement" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const eventId = page.url().split("/").pop() ?? "";
  const publicHref = await page
    .getByRole("link", { name: "Voir sur le site ↗" })
    .getAttribute("href");
  expect(publicHref).toBeTruthy();

  // Deux visiteurs s'inscrivent : le second passe en liste d'attente
  const visitor = await browser.newContext();
  const v = await visitor.newPage();
  await v.goto(publicHref ?? "/");
  await v.getByLabel("Prénom").fill("Alice");
  await v.getByLabel("Nom", { exact: true }).fill(`Premiere${run}`);
  await v.getByRole("button", { name: "Réserver ma place" }).click();
  await expect(v.getByText("C'est noté, à bientôt !")).toBeVisible();

  await v.goto(publicHref ?? "/");
  await v.getByLabel("Prénom").fill("Bruno");
  await v.getByLabel("Nom", { exact: true }).fill(`Second${run}`);
  await v.getByLabel("Je suis mineur").check();
  await expect(v.getByText("Un adulte doit t'accompagner")).toBeVisible();
  await v.getByRole("button", { name: /M'inscrire en liste d'attente|Réserver ma place/ }).click();
  await expect(v.getByText("Vous êtes sur liste d'attente")).toBeVisible();

  // Anti-doublon nom + prénom
  await v.goto(publicHref ?? "/");
  await v.getByLabel("Prénom").fill("alice");
  await v.getByLabel("Nom", { exact: true }).fill(`PREMIERE${run}`);
  await v.getByRole("button", { name: /M'inscrire en liste d'attente|Réserver ma place/ }).click();
  await expect(v.getByText("Une inscription existe déjà à ce nom")).toBeVisible();
  await visitor.close();

  // Côté admin : promotion impossible tant que c'est complet
  await page.reload();
  await expect(page.getByText(`Premiere${run} Alice`)).toBeVisible();
  await page.getByRole("button", { name: "Promouvoir" }).click();
  await expect(page.getByText("L'événement est complet").first()).toBeVisible();

  // Annulation de la première inscription, puis promotion
  await page.getByRole("button", { name: "Annuler", exact: true }).first().click();
  await expect(page.getByText("Absents et annulations (1)")).toBeVisible();
  await page.getByRole("button", { name: "Promouvoir" }).click();
  await expect(page.getByText("Participant promu.")).toBeVisible();

  // Pointage présent
  await page.getByRole("button", { name: "Présent" }).first().click();
  await expect(page.getByText("Présent", { exact: true }).first()).toBeVisible();

  // Feuille d'émargement
  const pdf = await request.get(`/api/admin/pdf/emargement?evenement=${eventId}`);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");

  // Duplication en brouillon, puis corbeille de l'original
  await page.getByRole("button", { name: "Dupliquer" }).click();
  await expect(page.getByText("Copie créée en brouillon")).toBeVisible();
  await page.getByRole("button", { name: "Corbeille" }).click();
  await expect(page).toHaveURL(/\/admin\/evenements$/);
});

test("soirée libre : pas de formulaire d'inscription", async ({ page }) => {
  await page.goto("/evenements?type=libre");
  const first = page.locator(".event .info h3 a").first();
  await first.click();
  await expect(page.getByRole("heading", { name: "Pas besoin de s'inscrire" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Réserver ma place" })).toHaveCount(0);
});
