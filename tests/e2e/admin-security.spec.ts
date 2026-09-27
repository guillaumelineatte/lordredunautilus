import { expect, test } from "@playwright/test";

test("cron protégé par secret", async ({ request }) => {
  const denied = await request.get("/api/cron/quotidien", { headers: { authorization: "" } });
  expect(denied.status()).toBe(401);
  const ok = await request.get("/api/cron/quotidien", {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expect(ok.status()).toBe(200);
  const body = (await ok.json()) as { ok: boolean; results: Record<string, unknown> };
  expect(body.ok).toBe(true);
  expect(Object.keys(body.results)).toEqual(["adhesions", "evenements", "conservation", "digest"]);
});

test("les routes admin refusent une requête sans session", async ({ playwright }) => {
  const anonymous = await playwright.request.newContext({
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    storageState: { cookies: [], origins: [] },
  });
  // Sans cookie d'accès : 404 (le proxy ne laisse même pas deviner que la route existe)
  expect((await anonymous.get("/api/admin/export/adherents")).status()).toBe(404);
  expect((await anonymous.get("/api/admin/pdf/registre")).status()).toBe(404);
  await anonymous.dispose();
});

test("registre des traitements et documents", async ({ page, request }) => {
  await page.goto("/admin/registre");
  await expect(page.getByRole("heading", { name: /Gestion des adhérents/ })).toBeVisible();
  const pdf = await request.get("/api/admin/pdf/autorisation-parentale");
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
});
