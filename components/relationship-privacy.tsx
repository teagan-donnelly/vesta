"use client";
import { useState } from "react";
import type { PlanningPayload } from "./demo-planning";
import type { Consent } from "@/lib/collaboration/model";
type Workspace=PlanningPayload["workspaces"][number];
export function RelationshipPrivacy({workspace,profile,children}:{workspace:Workspace;profile:string;children:(recipient:string,consent:Consent)=>React.ReactNode}) {
  const [recipient,setRecipient]=useState(workspace.members.find(p=>p!==profile)||"");
  return <div><label className="field panel-body"><span>Who can see your information in this workspace?</span><select aria-label="Privacy recipient" value={recipient} onChange={e=>setRecipient(e.target.value)}>{workspace.members.filter(p=>p!==profile).map(p=><option key={p} value={p}>{p[0].toUpperCase()+p.slice(1)}</option>)}</select></label>{recipient?children(recipient,workspace.recipientConsents[recipient] || workspace.ownConsent):<p>Add another member to configure relationship-specific sharing.</p>}</div>;
}
