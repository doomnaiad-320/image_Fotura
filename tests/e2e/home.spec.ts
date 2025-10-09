import { test, expect } from "@playwright/test";

test("homepage renders and filter interactions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "灵感瀑布" })).toBeVisible();
  await page.getByRole("button", { name: "图片" }).click();
  await page.getByRole("combobox").selectOption("new");
  await expect(page.getByText("加载更多")).toBeVisible();
});
