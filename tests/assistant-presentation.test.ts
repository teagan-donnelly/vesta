import {test} from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {JSDOM} from "jsdom";
import {AssistantMessage,MessageProse} from "../components/assistant-message";
import {messageBlocks,validPresentation} from "../lib/assistant-presentation";
import {assistant} from "../lib/collaboration/assistant";
import {initialState,personalData} from "../lib/collaboration/model";
import {project} from "../lib/analysis";

test("ordinary and legacy long replies render short paragraphs without dropping decimal financial amounts",()=>{
 const text="Your share is $400.00. You have $200.00 available. Your forecast reaches -$200.00. Expected income arrives later. Review the timing before you decide.";
 const html=renderToStaticMarkup(createElement(MessageProse,{content:text}));
 const dom=new JSDOM(html);assert.ok(dom.window.document.querySelectorAll("p").length>=3);
 assert.equal(dom.window.document.querySelectorAll("strong").length,3);
 assert.equal(messageBlocks(text).map(b=>"text" in b?b.text:"").join(" "),text);
 assert.ok(messageBlocks("Hello! How can I help?").length);dom.window.close();
});
test("headings, bullets, numbered lists and bold render as safe semantic elements without raw markup",()=>{
 const content="# Your outlook\n\nKeep **rent protected**.\n\n- Review the optional purchase\n- Keep the gym\n\n## Next steps\n1. Preview a scenario\n2. Confirm only when ready";
 const html=renderToStaticMarkup(createElement(MessageProse,{content})),dom=new JSDOM(html),doc=dom.window.document;
 assert.equal(doc.querySelectorAll("h4").length,2);assert.equal(doc.querySelectorAll("ul li").length,2);assert.equal(doc.querySelectorAll("ol li").length,2);assert.equal(doc.querySelector("strong")!.textContent,"rent protected");
 assert.doesNotMatch(doc.body.textContent!,/\*\*|##|1\./);dom.window.close();
});
test("HTML, script, links and JSON transport never become executable content or raw response syntax",()=>{
 for(const content of ['<script>alert(1)</script><img src=x onerror=alert(1)>Safe **answer** [link](javascript:alert(1))','```json\n{"reply":"A safe **reply**."}\n```','{"recommendations":[{"amount":999999}]}']){
  const dom=new JSDOM(renderToStaticMarkup(createElement(MessageProse,{content}))),doc=dom.window.document;
  assert.equal(doc.querySelectorAll("script,img,iframe,a").length,0);assert.doesNotMatch(doc.body.textContent!,/```|\*\*|<script|999999|"reply"/);dom.window.close();
 }
 assert.equal(validPresentation({version:1,summary:"x",recommendations:[{title:"Forged"}]}),false);
});
test("multiple recommendation cards and saved history retain only actual engine outcomes and require explicit preview",async t=>{
 const env={...process.env};delete process.env.GEMINI_API_KEY;delete process.env.BACKBOARD_API_KEY;t.after(()=>{process.env=env;});
 const state=initialState(),data=personalData(state,"kevin"),baseline=project(data);
 const reply=await assistant(state,"kevin","Help me resolve my vacation shortfall while keeping my gym.","en","presentation-test");
 assert.ok(validPresentation(reply.presentation));assert.equal(reply.presentation.recommendations.length,2);
 assert.deepEqual(reply.presentation.recommendations.map(r=>[r.freedCents,r.afterCents,r.shortfallCents]),[[33000,13000,0],[21000,1000,0]]);
 for(const r of reply.presentation.recommendations){assert.equal(project(data,r.simulation).lowestBalanceCents,r.afterCents);assert.ok(!r.simulation.removedSubscriptions?.includes("fictional-kevin:riversidefitness"));}
 assert.deepEqual(project(data),baseline);assert.deepEqual(state.plans.kevin.simulation,{});
 assert.deepEqual(JSON.parse(JSON.stringify(state)).plans.kevin.messages.at(-1).presentation,JSON.parse(JSON.stringify(reply.presentation)));
 let previews=0;
 const html=renderToStaticMarkup(createElement(AssistantMessage,{content:reply.reply,presentation:reply.presentation,spanish:false,onPreview:()=>previews++})),dom=new JSDOM(html),doc=dom.window.document;
 assert.equal(doc.querySelectorAll(".assistant-recommendation").length,2);assert.match(doc.body.textContent!,/\+\$330.00/);assert.match(doc.body.textContent!,/temporarily/);assert.equal(previews,0);assert.equal(doc.querySelectorAll("a[href='/plan?section=forecast']").length,2);dom.window.close();
 const spanish=await assistant(state,"kevin","Quiero mantener el gimnasio; ¿qué opciones tengo?","es","presentation-test");assert.match(spanish.presentation.summary,/gimnasio/);assert.match(spanish.presentation.recommendations[0].limitation,/temporalmente/);
});
test("Gemini's injected recommendations and financial claims are ignored while its routing instructions request concise structure",async t=>{
 const original=globalThis.fetch,env={...process.env};delete process.env.BACKBOARD_API_KEY;process.env.GEMINI_API_KEY="fictional-test";
 t.after(()=>{globalThis.fetch=original;process.env=env;});
 globalThis.fetch=(async(_input,init)=>{
  const body=JSON.parse(String(init?.body));assert.match(body.systemInstruction.parts[0].text,/short paragraphs/);assert.doesNotMatch(JSON.stringify(body.contents),/fictional-kevin|620000|142000/);
  return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({intent:"options",presentation:"structured",reply:"Save $999999",recommendations:[{simulation:{unexpectedCents:-999999}}]})}]}}]});
 }) as typeof fetch;
 const state=initialState(),reply=await assistant(state,"kevin","What are my options?","en","safe-presentation");
 assert.equal(reply.source,"gemini");assert.doesNotMatch(JSON.stringify(reply.presentation),/999999/);assert.equal(reply.presentation.recommendations[0].afterCents,13000);assert.deepEqual(state.plans.kevin.simulation,{});
 globalThis.fetch=(async()=>Response.json({candidates:[{content:{parts:[{text:JSON.stringify({intent:"privacy",presentation:"numbered",reply:"Invented claim"})}]}}]})) as typeof fetch;
 const numbered=await assistant(state,"kevin","Explain privacy as numbered steps","en","safe-presentation");
 assert.match(numbered.presentation.summary,/1\. /);assert.doesNotMatch(numbered.presentation.summary,/Invented claim/);
});
