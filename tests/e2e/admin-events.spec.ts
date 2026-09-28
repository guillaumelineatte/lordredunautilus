import { expect, test } from "@playwright/test";
import { acceptDialogs, inDays, run } from "./helpers";

test("événement : publication, inscriptions publiques, liste d'attente, promotion, émargement", async ({
  page,
  browser,
  request,
}) => {
  acceptDialogs(page);
  const title = `Draft E2E ${run}`;

  await page.goto("/timonerie/evenements/nouveau");
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

  // deux inscrits, le 2e part en liste d'attente
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
  // plus de case mineur, juste le rappel pour tout le monde
  await expect(v.getByLabel("Je suis mineur")).toHaveCount(0);
  await expect(v.getByText("Un adulte doit t'accompagner")).toBeVisible();
  await v.getByRole("button", { name: /M'inscrire en liste d'attente|Réserver ma place/ }).click();
  await expect(v.getByText("Vous êtes sur liste d'attente")).toBeVisible();

  // même nom/prénom refusé
  await v.goto(publicHref ?? "/");
  await v.getByLabel("Prénom").fill("alice");
  await v.getByLabel("Nom", { exact: true }).fill(`PREMIERE${run}`);
  await v.getByRole("button", { name: /M'inscrire en liste d'attente|Réserver ma place/ }).click();
  await expect(v.getByText("Une inscription existe déjà à ce nom")).toBeVisible();
  await visitor.close();

  // côté admin, pas de promotion tant que c'est complet
  await page.reload();
  await expect(page.getByText(`Premiere${run} Alice`)).toBeVisible();
  await page.getByRole("button", { name: "Promouvoir" }).click();
  await expect(page.getByText("L'événement est complet").first()).toBeVisible();

  // on annule le premier puis on promeut
  await page.getByRole("button", { name: "Annuler", exact: true }).first().click();
  await expect(page.getByText("Absents et annulations (1)")).toBeVisible();
  await page.getByRole("button", { name: "Promouvoir" }).click();
  await expect(page.getByText("Participant promu.")).toBeVisible();

  // pointage
  await page.getByRole("button", { name: "Présent" }).first().click();
  await expect(page.getByText("Présent", { exact: true }).first()).toBeVisible();

  // feuille d'émargement
  const pdf = await request.get(`/api/timonerie/pdf/emargement?evenement=${eventId}`);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");

  // duplication en brouillon, puis l'original à la corbeille
  await page.getByRole("button", { name: "Dupliquer" }).click();
  await expect(page.getByText("Copie créée en brouillon")).toBeVisible();
  await page.getByRole("button", { name: "Corbeille" }).click();
  await expect(page).toHaveURL(/\/timonerie\/evenements$/);
});

test("soirée libre : pas de formulaire d'inscription", async ({ page }) => {
  await page.goto("/evenements?type=libre");
  const first = page.locator(".event .info h3 a").first();
  await first.click();
  await expect(page.getByRole("heading", { name: "Pas besoin de s'inscrire" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Réserver ma place" })).toHaveCount(0);
});
