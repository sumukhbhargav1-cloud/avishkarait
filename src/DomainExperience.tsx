'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Atom, Code2, Cpu, Hammer, Radio, Shield, X } from 'lucide-react';
import { eventDomains, type EventDomain, type DomainChallenge } from '@/lib/domain-content';

const icons=[Shield,Code2,Radio,Hammer,Atom];
function teamSize(domain:EventDomain,challenge?:DomainChallenge){
  const min=challenge?.minTeamSize??domain.minTeamSize, max=challenge?.maxTeamSize??domain.maxTeamSize;
  if(min&&max&&min===max)return `${min} members`;
  if(min&&max)return `${min}–${max} members`;
  if(max)return `Maximum ${max} members`;
  if(domain.challenges.length>1){const sizes=domain.challenges.map(c=>c.minTeamSize??c.maxTeamSize).filter((n):n is number=>typeof n==='number');if(sizes.length)return `Challenge-specific · ${Math.min(...sizes)}–${Math.max(...sizes)} members`}
  return 'To be announced';
}

export default function DomainExperience({mode='cards',slug}:{mode?:'cards'|'details';slug?:string}){
  const [domains,setDomains]=useState(eventDomains);
  const [active,setActive]=useState<{domain:EventDomain;challenge:DomainChallenge}|null>(null);
  useEffect(()=>{let cancelled=false;fetch('/api/domains').then(async response=>response.ok?(await response.json()).domains:null).then(rows=>{if(cancelled||!Array.isArray(rows))return;const next=eventDomains.map(base=>{const row=rows.find((r:{slug:string})=>r.slug===base.slug);if(!row)return base;const details=row.event_details??{};const challenges=Array.isArray(details.challenges)?details.challenges.map((c:Record<string,unknown>)=>({id:String(c.id??''),name:String(c.name??''),summary:String(c.summary??''),requirements:Array.isArray(c.requirements)?c.requirements.map(String):[],evaluation:Array.isArray(c.evaluation)?c.evaluation.map(String):[],minTeamSize:typeof c.minTeamSize==='number'?c.minTeamSize:undefined,maxTeamSize:typeof c.maxTeamSize==='number'?c.maxTeamSize:undefined,duration:typeof c.duration==='string'?c.duration:undefined})).filter((c:DomainChallenge)=>c.id&&c.name):base.challenges;return {...base,code:typeof details.eventCode==='string'?details.eventCode:base.code,name:row.name,description:row.description||base.description,minTeamSize:row.minimum_team_size??undefined,maxTeamSize:row.maximum_team_size??undefined,registrationOpen:Boolean(row.registration_open),focus:Array.isArray(details.focusAreas)?details.focusAreas.map(String):base.focus,duration:typeof details.duration==='string'?details.duration:base.duration,challenges:challenges.length?challenges:base.challenges}});setDomains(next)}).catch(()=>{});return()=>{cancelled=true}},[]);
  useEffect(()=>{if(!active)return;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setActive(null)};document.body.style.overflow='hidden';window.addEventListener('keydown',onKey);return()=>{document.body.style.overflow='';window.removeEventListener('keydown',onKey)}},[active]);
  const visibleDomains=slug?domains.filter(domain=>domain.slug===slug):domains;
  return <>
    <div className={mode==='cards'?'domain-experience-grid':'domain-experience-list'}>
      {visibleDomains.map(domain=>{const Icon=icons[eventDomains.findIndex(entry=>entry.slug===domain.slug)]??Atom;return <article className="experience-card" key={domain.slug}>
        <div className="experience-card-top"><span>{domain.number} / {domain.code}</span><Icon size={23}/></div>
        <h3>{domain.name}</h3><p>{domain.short}</p>
        <div className="experience-facts"><span>TEAM SIZE <b>{teamSize(domain)}</b></span>{domain.duration&&<span>DURATION <b>{domain.duration}</b></span>}<span>REGISTRATION <b>{domain.registrationOpen?'Open':'To be announced'}</b></span></div>
        <div className="experience-actions"><button type="button" className="text-link" onClick={()=>{const first=domain.challenges?.[0]; if(first) setActive({domain,challenge:first});}}>Rules & challenges <ArrowUpRight size={14}/></button><Link className="button button-red" href={`/register?domain=${domain.slug}`}>Register <span className="sr-only">Registration form</span> <ArrowUpRight size={14}/></Link></div>
      </article>})}
    </div>
    {active&&<div className="domain-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setActive(null)}} onClick={e=>{if(e.target===e.currentTarget)setActive(null)}}><section className="domain-modal" role="dialog" aria-modal="true" aria-labelledby="domain-modal-title" onClick={e=>e.stopPropagation()}>
      <header className="domain-modal-header"><div><span className="eyebrow"><span className="eyebrow-line"/> {active.domain.number} / {active.domain.code} / DOMAIN RULES</span><h2 id="domain-modal-title">{active.domain.name}</h2><p>{active.domain.description}</p></div><button aria-label="Close rules" className="domain-modal-close" onClick={()=>setActive(null)}><X size={21}/></button></header>
      <div className="domain-modal-body">
        {(active.domain.focus?.length??0)>0&&<div className="modal-info-block"><h3>Focus areas</h3><ul>{(active.domain.focus??[]).map(s=><li key={s}>{s}</li>)}</ul></div>}
        <div className="challenge-tabs" aria-label="Challenges">{(active.domain.challenges??[]).map(ch=><button key={ch.id} className={ch.id===active.challenge.id?'active':''} onClick={()=>setActive({domain:active.domain,challenge:ch})}>{ch.name}</button>)}</div>
        <article className="modal-challenge"><div className="modal-challenge-heading"><div><span>CHALLENGE / {active.domain.number}</span><h3>{active.challenge.name}</h3></div><div className="modal-facts"><span>TEAM SIZE <b>{teamSize(active.domain,active.challenge)}</b></span><span>DURATION <b>{active.challenge.duration??active.domain.duration??'To be announced'}</b></span></div></div><p>{active.challenge.summary}</p>
          <div className="modal-detail-columns"><div><h4>Requirements & rules</h4><ul>{(active.challenge.requirements??[]).map(item=><li key={item}>{item}</li>)}</ul></div><div><h4>Evaluation</h4><ul>{(active.challenge.evaluation??[]).map(item=><li key={item}>{item}</li>)}</ul></div></div>
        </article>
          <div className="modal-notice">{active.domain.registrationOpen?'Registration is open for this domain.':'Registration closes on 21 November 2026.'} All participants must report with institutional ID at BGS Seminar Hall.</div>
      </div>
      <footer className="domain-modal-footer"><button className="button button-outline" onClick={()=>setActive(null)}>Close details</button><Link className="button button-red" href={`/register?domain=${active.domain.slug}&challenge=${active.challenge.id}`}>Register for this challenge <span className="sr-only">Registration form</span> <ArrowUpRight size={15}/></Link></footer>
    </section></div>}
  </>;
}
