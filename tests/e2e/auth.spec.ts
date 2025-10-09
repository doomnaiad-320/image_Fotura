import { test, expect } from "@playwright/test";

const USER_EMAIL = process.env.E2E_USER_EMAIL ?? "user@aigc.studio";
const USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? "User123!@#";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@aigc.studio";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin123!@#";

async function login(page, email: string, password: string) {
  await page.goto("/auth/signin");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL("/**", { waitUntil: "networkidle" });
}

test("user can login and view credits", async ({ page }) => {
  await login(page, USER_EMAIL, USER_PASSWORD);
  await expect(page.getByText("Credits", { exact: false })).toBeVisible();
});

test("admin can access provider console", async ({ page }) => {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto("/admin/ai");
  await expect(page.getByRole("heading", { name: "AI Provider 管理" })).toBeVisible();
});
