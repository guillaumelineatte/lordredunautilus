import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { acceptDialogs, run } from "./helpers";

test("galerie : upload, publication directe, suppression", async ({ page }) => {
  acceptDialogs(page);
  const png = await sharp({
    create: { width: 800, height: 600, channels: 3, background: "#2A4A6B" },
  })
    .png()
    .toBuffer();
  const alt = `Photo de test ${run}`;

  await page.goto("/timonerie/galerie");
  const before = await page.locator("ul li.card").count();
  await page
    .locator("input[type=file]")
    .setInputFiles({ name: `test-${run}.png`, mimeType: "image/png", buffer: png });
  await expect(page.getByText("photo(s) ajoutée(s) en brouillon")).toBeVisible();
  await expect(page.locator("ul li.card")).toHaveCount(before + 1);

  // l'admin publie direct, sans vérif
  const card = page.locator("ul li.card").last();
  await expect(card.getByRole("button", { name: "Publier" })).toBeEnabled();
  await card.getByRole("button", { name: "Modifier" }).click();
  await page.getByLabel(/Texte alternatif/).fill(alt);
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByText("Photo enregistrée.")).toBeVisible();

  await page.locator("ul li.card").last().getByRole("button", { name: "Publier" }).click();
  await expect(page.locator("ul li.card").last().getByText("publiée")).toBeVisible();

  await page.goto("/galerie");
  await expect(page.getByRole("img", { name: alt })).toBeVisible();

  await page.goto("/timonerie/galerie");
  await page.locator("ul li.card").last().getByRole("button", { name: "Supprimer" }).click();
  await expect(page.locator("ul li.card")).toHaveCount(before);
});
