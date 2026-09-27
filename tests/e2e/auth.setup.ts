import { expect, test as setup } from "@playwright/test";

setup("connexion de l'administrateur", async ({ page }) => {
  const email = process.env.ADMIN_EMAIL ?? "admin@ordredunautilus.fr";
  const password = process.env.ADMIN_INITIAL_PASSWORD ?? "";
  // Sans passer par l'adresse d'accès secrète, l'administration est introuvable.
  await page.goto(`/acces/${process.env.ADMIN_ACCESS_CODE}`);
  await expect(page).toHaveURL(/\/admin\/connexion$/);
  await page.getByLabel("Identifiant (e-mail)").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
  await page.context().storageState({ path: "tests/e2e/.auth/admin.json" });
});
