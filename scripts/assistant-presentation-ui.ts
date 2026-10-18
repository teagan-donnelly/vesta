import {chromium,expect} from "@playwright/test";
import {mkdir} from "node:fs/promises";
const base=process.env.DEMO_BASE_URL || "http://localhost:3009";
const phase=process.env.VISUAL_PHASE || "local";
async function main(){
 const browser=await chromium.launch({channel:"chrome",headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:"reduce"});
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 await page.addInitScript(()=>{if(!localStorage.getItem("vesta.profile.v1"))localStorage.setItem("vesta.profile.v1",JSON.stringify({mode:"demo",customer:"demo:kevin"}));});
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem("vesta.snapshot.v1")!).state.plans.kevin.simulation);
 const ask=async(text:string)=>{await page.getByRole("textbox",{name:"Your question",exact:true}).fill(text);await page.getByRole("button",{name:"Send question",exact:true}).click();await expect(page.locator(".chat-thinking")).toHaveCount(0,{timeout:30000});};
 try{
  await mkdir(".tmp/assistant-presentation",{recursive:true});
  await page.goto(base+"/assistant?workspace=vacation");
  await page.getByRole("button",{name:"Explore vacation solutions",exact:true}).click();
  const cards=page.locator(".assistant-recommendation");await expect(cards).toHaveCount(2,{timeout:30000});
  await expect(cards.nth(0)).toContainText("+$330.00");await expect(cards.nth(0)).toContainText("$130.00");
  await expect(cards.nth(1)).toContainText("+$210.00");await expect(cards.nth(1)).toContainText("$10.00");
  await expect(page.getByRole("log")).not.toContainText("**");await expect(page.getByRole("log")).not.toContainText("```");
  expect(await saved()).toEqual({});
  await page.locator(".conversation").evaluate(e=>e.scrollTop=0);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`.tmp/assistant-presentation/${phase}-options-1440.png`,fullPage:true});
  await page.reload();await expect(cards).toHaveCount(2);expect(await saved()).toEqual({});
  await cards.nth(1).getByRole("link",{name:"Preview option 2 in Domino",exact:false}).click();
  await expect(page.getByRole("region",{name:"Scenario outcome comparison"})).toContainText("$10.00");
  await expect(page.getByRole("region",{name:"Scenario outcome comparison"})).toContainText("+$210.00");
  expect(await saved()).toEqual({});
  await page.getByRole("button",{name:"Confirm and update my plan",exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem("vesta.snapshot.v1")!).state.plans.kevin.simulation.paymentCents===18000);
  await expect(page.locator(".mini-metrics")).toContainText("-$200.00");
  await page.goto(base+"/assistant");await expect(cards).toHaveCount(2);
  await ask("What does forecast mean?");
  await expect(page.locator(".conversation-message.assistant").last().locator(".assistant-prose p")).toHaveCount(2);
  // Rendering-only legacy history fixture, including deliberately unsafe markup.
  // It never changes a financial record, recommendation or saved simulation.
  await page.evaluate(()=>{
   const e=JSON.parse(localStorage.getItem("vesta.snapshot.v1")!);
   e.state.plans.kevin.messages.push({role:"assistant",content:"# Review your options\n\nYour **$600.00 rent share** stays protected.\n\n- Keep the gym\n- Review the optional purchase\n\n## Before you decide\n1. Preview in Domino\n2. Confirm separately\n\n<script>window.vestaUnsafe=true</script><img src=x onerror='window.vestaUnsafe=true'>"+"\n\nA forecast is an estimate, not a guarantee. Review the timing before deciding. Keep your own priorities in mind. ".repeat(8)});
   localStorage.setItem("vesta.snapshot.v1",JSON.stringify(e));
  });
  await page.reload();const last=page.locator(".conversation-message.assistant").last();
  await expect(last.locator("h4")).toHaveCount(2);await expect(last.locator("ul li")).toHaveCount(2);await expect(last.locator("ol li")).toHaveCount(2);
  await expect(last.locator("ul")).toHaveCSS("list-style-type","disc");await expect(last.locator("ol")).toHaveCSS("list-style-type","decimal");
  await expect(last.locator(".assistant-prose p")).not.toHaveCount(1);await expect(last.locator("script,img")).toHaveCount(0);await expect(last).not.toContainText("**");
  expect(await page.evaluate(()=>"vestaUnsafe" in window)).toBe(false);
  await page.setViewportSize({width:390,height:950});await last.scrollIntoViewIfNeeded();
  await last.evaluate(article=>{const container=article.closest(".conversation")!;container.scrollTop+=article.getBoundingClientRect().top-container.getBoundingClientRect().top;});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`.tmp/assistant-presentation/${phase}-history-390.png`,fullPage:true});
  // Recommendation layout is also checked at mobile width.
  await cards.first().scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await cards.first().screenshot({path:`.tmp/assistant-presentation/${phase}-option-390.png`});
  expect(errors).toEqual([]);
  console.log("PASS: structured vacation options, real $330/$210 impacts, history refresh, alternate preview/confirmation, simple replies, long paragraphs, lists, HTML sanitization and mobile layout. No bank writes.");
 }finally{await browser.close();}
}
void main().catch(e=>{console.error(e instanceof Error?e.message:"Assistant presentation browser check failed");process.exitCode=1;});
