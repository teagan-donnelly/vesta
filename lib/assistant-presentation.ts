import type { Simulation } from "./types";

export type FinancialRecommendation = {
  id: string;
  title: string;
  change: string;
  deadline: string;
  freedCents: number;
  beforeCents: number;
  afterCents: number;
  shortfallCents: number | null;
  limitation: string;
  simulation: Simulation;
};
export type AssistantPresentation = {
  version: 1;
  summary: string;
  recommendations: FinancialRecommendation[];
};

// Browser snapshots and old history are editable demo content. Render only this
// small schema; never interpret arbitrary objects, HTML, or provider actions.
export function validPresentation(value: unknown): value is AssistantPresentation {
  if (!value || typeof value !== "object") return false;
  const p=value as AssistantPresentation;
  const text=(v:unknown)=>typeof v === "string" && v.length<=12000;
  const cents=(v:unknown)=>Number.isSafeInteger(v) && Math.abs(Number(v))<=1000000000;
  return p.version===1 && text(p.summary) && Array.isArray(p.recommendations) && p.recommendations.length<=3 && p.recommendations.every(r=>
    r && text(r.id) && text(r.title) && text(r.change) && text(r.limitation) && /^\d{4}-\d{2}-\d{2}$/.test(r.deadline) &&
    cents(r.freedCents) && cents(r.beforeCents) && cents(r.afterCents) && (r.shortfallCents===null || (cents(r.shortfallCents) && r.shortfallCents>=0)) &&
    r.simulation && typeof r.simulation === "object" && !Array.isArray(r.simulation),
  );
}

export type MessageBlock = {type:"paragraph"|"heading";text:string}|{type:"bullets"|"numbered";items:string[]};
export function cleanMessageText(raw:string):string {
  let text=raw.slice(0,24000).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,"");
  // Structured transport syntax is never printed as a chat answer.
  text=text.replace(/```(?:json)?\s*([\s\S]*?)```/gi,(_,content:string)=>content.trim());
  if (/^\s*[\[{]/.test(text)) {
    try {const value=JSON.parse(text);const prose=value?.reply || value?.message || value?.content;return typeof prose==="string"?cleanMessageText(prose):"This response could not be displayed. Please ask Vesta again.";}catch{return "This response could not be displayed. Please ask Vesta again.";}
  }
  return text.replace(/<(script|style|iframe|object)\b[^>]*>[\s\S]*?<\/\1>/gi,"")
    .replace(/<[^>]*>/g,"").replace(/!?\[([^\]]*)\]\([^)]*\)/g,"$1")
    .replace(/`+/g,"").replace(/\r\n/g,"\n").trim();
}
export function messageBlocks(raw:string):MessageBlock[] {
  const lines=cleanMessageText(raw).split("\n"),blocks:MessageBlock[]=[];
  let paragraph:string[]=[];
  const flush=()=>{
    if(!paragraph.length)return;
    const sentences=paragraph.join(" ").split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚ¿])/u);
    let current="",count=0;
    for(const sentence of sentences){if(current && (count>=2 || current.length+sentence.length>320)){blocks.push({type:"paragraph",text:current.trim()});current="";count=0;}current+=(current?" ":"")+sentence;count++;}
    if(current.trim())blocks.push({type:"paragraph",text:current.trim()});paragraph=[];
  };
  for(const line of lines){
    const heading=line.match(/^\s*#{1,6}\s+(.+)$/),bullet=line.match(/^\s*[-*+]\s+(.+)$/),number=line.match(/^\s*\d+[.)]\s+(.+)$/);
    if(!line.trim() || /^\s*[-*_]{3,}\s*$/.test(line)){flush();continue;}
    if(heading){flush();blocks.push({type:"heading",text:heading[1]});continue;}
    if(bullet||number){flush();const type=bullet?"bullets":"numbered",item=(bullet||number)![1],previous=blocks.at(-1);if(previous?.type===type && "items" in previous)previous.items.push(item);else blocks.push({type,items:[item]});continue;}
    paragraph.push(line.trim());
  }
  flush();return blocks;
}
