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

test("playground shows redesigned image workspace", async ({ page }) => {
  await login(page, USER_EMAIL, USER_PASSWORD);
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "创作工作台" })).toBeVisible();
  await expect(page.getByText("生成模式", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "文生图" })).toBeVisible();
  await expect(page.getByRole("button", { name: "图生图" })).toBeVisible();
  await expect(page.getByText("图片比例", { exact: false })).toBeVisible();
  await expect(page.getByText("图像尺寸", { exact: false })).toBeVisible();
  await page.getByPlaceholder("描述你想要生成的画面").fill("一只在月球上的猫");
  await page.getByRole("button", { name: "图生图" }).click();
  await expect(page.getByText("参考图片", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "重绘图像" })).toBeDisabled();
  await page.getByRole("button", { name: "文生图" }).click();
  await expect(page.getByRole("button", { name: "生成图像" })).toBeEnabled();
});
