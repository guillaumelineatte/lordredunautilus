import { expect, test } from "@playwright/test";
import { acceptDialogs, inDays, run } from "./helpers";

test("adhérent : création, adhésion, renouvellement, carte PDF, anonymisation", async ({
  page,
  request,
}) => {
  acceptDialogs(page);
  const firstName = `Ondine${run}`;

  await page.goto("/timonerie/adherents/nouveau");
  await page.getByLabel("Prénom").fill(firstName);
  await page.getByLabel("Nom", { exact: true }).fill("Testeuse");
  await page.getByLabel("Ajouter un jeu").selectOption({ label: "Yu-Gi-Oh!" });

  // identifiant qui ne respecte pas la regex du jeu
  await page.getByLabel("Konami ID").fill("123");
  await expect(page.getByText("Format attendu : 0123456789.")).toBeVisible();
  await page.getByLabel("Konami ID").fill(String(Date.now()).slice(-10));

  await page.getByRole("button", { name: "Créer l'adhérent" }).click();
  await expect(page.getByRole("heading", { name: `${firstName} Testeuse` })).toBeVisible();
  await expect(page.getByText("Année de naissance")).toHaveCount(0);

  // adhésion
  await page.getByLabel("Référence PayPal (facultatif)").first().fill(`E2E${run}`);
  await page.getByRole("button", { name: "Enregistrer l'adhésion" }).click();
  await expect(page.getByText("en cours", { exact: true })).toBeVisible();

  // renouvellement
  await page.locator("summary", { hasText: "Renouveler" }).click();
  await page.getByRole("button", { name: "Renouveler", exact: true }).click();
  await expect(page.getByText("renouvelée", { exact: true })).toBeVisible();

  // carte de membre en PDF
  const memberId = page.url().split("/").pop() ?? "";
  const pdf = await request.get(`/api/timonerie/pdf/carte?adherent=${memberId}`);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");

  // suppression : la fiche a des adhésions donc elle est anonymisée
  await page.getByRole("button", { name: "Supprimer la fiche" }).click();
  await expect(page).toHaveURL(/\/timonerie\/adherents$/);
  await page.goto(`/timonerie/adherents?q=${firstName}`);
  await expect(page.getByText("Aucun adhérent ne correspond")).toBeVisible();

  // il ne reste que la compta
  await page.goto(`/timonerie/adherents/${memberId}`);
  await expect(page.getByRole("heading", { name: "Ancien membre" })).toBeVisible();

  // le journal a noté l'anonymisation, sans le nom
  await page.goto("/timonerie/journal?action=ANONYMIZE");
  await expect(page.locator("table").getByText("Anonymisation").first()).toBeVisible();
  await expect(page.getByText(firstName)).toHaveCount(0);
});

test("suppression depuis la liste : une fiche, puis une sélection", async ({ page }) => {
  acceptDialogs(page);
  const names = ["Alpha", "Beta", "Gamma"].map((n) => `${n}${run}`);
  for (const n of names) {
    await page.goto("/timonerie/adherents/nouveau");
    await page.getByLabel("Prénom").fill(n);
    await page.getByLabel("Nom", { exact: true }).fill("Suppression");
    await page.getByRole("button", { name: "Créer l'adhérent" }).click();
    await expect(page.getByRole("heading", { name: `${n} Suppression` })).toBeVisible();
  }

  await page.goto(`/timonerie/adherents?q=${run}`);
  await expect(page.locator("tbody tr")).toHaveCount(3);

  // une fiche depuis sa ligne (pas d'adhésion, donc effacée pour de bon)
  await page
    .getByRole("row", { name: new RegExp(names[0] ?? "") })
    .getByRole("button", { name: /Supprimer la fiche de/ })
    .click();
  await expect(page.getByText("Fiche supprimée.")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(2);

  // les deux autres avec la sélection
  await page.getByLabel("Tout sélectionner").check();
  await expect(page.getByText("2 fiche(s) sélectionnée(s)")).toBeVisible();
  await page.getByRole("button", { name: "Supprimer la sélection" }).click();
  await expect(page.getByText("2 fiche(s) supprimée(s).")).toBeVisible();
  await expect(page.getByText("Aucun adhérent ne correspond")).toBeVisible();

  // noté comme suppression dans le journal
  await page.goto("/timonerie/journal?action=DELETE&entite=Member");
  await expect(page.locator("table").getByText("Suppression").first()).toBeVisible();
});

test("modification : paramètres de la fiche, suspension et correction d'une adhésion", async ({
  page,
}) => {
  acceptDialogs(page);
  const firstName = `Modif${run}`;
  const card = `NAU-E2E-${run}`;

  await page.goto("/timonerie/adherents/nouveau");
  await page.getByLabel("Prénom").fill(firstName);
  await page.getByLabel("Nom", { exact: true }).fill("Avant");
  await page.getByRole("button", { name: "Créer l'adhérent" }).click();
  await expect(page.getByRole("heading", { name: `${firstName} Avant` })).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer l'adhésion" }).click();
  await expect(page.getByText("en cours", { exact: true })).toBeVisible();

  // on passe de la lecture à l'édition
  await expect(page.getByRole("heading", { name: "Paramètres de l'adhérent" })).toBeVisible();
  await page.getByRole("button", { name: "Modifier", exact: true }).click();
  const edit = page.getByRole("region", { name: "Modifier les paramètres" });
  await edit.getByLabel("Nom", { exact: true }).fill("Après");
  await edit.getByLabel("Numéro de carte").fill(card);
  await edit.getByLabel("Adhérent suspendu").check();
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await expect(page.getByText("Modifications enregistrées.")).toBeVisible();
  await expect(page.getByRole("heading", { name: `${firstName} Après` })).toBeVisible();
  await expect(page.getByText("Suspendu (réglé à la main)")).toBeVisible();

  // on lève la suspension, le statut est recalculé
  await page.getByRole("button", { name: "Modifier", exact: true }).click();
  await edit.getByLabel("Adhérent suspendu").uncheck();
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await expect(page.getByText("Actif (calculé d'après les adhésions)")).toBeVisible();

  // correction d'adhésion : dates incohérentes refusées, puis ok
  await page.getByRole("button", { name: /Modifier l'adhésion du/ }).click();
  await page.getByLabel("Fin", { exact: true }).fill("2020-01-01");
  await page.getByRole("button", { name: "Enregistrer l'adhésion" }).click();
  await expect(page.getByText("La fin doit être postérieure ou égale au début.")).toBeVisible();
  const end = inDays(100);
  await page.getByLabel("Fin", { exact: true }).fill(end);
  await page.getByRole("button", { name: "Enregistrer l'adhésion" }).click();
  await expect(page.getByText("Adhésion modifiée.")).toBeVisible();
  const [y, m, d] = end.split("-");
  await expect(page.getByText(`→ ${d}/${m}/${y}`)).toBeVisible();

  // numéro de carte déjà pris
  await page.goto("/timonerie/adherents/nouveau");
  await page.getByLabel("Prénom").fill(`Doublon${run}`);
  await page.getByLabel("Nom", { exact: true }).fill("Carte");
  await page.getByLabel("Numéro de carte").fill(card);
  await page.getByRole("button", { name: "Créer l'adhérent" }).click();
  await expect(page.getByText(`déjà attribué à ${firstName} Après`).first()).toBeVisible();

  // le crayon de la liste ouvre direct l'édition
  await page.goto(`/timonerie/adherents?q=${firstName}`);
  await page.getByRole("link", { name: /Modifier la fiche de/ }).click();
  await expect(page.getByRole("button", { name: "Enregistrer les modifications" })).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("heading", { name: "Paramètres de l'adhérent" })).toBeVisible();

  // ménage
  await page.getByRole("button", { name: "Supprimer la fiche" }).click();
  await expect(page).toHaveURL(/\/timonerie\/adherents$/);
});

test("export CSV des adhérents tracé dans le journal", async ({ page, request }) => {
  const csv = await request.get("/api/timonerie/export/adherents");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("Nom;Prénom");
  await page.goto("/timonerie/journal?action=EXPORT");
  await expect(page.locator("table").getByText("Export", { exact: true }).first()).toBeVisible();
});
