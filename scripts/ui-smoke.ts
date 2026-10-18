// Headless, isolated browser session. Only browser-local fictional
// planning is written. No bank or Backboard writes.
import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { todayIso } from "../lib/analysis";
const base = process.env.DEMO_BASE_URL || "http://localhost:3002";
async function main() {
  const directory = join(process.cwd(), ".tmp", "ui-verification");
  await mkdir(directory, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1536, height: 1100 },
    reducedMotion: "reduce",
  });
  const errors: string[] = [];
  const page = await context.newPage();
  page.on("pageerror", (error) =>
    errors.push(
      `${new URL(page.url()).pathname}${new URL(page.url()).search}: ${error.message}`,
    ),
  );
  await context.addInitScript(() => {
    localStorage.setItem(
      "vesta.profile.v1",
      JSON.stringify({ mode: "demo", customer: "demo:kevin" }),
    );
  });
  const storage = await context.request.post(`${base}/api/planning-storage`, {
    headers: { origin: base },
    data: { store: "local", confirmed: true },
  });
  expect(storage.status()).toBe(200);
  try {
    await page.goto(base);
    await expect(
      page.getByRole("heading", { name: /Good to see you, Kevin/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Upcoming financial risk" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Shared obligations and saved scenarios are not included yet",
        { exact: false },
      ),
    ).toHaveCount(0);
    await page.screenshot({
      path: join(directory, "home-desktop.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Balance", exact: true }).click();
    await expect(page.getByRole("img", { name: /Historical daily closing balances/ })).toBeVisible();
    await page.getByRole("button", { name: "Expenses", exact: true }).click();
    await page.goto(`${base}/transactions`);
    await page
      .getByRole("button", { name: "Add transaction", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Name", { exact: true })
      .fill("Browser QA groceries");
    await dialog
      .getByLabel("Amount (USD; negative for spending)", { exact: true })
      .fill("-12.34");
    await dialog.getByLabel("Category", { exact: true }).fill("Groceries");
    await dialog.getByRole("button", { name: "Confirm and save" }).click();
    await expect(dialog).toHaveCount(0);
    await page
      .getByRole("searchbox", { name: "Search transactions", exact: true })
      .fill("Browser QA groceries");
    await expect(
      page.getByRole("row").filter({ hasText: "Browser QA groceries" }),
    ).toContainText("Manual");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    expect((await download).suggestedFilename()).toMatch(/\.csv$/);
    await page.screenshot({
      path: join(directory, "transactions-desktop.png"),
      fullPage: true,
    });
    await page.goto(`${base}/plan?section=goals`);
    await page.getByRole("button", { name: "Add goal", exact: true }).click();
    await dialog
      .getByLabel("Name", { exact: true })
      .fill("Browser QA emergency fund");
    await dialog
      .getByLabel("Savings target (USD)", { exact: true })
      .fill("1000");
    await dialog
      .getByLabel("Starting savings (USD)", { exact: true })
      .fill("100");
    await dialog
      .getByLabel("Goal type", { exact: true })
      .selectOption("Emergency");
    await dialog.getByRole("button", { name: "Confirm and save" }).click();
    await expect(dialog).toHaveCount(0);
    await page.locator(".record-list-item").filter({ hasText: "Browser QA emergency fund" })
      .getByRole("button", { name: "Record contribution", exact: true })
      .click();
    await dialog.getByLabel("Contribution (USD)", { exact: true }).fill("50");
    await dialog.getByRole("button", { name: "Confirm and save" }).click();
    await expect(dialog).toHaveCount(0);
    await page.goto(`${base}/continuity`);
    await expect(
      page.getByRole("heading", {
        name: "Browser QA emergency fund",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("progressbar", {
        name: "Browser QA emergency fund progress",
      }),
    ).toHaveAttribute("aria-valuenow", "15");
    await page.goto(`${base}/plan?section=budget`);
    await page.getByRole("row").filter({ hasText: "Monthly groceries" }).getByRole("button", { name: "Edit", exact: true }).click();
    await dialog
      .getByLabel("Name", { exact: true })
      .fill("Browser QA groceries budget");
    await dialog
      .getByLabel("Spending category (match your transactions)", {
        exact: true,
      })
      .fill("Groceries");
    await dialog.getByLabel("Monthly budget (USD)", { exact: true }).fill("10");
    await dialog.getByRole("button", { name: "Confirm and save" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Over budget", { exact: true })).toBeVisible();
    await page.goto(`${base}/plan?section=credit`);
    await page
      .getByRole("button", { name: "Record score", exact: true })
      .click();
    await dialog
      .getByLabel("Manually recorded score (300–850)", { exact: true })
      .fill("720");
    await dialog.getByRole("button", { name: "Confirm and save" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".score-gauge>strong")).toContainText("720");
    await page
      .getByRole("button", { name: "Add account", exact: true })
      .click();
    await dialog
      .getByLabel("Name", { exact: true })
      .fill("Browser QA credit card");
    await dialog
      .getByLabel("Outstanding balance (USD)", { exact: true })
      .fill("120");
    await dialog
      .getByLabel("Revolving credit limit (USD)", { exact: true })
      .fill("1000");
    await dialog
      .getByLabel("Recorded payment status", { exact: true })
      .selectOption("On time");
    await dialog
      .getByLabel("Payment observation date", { exact: true })
      .fill(todayIso());
    await dialog.getByRole("button", { name: "Confirm and save" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("20.0%", { exact: true })).toBeVisible();
    await expect(
      page
        .locator(".record-metrics>div")
        .filter({ hasText: "Average known account age" })
        .locator("strong"),
    ).not.toHaveText("—");
    await page.goto(`${base}/plan?section=investing`);
    await page
      .getByRole("button", { name: "Add holding", exact: true })
      .click();
    await dialog
      .getByLabel("Name", { exact: true })
      .fill("Browser QA manual asset");
    await dialog.getByLabel("Units held", { exact: true }).fill("2");
    await dialog
      .getByLabel("Manual value per unit (USD)", { exact: true })
      .fill("25");
    await dialog
      .getByLabel("Total cost basis (USD)", { exact: true })
      .fill("40");
    await dialog.getByRole("button", { name: "Confirm and save" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("row").filter({ hasText: "Browser QA manual asset" }),
    ).toContainText("$50.00");
    await page.goto(`${base}/plan?section=protection`);
    await page.getByRole("button", { name: "Add policy", exact: true }).click();
    await dialog
      .getByLabel("Policy / provider name", { exact: true })
      .fill("Browser QA manual policy");
    await dialog
      .getByLabel("Monthly premium (USD)", { exact: true })
      .fill("20");
    await dialog.getByRole("button", { name: "Confirm and save" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: "Browser QA manual policy",
        exact: true,
      }),
    ).toBeVisible();
    await page.goto(`${base}/plan?section=spending`);
    await page
      .getByRole("button", { name: "Add subscription", exact: true })
      .click();
    await dialog
      .getByLabel("Name", { exact: true })
      .fill("Browser QA cloud plan");
    await dialog.getByLabel("Charge (USD)", { exact: true }).fill("2");
    await dialog.getByRole("button", { name: "Confirm and save" }).click();
    await expect(dialog).toHaveCount(0);
    await page
      .getByRole("checkbox", {
        name: "Simulate removing Browser QA cloud plan",
      })
      .check();
    await expect(
      page.getByRole("checkbox", {
        name: "Simulate removing Browser QA cloud plan",
      }),
    ).toBeChecked();
    for (const [label, path] of [
      ["subscriptions", "/plan?section=spending"],
      ["forecast", "/plan?section=forecast"],
      ["goals", "/plan?section=goals"],
      ["budget", "/plan?section=budget"],
      ["credit", "/plan?section=credit"],
      ["investing", "/plan?section=investing"],
      ["protection", "/plan?section=protection"],
      ["shared", "/shared"],
      ["assistant", "/assistant"],
      ["emergency", "/continuity"],
      ["settings", "/settings"],
    ]) {
      await page.goto(base + path);
      await expect(
        page
          .getByRole("navigation", { name: "Main navigation" })
          .getByRole("link"),
      ).toHaveCount(4);
      await expect(page.locator(".loading-layout")).toHaveCount(0);
      await page.screenshot({
        path: join(directory, `${label}-desktop.png`),
        fullPage: true,
      });
      console.log(`Rendered ${label}: desktop verified.`);
    }
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.screenshot({
      path: join(directory, "settings-dark.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Light", exact: true }).click();
    for (const width of [1024, 768, 390]) {
      await page.setViewportSize({ width, height: 950 });
      for (const path of [
        "/",
        "/transactions",
        "/plan?section=forecast",
        "/shared",
      ]) {
        await page.goto(base + path);
        await expect(page.locator(".loading-layout")).toHaveCount(0);
        const fits = await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        );
        expect(fits, `Page overflow at ${width}px: ${path}`).toBe(true);
      }
      await page.goto(base);
      await page.screenshot({
        path: join(directory, `home-${width}.png`),
        fullPage: true,
      });
      if (width < 1000) {
        await page
          .getByRole("button", { name: "Open navigation", exact: true })
          .click();
        await expect(
          page.getByRole("dialog", { name: "Workspace navigation" }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(
          page.getByRole("dialog", { name: "Workspace navigation" }),
        ).toHaveCount(0);
      }
      console.log(`Responsive navigation and overflow: ${width}px verified.`);
    }
    expect(errors).toEqual([]);
    console.log(
      "Browser verification passed: forms, shared goal consistency, CSV, actual page renders, mobile navigation, no page errors.",
    );
    console.log(
      `Screenshots saved under ${directory}; all records fictional in an isolated local session.`,
    );
  } catch (error) {
    await page.screenshot({
      path: join(directory, "failure.png"),
      fullPage: true,
    });
    throw error;
  } finally {
    await browser.close();
  }
}
void main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Browser verification failed.",
  );
  process.exitCode = 1;
});
