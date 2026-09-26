import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { run } from "./helpers";

test("l'administration redirige vers la connexion", async ({ page }) => {
  await page.goto("/admin/adherents");
  await expect(page).toHaveURL(/\/admin\/connexion/);
  await page
    .getByLabel("Identifiant (e-mail)")
    .fill(process.env.ADMIN_EMAIL ?? "admin@ordredunautilus.fr");
  await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("Identifiant ou mot de passe incorrect.")).toBeVisible();
});

test("accueil alimenté par la base", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Ce qu'on joue, et quand." })).toBeVisible();
  await expect(page.locator("#games .game")).not.toHaveCount(0);
  await expect(page.locator("#eventlist .event")).not.toHaveCount(0);
  await expect(page.locator(".plan")).toHaveCount(3);
  await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
});

test("formulaire de contact → boîte de réception", async ({ page }) => {
  await page.goto("/#contact");
  await page.getByLabel("Prénom").fill("Visiteur");
  await page.getByLabel("E-mail").fill(`visiteur.${run}@example.com`);
  await page.getByLabel("Votre message").fill(`Bonjour, message de test ${run}.`);
  await page.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(page.getByText("Message envoyé")).toBeVisible();
});

test("page adhérer : marche à suivre PayPal, aucun paiement intégré", async ({ page }) => {
  await page.goto("/adherer");
  await expect(page.getByRole("heading", { name: "Trois étapes, et c'est réglé." })).toBeVisible();
  await expect(page.getByText("Ni adresse, ni téléphone, ni e-mail")).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
});

test("pages légales et SEO", async ({ page, request }) => {
  await page.goto("/confidentialite");
  await expect(page.getByRole("heading", { name: "Vos droits" })).toBeVisible();
  await expect(page.getByText("aucun cookie de suivi")).toBeVisible();
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain("/evenements/");
});

for (const path of ["/", "/evenements", "/adherer", "/confidentialite"]) {
  test(`accessibilité AA : ${path}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .exclude("#sea")
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(
      serious.map(
        (v) =>
          `${v.id} : ${v.nodes
            .map((n) => n.target.join(" "))
            .slice(0, 3)
            .join(", ")}`,
      ),
    ).toEqual([]);
  });
}
