import { test, expect } from "@playwright/test";

const USER_EMAIL = process.env.E2E_USER_EMAIL ?? "user@aigc.studio";
const USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? "User123!@#";

async function login(page, email: string, password: string) {
  await page.goto("/auth/signin");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL("/**", { waitUntil: "networkidle" });
}

test("playground allows selecting model and submitting prompt", async ({ page }) => {
  await login(page, USER_EMAIL, USER_PASSWORD);
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "创作工作台" })).toBeVisible();
  await page.getByPlaceholder("输入你的问题或提示词").fill("写一条欢迎语");
  await page.getByRole("button", { name: "发送对话" }).click();
  await expect(page.getByText("AI", { exact: false })).toBeVisible();
});
