// Isolated chart regression fixture: remove one day's fictional spending from
// rendered API results only. No bank data, stored records or server data is changed.
import {chromium,expect} from "@playwright/test";
import {mkdir} from "node:fs/promises";
const base=process.env.DEMO_BASE_URL || "http://localhost:3005";
async function main(){
 const browser=await chromium.launch({channel:"chrome",headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:"reduce"});
 try{
  await page.addInitScript(()=>localStorage.setItem("vesta.profile.v1",JSON.stringify({mode:"demo",customer:"demo:kevin"})));
  await page.route("**/api/demo-snapshot",async route=>{
   const response=await route.fetch(),body=await response.json();
   if(Array.isArray(body.result?.transactions))body.result.transactions=body.result.transactions.filter((t:{date:string})=>t.date!=="2026-10-16");
   await route.fulfill({response,json:body});
  });
  await page.goto(base);await expect(page.getByRole("region",{name:"Group Health"})).toBeVisible();
  await page.getByRole("combobox",{name:"History date range"}).selectOption("7");
  await page.getByRole("button",{name:"Expenses",exact:true}).click();
  await expect(page.getByText(/Zero-spending dates: Oct 16/)).toBeVisible();
  const snapshot=await page.evaluate(()=>localStorage.getItem("vesta.snapshot.v1"));
  for(const log of [false,true]){
   await page.getByRole("checkbox",{name:/Log Scale/}).setChecked(log);
   const chart=page.locator(".home-history-chart");await chart.scrollIntoViewIfNeeded();
   const box=(await chart.boundingBox())!;let found=false;
   for(let x=box.width*0.65;x<box.width-24;x+=8){
    await chart.hover({position:{x,y:120}});
    const text=await page.locator(".chart-tooltip").textContent().catch(()=>"");
    if(text?.includes("Oct 16")){expect(text).toContain("$0.00");found=true;break;}
   }
   expect(found,"zero-spending date remains hoverable").toBe(true);
   expect(await page.evaluate(()=>localStorage.getItem("vesta.snapshot.v1"))).toBe(snapshot);
   await mkdir(".tmp/multi-group-verification",{recursive:true});
   await chart.locator("..").screenshot({path:`.tmp/multi-group-verification/zero-${log?"log":"linear"}-chart.png`});
  }
  console.log("PASS: actual browser retains and hovers the $0 date in linear and zero-preserving log views; stored cents unchanged.");
 }finally{await browser.close();}
}
void main().catch(e=>{console.error(e instanceof Error?e.message:"Expense scale verification failed");process.exitCode=1;});
