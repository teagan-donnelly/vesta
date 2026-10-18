import {test} from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {JSDOM} from "jsdom";
import {memberColors} from "../lib/member-colors";
import {initialState,workspaceView} from "../lib/collaboration/model";
import {SharedExpenseSummary} from "../components/shared-expense-summary";

function luminance(hex:string){
 const channels=hex.match(/[a-f0-9]{2}/gi)!.map(c=>parseInt(c,16)/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
 return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
}
test("every fictional member has a unique accessible identity color",()=>{
 assert.equal(new Set(Object.values(memberColors)).size,5);
 assert.notEqual(memberColors.kevin,memberColors.lily);
 for(const color of Object.values(memberColors)){
  assert.ok(1.05/(luminance(color)+0.05)>=4.5,"white initials meet normal-text contrast");
  assert.ok((luminance("#f6eee4")+0.05)/(luminance(color)+0.05)>=3,"swatches contrast against ivory");
 }
});
test("rent, utilities and vacation keep segment, legend and avatar colors consistent regardless of member order",()=>{
 const state=initialState();
 for(const workspace of ["household","vacation"]){
  for(const expense of workspaceView(state,workspace,"kevin").commitments){
   const before=structuredClone(expense);
   for(const ordered of [expense,{...expense,contributions:[...expense.contributions].reverse()}]){
    const dom=new JSDOM(renderToStaticMarkup(createElement(SharedExpenseSummary,{expense:ordered,viewer:"kevin",workspace})));
    const document=dom.window.document,gradient=document.querySelector(".agreed-ring")!.getAttribute("style")!;
    const legend=[...document.querySelectorAll(".allocation-key > span")];
    const avatars=[...document.querySelectorAll(".member-avatar")];
    ordered.contributions.forEach((member,i)=>{
     const color=memberColors[member.profile];
     assert.ok(gradient.includes(color));
     assert.ok(legend[i].textContent!.includes(member.name));
     assert.ok(legend[i].querySelector("i")!.getAttribute("style")!.includes(color));
     assert.ok(avatars[i].getAttribute("style")!.includes(color));
    });
    assert.equal(new Set(ordered.contributions.map(a=>memberColors[a.profile])).size,ordered.contributions.length);
    dom.window.close();
   }
   assert.deepEqual(expense,before);
  }
 }
});
