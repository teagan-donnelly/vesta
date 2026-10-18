import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
const base = process.env.DEMO_BASE_URL || "http://localhost:3002";
async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const directory = join(process.cwd(), ".tmp", "multi-group-verification");
  await mkdir(directory, { recursive: true });
  async function stored(profile: string, check: string) {
    await page.waitForFunction(({ profile, check }) => {
      const snapshot = JSON.parse(localStorage.getItem("vesta.snapshot.v1") || "null");
      const plan = snapshot?.state?.plans?.[profile];
      return check === "scenario" ? Boolean(plan?.simulation?.eventId) :
        check === "consent" ? snapshot?.state?.consents?.[`vacation:${profile}:ava`]?.readiness === true :
        check === "revoked" ? snapshot?.state?.consents?.[`vacation:${profile}:ava`]?.readiness === false : Boolean(plan);
    }, { profile, check });
  }
  async function switchTo(profile: string) {
    if (!(await page.locator(".profile-menu").evaluate((element) => (element as HTMLDetailsElement).open)))
      await page.locator(".profile-menu > summary").click();
    await page.getByRole("combobox", { name: "Demo Profile Switcher" }).selectOption(profile);
    await page.keyboard.press("Escape");
    await stored(profile, "ready");
    await expect(page.locator(".loading-layout")).toHaveCount(0);
  }
  try {
    await page.goto(base);
    await switchTo("kevin");
    await expect(page.getByRole("heading", { name: /Good to see you, Kevin/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Upcoming financial risk" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Upcoming financial risk" })).toContainText("$200.00");
    await expect(page.getByRole("region", { name: "Upcoming financial risk" })).toContainText("$200.00");
    await expect(page.getByRole("region",{name:"Group Health"})).toBeVisible();
    await page.screenshot({ path: join(directory, "kevin-home.png"), fullPage: true });
    const health=page.getByRole("region",{name:"Group Health"});
    await expect(health).toContainText("Maple Street Roommates");await expect(health).toContainText("On Track");await expect(health).toContainText("At Risk");
    await page.goto(base+"/shared?workspace=household");
    await expect(page.getByRole("region",{name:"Relationship-specific disclosure"})).toContainText("Maya");
    await expect(page.getByRole("article",{name:"Maya authorized details"})).toContainText("$5,450.00");
    await expect(page.getByRole("article",{name:"Noah authorized details"})).toContainText("Private");
    await expect(page.locator(".contribution-board").first().locator(".contribution-member")).toHaveCount(4);
    await page.screenshot({path:join(directory,"kevin-roommates.png"),fullPage:true});
    await page.getByRole("region",{name:"Group Health"}).getByRole("link",{name:"Explore Solutions with Vesta",exact:true}).click();
    await expect(page).toHaveURL(/workspace=vacation/);
    await expect(page.getByRole("region", { name: "Your planning context" })).toContainText("$200.00");
    await page.getByRole("button", { name: "I want to keep my gym membership.", exact: true }).click();
    await expect(page.locator(".scenario-proposal")).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole("log")).toContainText("$130.00");
    await expect(page.getByRole("log")).toContainText("gym is respected");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("vesta.snapshot.v1")!).state.plans.kevin.simulation)).toEqual({});
    await page.screenshot({ path: join(directory, "kevin-assistant.png"), fullPage: true });
    await page.getByRole("link", { name: "Preview in Domino", exact: false }).click();
    await expect(page.locator(".mini-metrics")).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("vesta.snapshot.v1")!).state.plans.kevin.simulation)).toEqual({});
    await expect(page.getByRole("region", { name: "Scenario outcome comparison" })).toContainText("+$330.00");
    await page.getByRole("button", { name: "Confirm and update my plan", exact: true }).click();
    await stored("kevin", "scenario");
    await page.getByText("Delay an expense, receive income later, or change a payment", { exact: true }).click();
    await expect(page.getByRole("spinbutton", { name: "Delay selected event in days" })).toHaveValue("6");
    await page.reload();
    await page.getByText("Delay an expense, receive income later, or change a payment", { exact: true }).click();
    await expect(page.getByRole("spinbutton", { name: "Delay selected event in days" })).toHaveValue("6");
    await expect(page.locator(".mini-metrics")).toContainText("-$200.00");
    await page.screenshot({ path: join(directory, "kevin-domino.png"), fullPage: true });
    await page.goto(base);
    await expect(page.getByRole("region", { name: "Upcoming financial risk" })).toContainText("Current what-if plan:");
    await expect(page.getByRole("region", { name: "Upcoming financial risk" })).toContainText("your contribution looks covered");
    await page.goto(base + "/shared?workspace=vacation");
    await expect(page.locator(".household-header")).toContainText("Kevin & Ava");
    await expect(page.getByRole("region",{name:"Group Health"})).not.toContainText("At Risk");
    await page.locator("#sharing > summary").click();
    await page.getByRole("checkbox", { name: "Share whether I can cover my part", exact: true }).check();
    await page.getByRole("button", { name: "Save sharing choices" }).click();
    await stored("kevin", "consent");
    await page.reload();
    await switchTo("ava");
    await expect(page.locator(".member-outlooks")).toContainText("Kevin:");
    await expect(page.locator(".member-outlooks")).toContainText("with their changes");
    await expect(page.getByRole("article",{name:"Kevin authorized details"})).toContainText("$1,420.00");
    await page.reload();
    await expect(page.locator(".member-outlooks")).toContainText("with their changes");
    await page.screenshot({ path: join(directory, "ava-shared.png"), fullPage: true });
    await switchTo("kevin");
    await page.locator("#sharing > summary").click();
    await page.getByRole("button", { name: "Stop sharing everything" }).click();
    await stored("kevin", "revoked");
    await switchTo("ava");
    await expect(page.locator(".member-outlooks")).toContainText("hasn't shared");
    await page.reload();
    await expect(page.locator(".member-outlooks")).toContainText("hasn't shared");
    await switchTo("maya");
    await expect(page.locator(".household-header")).toContainText("Maple Street Roommates");
    await expect(page.getByRole("article",{name:"Kevin authorized details"})).not.toContainText("$1,420.00");
    await expect(page.getByRole("article",{name:"Kevin authorized details"})).toContainText("Private");
    for (const profile of ["ava", "kevin", "maya", "noah", "lily"]) {
      await switchTo(profile);
      await page.goto(base);
      await expect(page.getByRole("heading", { name: new RegExp(`Good to see you, ${profile[0].toUpperCase() + profile.slice(1)}`) })).toBeVisible();
      await page.reload();
      await expect(page.getByRole("heading", { name: /Good to see you/ })).toBeVisible();
      await page.goto(base + "/credit");
      await expect(page.getByText("Fictional everyday card", { exact: true }).first()).toBeVisible();
    }
    await page.goto(base + "/settings");
    await expect(page.getByText("Tiger Data:", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Reset Demo", exact: true }).click();
    await page.getByRole("button", { name: "Confirm Reset Demo", exact: true }).click();
    // The confirmed reset waits for queued writes before reloading. On hosted
    // latency the old envelope can still exist when the click resolves.
    await page.waitForFunction(() => {
      const value = JSON.parse(localStorage.getItem("vesta.snapshot.v1") || "null");
      return value?.state?.plans?.kevin && Object.keys(value.state.plans.kevin.simulation).length === 0;
    });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("vesta.snapshot.v1")!).state.plans.kevin.simulation)).toEqual({});
    await switchTo("kevin");
    await page.goto(base + "/domino");
    await expect(page.getByRole("checkbox", { name: /Spotify/ })).not.toBeChecked();
    await page.goto(base);
    await page.getByRole("button",{name:"Expenses",exact:true}).click();
    const sourceBefore=await page.evaluate(()=>localStorage.getItem("vesta.snapshot.v1"));
    await page.getByRole("checkbox",{name:/Log Scale/}).check();
    await expect(page.getByText(/zero-preserving log/)).toBeVisible();
    await page.screenshot({path:join(directory,"expenses-log.png"),fullPage:true});
    expect(await page.evaluate(()=>localStorage.getItem("vesta.snapshot.v1"))).toEqual(sourceBefore);
    await page.getByRole("checkbox",{name:/Log Scale/}).uncheck();
    expect(await page.evaluate(()=>localStorage.getItem("vesta.snapshot.v1"))).toEqual(sourceBefore);
    expect(errors).toEqual([]);
    console.log("PASS: rendered Kevin → Domino → Shared → Ava, consent/revocation, five profiles, credit records, refresh persistence and Reset Demo. No bank or database writes.");
  } catch (error) {
    await page.screenshot({ path: join(directory, "failure.png"), fullPage: true });
    throw error;
  } finally { await browser.close(); }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : "Browser verification failed."); process.exitCode = 1; });
