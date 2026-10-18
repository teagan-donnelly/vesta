import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
const base = process.env.DEMO_BASE_URL || "http://localhost:3002";
const phase = process.env.VISUAL_PHASE || "after";
async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" });
  await context.addInitScript(() => {
    if (!localStorage.getItem("vesta.profile.v1")) localStorage.setItem("vesta.profile.v1", JSON.stringify({ mode: "demo", customer: "demo:kevin" }));
  });
  const page = await context.newPage();
  const directory = join(process.cwd(), ".tmp", "visual-refinement", phase);
  await mkdir(directory, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  try {
    for (const [name, path, ready] of [["home", "/", ".welcome-banner"], ["shared", "/shared", ".shared-key-figures"], ["assistant", "/assistant", ".assistant-context"], ["domino", "/domino", ".mini-metrics"]]) {
      await page.goto(base + path);
      await expect(page.locator(ready)).toBeVisible();
      if (phase !== "before" && name === "domino") {
        await page.getByRole("button", { name: "Preview this option", exact: true }).first().click();
        await expect(page.getByRole("region", { name: "Scenario outcome comparison" })).toContainText("$130.00");
        await expect(page.getByRole("region", { name: "Scenario outcome comparison" })).toContainText("+$330.00");
      }
      await page.screenshot({ path: join(directory, `${name}-1440.png`), fullPage: true });
      if (phase !== "before" && name === "home") {
        await expect(page.getByRole("combobox", { name: "History date range" })).toHaveValue("30");
        await page.locator(".home-history-chart").hover({ position: { x: 220, y: 150 } });
        await expect(page.locator(".chart-tooltip")).toBeVisible();
        for (const days of ["7", "60", "30"]) {
          await page.getByRole("combobox", { name: "History date range" }).selectOption(days);
          await expect(page.getByRole("img", { name: /Historical daily closing balances/ })).toBeVisible();
        }
        await page.getByRole("button", { name: "Expenses", exact: true }).click();
        await expect(page.getByRole("img", { name: /Daily spending by category/ })).toBeVisible();
        await page.locator(".home-history-chart").hover({ position: { x: 220, y: 150 } });
        await expect(page.locator(".chart-tooltip")).toContainText("Total spent");
        await page.screenshot({ path: join(directory, "expenses-1440.png"), fullPage: true });
      }
    }
    expect(errors).toEqual([]);
    console.log(`Captured ${phase} Home, Shared Finances, Ask Vesta and Domino at 1440px: ${directory}`);
  } finally { await browser.close(); }
}
void main().catch(e => { console.error(e instanceof Error ? e.message : "Visual capture failed."); process.exitCode = 1; });
