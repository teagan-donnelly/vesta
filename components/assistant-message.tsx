"use client";
import Link from "next/link";
import {cleanMessageText,messageBlocks,validPresentation,type FinancialRecommendation} from "@/lib/assistant-presentation";
import {formatCurrency} from "@/lib/analysis";
import {dateLabel} from "./activity-table";

function Inline({text}:{text:string}) {
  return cleanMessageText(text).split(/(\*\*[^*]+\*\*|__[^_]+__|-?\$\d[\d,]*(?:\.\d{1,2})?)/g).map((part,i)=>{
    const bold=part.startsWith("**")||part.startsWith("__"),money=/^-?\$\d/.test(part);
    const visible=(bold?part.slice(2,-2):part).replace(/\*\*|__/g,"").replace(/\*([^*]+)\*/g,"$1");
    return bold||money?<strong key={i}>{visible}</strong>:visible;
  });
}
export function MessageProse({content}:{content:string}) {
  return <div className="assistant-prose">{messageBlocks(content).map((block,i)=>{
    if("items" in block){const List=block.type==="numbered"?"ol":"ul";return <List key={i}>{block.items.map((item,j)=><li key={j}><Inline text={item}/></li>)}</List>;}
    return block.type==="heading"?<h4 key={i}><Inline text={block.text}/></h4>:<p key={i}><Inline text={block.text}/></p>;
  })}</div>;
}
export function AssistantMessage({content,presentation,spanish,onPreview}:{content:string;presentation?:unknown;spanish:boolean;onPreview:(option:FinancialRecommendation)=>void}) {
  const structured=validPresentation(presentation)?presentation:null;
  return <>
    <MessageProse content={structured?.summary || content}/>
    {structured?.recommendations.length ? <div className="assistant-recommendations" aria-label={spanish?"Opciones calculadas":"Calculated recommendations"}>{structured.recommendations.map((option,index)=><section className="assistant-recommendation" key={option.id} aria-label={`${spanish?"Opción":"Option"} ${index+1}`}>
      <h4><span>{index+1}</span><Inline text={option.title}/></h4>
      <MessageProse content={option.change}/>
      <dl>
        <div><dt>{spanish?"Efectivo liberado antes de la fecha límite":"Cash freed before the deadline"}</dt><dd><strong>{option.freedCents>0?"+":""}{formatCurrency(option.freedCents)}</strong> <small>· {dateLabel(option.deadline)}</small></dd></div>
        <div><dt>{spanish?"Saldo mínimo previsto":"Projected minimum balance"}</dt><dd>{formatCurrency(option.beforeCents)} <span aria-label={spanish?"cambia a":"changes to"}>→</span> <strong>{formatCurrency(option.afterCents)}</strong></dd></div>
      </dl>
      {option.shortfallCents!==null && <p className="recommendation-outcome">{option.shortfallCents===0?(spanish?"Tu aporte compartido parece cubierto.":"Your shared contribution looks covered."):`${formatCurrency(option.shortfallCents)} ${spanish?"todavía por cubrir.":"still to cover."}`}</p>}
      <p className="recommendation-limit"><Inline text={option.limitation}/></p>
      <Link className="text-link" href="/plan?section=forecast" onClick={()=>onPreview(option)}>{spanish?`Ver opción ${index+1} en Domino`:`Preview option ${index+1} in Domino`} →</Link>
    </section>)}</div>:null}
  </>;
}
