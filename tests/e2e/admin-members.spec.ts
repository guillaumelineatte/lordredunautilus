import { expect, test } from "@playwright/test";
import { acceptDialogs, run } from "./helpers";

test("adhérent : création, adhésion, renouvellement, carte PDF, anonymisation", async ({
  page,
  request,
}) => {
  acceptDialogs(page);
  const firstName = `Ondine${run}`;

  await page.goto("/admin/adherents/nouveau");
  await page.getByLabel("Prénom").fill(firstName);
  await page.getByLabel("Nom", { exact: true }).fill("Testeuse");
  await page.getByLabel("Année de naissance").fill("1998");
  await page.getByLabel("Ajouter un jeu").selectOption({ label: "Yu-Gi-Oh!" });

  // Identifiant invalide : refusé par la regex du jeu
  await page.getByLabel("Konami ID").fill("123");
  await expect(page.getByText("Format attendu : 0123456789.")).toBeVisible();
  await page.getByLabel("Konami ID").fill(String(Date.now()).slice(-10));

  await page.getByRole("button", { name: "Créer l'adhérent" }).click();
  await expect(page.getByRole("heading", { name: `${firstName} Testeuse` })).toBeVisible();

  // Enregistrer une adhésion
  await page.getByLabel("Référence PayPal (facultatif)").first().fill(`E2E${run}`);
  await page.getByRole("button", { name: "Enregistrer l'adhésion" }).click();
  await expect(page.getByText("en cours", { exact: true })).toBeVisible();

  // Renouveler : nouvelle adhésion chaînée
  await page.locator("summary", { hasText: "Renouveler" }).click();
  await page.getByRole("button", { name: "Renouveler", exact: true }).click();
  await expect(page.getByText("renouvelée", { exact: true })).toBeVisible();

  // Carte de membre PDF
  const memberId = page.url().split("/").pop() ?? "";
  const pdf = await request.get(`/api/admin/pdf/carte?adherent=${memberId}`);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");

  // Supprimer et anonymiser
  await page.getByRole("button", { name: "Supprimer et anonymiser" }).click();
  await expect(page).toHaveURL(/\/admin\/adherents$/);
  await page.goto(`/admin/adherents?q=${firstName}`);
  await expect(page.getByText("Aucun adhérent ne correspond")).toBeVisible();

  // La fiche anonymisée ne garde que la comptabilité
  await page.goto(`/admin/adherents/${memberId}`);
  await expect(page.getByRole("heading", { name: "Ancien membre" })).toBeVisible();

  // Le journal a tracé l'anonymisation sans le nom
  await page.goto("/admin/journal?action=ANONYMIZE");
  await expect(page.locator("table").getByText("Anonymisation").first()).toBeVisible();
  await expect(page.getByText(firstName)).toHaveCount(0);
});

test("export CSV des adhérents tracé dans le journal", async ({ page, request }) => {
  const csv = await request.get("/api/admin/export/adherents");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("Nom;Prénom");
  await page.goto("/admin/journal?action=EXPORT");
  await expect(page.locator("table").getByText("Export", { exact: true }).first()).toBeVisible();
});
