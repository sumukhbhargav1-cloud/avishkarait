'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import TurnstileCaptcha from './TurnstileCaptcha';
import { ArrowLeft, ArrowRight, ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import RegistrationSuccess from './RegistrationSuccess';
import PaymentPanel from './PaymentPanel';
import { useRouter } from 'next/navigation';
import { eventDomains, registrationFeePerTeam } from '@/lib/domain-content';
import { normalizeGithubUsername, isValidGithubUsername } from '@/lib/github-username';

type Challenge={id:string;name:string;summary?:string;requirements?:string[];evaluation?:string[];minTeamSize?:number;maxTeamSize?:number;duration?:string};
type Domain={id:string;slug:string;name:string;description:string;minimum_team_size:number|null;maximum_team_size:number|null;registration_open:boolean;event_details:{eventCode?:string;challenges?:Challenge[];focusAreas?:string[];duration?:string}};
type Member={fullName:string;email:string;githubUsername:string};
type TeamDraft={key:string;teamName:string;institution:string;city:string;state:string;domainId:string;challengeId:string;members:Member[];repositoryUrl:string;rulesAccepted:boolean};
type Leader={name:string;email:string;phone:string;githubUsername:string};
const blankMember=():Member=>({fullName:'',email:'',githubUsername:''});
const blankTeam=(domainId='',challengeId=''):TeamDraft=>({key:crypto.randomUUID(),teamName:'',institution:'',city:'',state:'',domainId,challengeId,members:[],repositoryUrl:'',rulesAccepted:false});
const bySlug=(slug:string|undefined)=>eventDomains.find(d=>d.slug===slug);
// Browser network failures surface as "Failed to fetch"; show something actionable.
const friendlyFetchError=(e:unknown,fallback:string)=>{const message=e instanceof Error?e.message:String(e||'');if(/failed to fetch|networkerror|load failed|network request failed|err_connection/i.test(message))return 'Could not reach the registration service. Check your connection and try again.';return message||fallback};

export default function RegistrationForm(){
  const [domains,setDomains]=useState<Domain[]>([]),[session,setSession]=useState<{configured:boolean}|null>(null);
  const [leader,setLeader]=useState<Leader>({name:'',email:'',phone:'',githubUsername:''});
  const [teams,setTeams]=useState<TeamDraft[]>([]),[multiple,setMultiple]=useState(false),[step,setStep]=useState<'edit'|'review'|'done'>('edit');
  const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[error,setError]=useState(''),[saved,setSaved]=useState<{domain:string;referenceId:string;teamUid:string|null;status:string;paymentStatus?:string}[]>([]),[busy,setBusy]=useState(false),[loginNext,setLoginNext]=useState('/register'),[passphrase,setPassphrase]=useState(''),[paymentEnabled,setPaymentEnabled]=useState(false),[upiId,setUpiId]=useState(''),[qrCodeUrl,setQrCodeUrl]=useState(''),[UTRReference,setUTRReference]=useState(''),[screenshotPath,setScreenshotPath]=useState(''),[beneficiaryName,setBeneficiaryName]=useState(''),[registrationFee,setRegistrationFee]=useState(registrationFeePerTeam),[captchaToken,setCaptchaToken]=useState(''),[captchaVersion,setCaptchaVersion]=useState(0);

  useEffect(()=>{let cancelled=false;async function load(){try{
    const [domainRes,sessionRes]=await Promise.all([fetch('/api/domains'),fetch('/api/auth/session')]);
    const [domainData,sessionData]=await Promise.all([domainRes.json(),sessionRes.json()]);
    if(!domainRes.ok||!sessionRes.ok)throw new Error(domainData.error||sessionData.error||'Registration services are unavailable.');
    if(cancelled)return;
    const available:Domain[]=domainData.domains;setDomains(available);setSession(sessionData);
    const params=new URLSearchParams(window.location.search),chosen=available.find(d=>d.slug===params.get('domain'));
    setLoginNext(window.location.pathname+window.location.search);
    const eventDomain=bySlug(chosen?.slug),challengeList=chosen?.event_details.challenges?.length?chosen.event_details.challenges:eventDomain?.challenges??[];
    const requestedChallenge=challengeList.find(c=>c.id===params.get('challenge'));
    setTeams([blankTeam(chosen?.id??'',requestedChallenge?.id??(challengeList.length===1?challengeList[0].id:''))]);
  }catch(e){if(!cancelled)setLoadError(friendlyFetchError(e,'Registration services are unavailable.'))}finally{if(!cancelled)setLoading(false)}}void load();return()=>{cancelled=true}},[]);

  const handleCaptchaToken=useCallback((token:string)=>setCaptchaToken(token),[]);

  const selectedIds=useMemo(()=>new Set(teams.map(t=>t.domainId).filter(Boolean)),[teams]);
  function updateTeam(key:string,patch:Partial<TeamDraft>){setTeams(v=>v.map(t=>t.key===key?{...t,...patch}:t))}
  function selectDomain(key:string,domainId:string){const d=domains.find(x=>x.id===domainId),ed=bySlug(d?.slug),list=d?.event_details.challenges?.length?d.event_details.challenges:ed?.challenges??[];updateTeam(key,{domainId,challengeId:list.length===1?list[0].id:''})}
  function addTeam(){const d=domains.find(x=>!selectedIds.has(x.id));if(!d)return;setMultiple(true);const ed=bySlug(d.slug),list=d.event_details.challenges?.length?d.event_details.challenges:ed?.challenges??[];setTeams(v=>[...v,blankTeam(d.id,list.length===1?list[0].id:'')])}
  function canAddMember(team:TeamDraft){const max=maxSize(team);return max===null||team.members.length+1<max}
  function addMember(team:TeamDraft){if(!canAddMember(team))return;updateTeam(team.key,{members:[...team.members,blankMember()]})}
  function updateMember(team:TeamDraft,index:number,key:keyof Member,value:string){updateTeam(team.key,{members:team.members.map((m,i)=>i===index?{...m,[key]:value}:m)})}
  function removeMember(team:TeamDraft,index:number){updateTeam(team.key,{members:team.members.filter((_,i)=>i!==index)})}
  function removeTeam(key:string){setTeams(v=>v.filter(t=>t.key!==key));}
  function currentDomain(team:TeamDraft){return domains.find(d=>d.id===team.domainId)}
  function currentChallenge(team:TeamDraft){if(!team.challengeId)return undefined;const d=currentDomain(team),ed=bySlug(d?.slug);return d?.event_details.challenges?.find(c=>c.id===team.challengeId)??ed?.challenges.find(c=>c.id===team.challengeId)}
  function minSize(team:TeamDraft){const challenge=currentChallenge(team),domain=currentDomain(team);return challenge?.minTeamSize??domain?.minimum_team_size??null}
  function maxSize(team:TeamDraft){const challenge=currentChallenge(team),domain=currentDomain(team);return challenge?.maxTeamSize??domain?.maximum_team_size??null}
  function sizeLabel(team:TeamDraft){const min=minSize(team),max=maxSize(team);if(min&&max&&min===max)return `${min} members`;if(min&&max)return `${min}â€“${max} members`;if(max)return `Maximum ${max} members`;return 'To be announced'}
  function rulesFor(team:TeamDraft){return currentChallenge(team)}

  function toReview(e:FormEvent<HTMLFormElement>){e.preventDefault();setError('');if(!isValidGithubUsername(normalizeGithubUsername(leader.githubUsername))){setError('Team leader GitHub username: use letters, numbers or single hyphens, for example octocat (an @handle or profile link is also accepted).');return}if(!e.currentTarget.reportValidity())return;if(teams.length<1){setError('Add at least one team.');return}for(let i=0;i<teams.length;i++){const t=teams[i],size=t.members.length+1,min=minSize(t),max=maxSize(t),domain=currentDomain(t);if(!domain){setError(`Choose a domain for Team ${i+1}.`);return}if(!t.challengeId){setError(`Choose a challenge for ${domain.name}.`);return}if(!domain.registration_open){setError(`${domain.name} registration is not open yet. The organisers will publish availability here.`);return}if(min&&size<min){setError(`${rulesFor(t)?.name}: the team must have at least ${min} members, including the leader.`);return}if(max&&size>max){setError(`${rulesFor(t)?.name}: the team can have no more than ${max} members.`);return}if(!t.rulesAccepted){setError(`Accept the confirmed rules for ${domain.name}.`);return}for(const m of t.members){if(!isValidGithubUsername(normalizeGithubUsername(m.githubUsername))){setError('Enter a valid GitHub username for '+(m.fullName||'each member')+' in '+(t.teamName||('Team '+(i+1)))+'.');return}}const emails=[leader.email,...t.members.map(m=>m.email)].map(x=>x.trim().toLowerCase());if(new Set(emails).size!==emails.length){setError(`A participant email is repeated in ${t.teamName||`Team ${i+1}`}.`);return}}
    if(new Set(teams.map(t=>t.domainId)).size!==teams.length){setError('Each registered team must have its own domain.');return}setStep('review');window.scrollTo({top:0,behavior:'smooth'});
  }
  async function submit(){setError('');if(!captchaToken){setError('Complete the CAPTCHA verification before submitting your registration.');return}setBusy(true);try{const response=await fetch('/api/participant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({captchaToken,leaderName:leader.name,leaderEmail:leader.email,leaderPhone:leader.phone,leaderGithubUsername:normalizeGithubUsername(leader.githubUsername),teams:teams.map(t=>({teamName:t.teamName,institution:t.institution,city:t.city,state:t.state,domainId:t.domainId,challengeId:t.challengeId,members:t.members.map(m=>({...m,githubUsername:normalizeGithubUsername(m.githubUsername)})),rulesAccepted:t.rulesAccepted,repositoryUrl:t.repositoryUrl}))})});const data=await response.json();if(!response.ok){const firstField=(data.fields?Object.values(data.fields).flat().filter(Boolean)[0]:undefined) as string|undefined;throw new Error(firstField||data.error||'No registrations were saved.')}setPassphrase(data.passphrase||'');setSaved(data.registrations||[]);setPaymentEnabled(data.paymentEnabled ?? false);setUpiId(data.upiId || '');setQrCodeUrl(data.qrCodeUrl || '');setBeneficiaryName(data.beneficiaryName || '');setRegistrationFee(Number(data.registrationFee)>0?Number(data.registrationFee):registrationFeePerTeam);setStep('done');window.scrollTo({top:0,behavior:'smooth'})}catch(e){setCaptchaToken('');setCaptchaVersion(v=>v+1);setError(friendlyFetchError(e,'No registrations were saved.'))}finally{setBusy(false)}}

  return <section className="section register-section registration-workflow">
    <div className="register-intro"><span className="eyebrow"><span className="eyebrow-line"/> TEAM REGISTRATION</span><h2>One workflow.<br/><span>Separate teams.</span></h2><p>Register one team for a domain or prepare independent teams across multiple domains. Each team has its own members and challenge selection.</p><div className="register-aside"><span>₹</span><p><b>₹{registrationFeePerTeam.toLocaleString('en-IN')} per team.</b> Payment instructions are to be announced. No payment is collected by this form.</p></div><div className="fee-calculator"><span>TEAMS <b>{teams.length}</b></span><span>FEE TOTAL <b>₹{(teams.length*registrationFeePerTeam).toLocaleString('en-IN')}</b></span></div></div>
    <div className="registration-form-wrap">
      {loading&&<p className="form-note">Connecting to registration servicesâ€¦</p>}
      {!loading&&loadError&&<div className="service-message" role="alert"><b>Registration is unavailable.</b><p>{loadError}</p><span>No registration was saved.</span></div>}
       {step==='done'&&passphrase ?
    <RegistrationSuccess passphrase={passphrase} onAcknowledge={() => window.location.replace('/portal')}/>
  :(!loading&&!loadError&&step==='done'&&<div className="registration-done"><span className="eyebrow"><span className="eyebrow-line"/> DATABASE CONFIRMATION</span><h2>Teams registered.</h2><p>Supabase confirmed these registrations. Keep the team ID for event communication.</p>{saved.map(row=><div key={row.referenceId}><b>{row.domain}</b><span>{row.teamUid??row.referenceId} · {row.status}</span></div>)}<Link className="button button-red" href="/portal">Open participant portal <ArrowUpRight size={15}/></Link></div>)}
      {!loading&&!loadError&&step==='done'&&<PaymentPanel teams={saved.map(row=>({teamUid:row.teamUid||row.referenceId,label:`${row.domain} · ${row.teamUid??row.referenceId}`,status:row.paymentStatus}))}/>}
      {!loading&&!loadError&&step==='edit'&&<form className="form registration-form" onSubmit={toReview} noValidate>
        <div className="form-heading"><span>TEAM LEADER</span><small>AUTHENTICATED ACCOUNT</small></div>
        <div className="form-grid">
          <label>Full name *<input required minLength={2} maxLength={120} value={leader.name} onChange={e=>setLeader({...leader,name:e.target.value})}/></label>
          <label>Email address *<input type="email" required value={leader.email} onChange={e=>setLeader({...leader,email:e.target.value})}/></label>
          <label>Phone number *<input required minLength={7} maxLength={20} pattern="[+0-9() .-]+" value={leader.phone} onChange={e=>setLeader({...leader,phone:e.target.value})} placeholder="+91â€¦"/></label>
          <label>GitHub username<input value={leader.githubUsername} onChange={e=>setLeader({...leader,githubUsername:e.target.value})} onBlur={e=>setLeader(v=>({...v,githubUsername:normalizeGithubUsername(e.target.value)}))} placeholder="@username or profile link"/></label>
        </div>
        <div className="registration-mode"><div><b>{multiple?'MULTIPLE-DOMAIN REGISTRATION':'SINGLE-DOMAIN REGISTRATION'}</b><span>Each domain has its own team details and members.</span></div><button type="button" disabled={multiple&&teams.length>1} onClick={()=>setMultiple(v=>!v)}>{multiple?(teams.length>1?'Remove extra teams to switch':'Use one team'):'Register multiple teams'} <ArrowRight size={14}/></button></div>
        {teams.map((team,index)=>{const domain=currentDomain(team),official=bySlug(domain?.slug),challengeList=domain?.event_details.challenges?.length?domain.event_details.challenges:official?.challenges??[],challenge=rulesFor(team),soft=['ai-cybersecurity-fintech','full-stack'].includes(domain?.slug??'');return <article className="registration-team-card" key={team.key}>
          <div className="registration-team-head"><div><small>TEAM {String(index+1).padStart(2,'0')} · FEE ₹{registrationFeePerTeam.toLocaleString('en-IN')}</small><h3>{team.teamName||`Team ${index+1}`}</h3></div>{teams.length>1&&<button type="button" aria-label={`Remove team ${index+1}`} onClick={()=>removeTeam(team.key)}><Trash2 size={15}/></button>}</div>
          <div className="form-grid"><label>Team name *<input required minLength={2} maxLength={100} value={team.teamName} onChange={e=>updateTeam(team.key,{teamName:e.target.value})} placeholder="Team name"/></label><label>College / institution *<input required minLength={2} maxLength={180} value={team.institution} onChange={e=>updateTeam(team.key,{institution:e.target.value})} placeholder="College name"/></label><label>College city *<input required minLength={2} maxLength={100} value={team.city} onChange={e=>updateTeam(team.key,{city:e.target.value})} placeholder="City"/></label><label>College state *<input required minLength={2} maxLength={100} value={team.state} onChange={e=>updateTeam(team.key,{state:e.target.value})} placeholder="State"/></label>
            <label>Domain *<select required value={team.domainId} onChange={e=>selectDomain(team.key,e.target.value)}><option value="" disabled>Choose a domain</option>{domains.map(d=><option key={d.id} value={d.id} disabled={selectedIds.has(d.id)&&d.id!==team.domainId}>{d.event_details.eventCode?`${d.event_details.eventCode} — `:''}{d.name}</option>)}</select></label>
            {challengeList.length>1&&<label>Challenge *<select required value={team.challengeId} onChange={e=>updateTeam(team.key,{challengeId:e.target.value})}><option value="" disabled>Select a challenge</option>{challengeList.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          </div>
          {domain&&<div className="team-rules-summary"><span>SELECTED CHALLENGE</span><b>{challenge?.name??domain.name}</b><p>{challenge?.summary??domain.description}</p><div className="rule-facts"><span>TEAM SIZE <b>{sizeLabel(team)}</b></span><span>DURATION <b>{challenge?.duration??domain.event_details.duration??official?.duration??'To be announced'}</b></span></div>{challenge?.requirements?.map(rule=><p className="confirmed-rule" key={rule}>â€¢ {rule}</p>)}{!domain.registration_open&&<strong className="registration-closed">Registration availability: To be announced.</strong>}</div>}
           <div className="form-heading member-heading"><span>TEAM MEMBERS · INCLUDING LEADER: {team.members.length+1}</span><button type="button" className="text-link" onClick={()=>addMember(team)} disabled={!canAddMember(team)}><Plus size={14}/> ADD MEMBER</button></div>
          {team.members.map((member,memberIndex)=><div className="member-block" key={`${team.key}-${memberIndex}`}><div className="member-label"><span>MEMBER {String(memberIndex+2).padStart(2,'0')}</span><button type="button" onClick={()=>removeMember(team,memberIndex)} aria-label="Remove member"><Trash2 size={14}/></button></div><div className="form-grid"><label>Full name *<input required minLength={2} maxLength={120} value={member.fullName} onChange={e=>updateMember(team,memberIndex,'fullName',e.target.value)}/></label><label>Email address *<input type="email" required value={member.email} onChange={e=>updateMember(team,memberIndex,'email',e.target.value)}/></label>{soft&&<label>GitHub username<input value={member.githubUsername} onChange={e=>updateMember(team,memberIndex,'githubUsername',e.target.value)} onBlur={e=>updateMember(team,memberIndex,'githubUsername',normalizeGithubUsername(e.target.value))} placeholder="@username or profile link"/></label>}</div></div>)}
          {soft&&<label className="repo-field">Existing GitHub repository URL (optional)<input type="url" placeholder="https://github.com/team/project" value={team.repositoryUrl} onChange={e=>updateTeam(team.key,{repositoryUrl:e.target.value})}/></label>}
          <label className="check-label"><input type="checkbox" required checked={team.rulesAccepted} onChange={e=>updateTeam(team.key,{rulesAccepted:e.target.checked})}/><span>I acknowledge and accept the published official AVISHKAR 2K26 challenge requirements and event rules.</span></label>
        </article>})}
        {multiple&&teams.length<domains.length&&<button type="button" className="add-domain-team" onClick={addTeam}><Plus size={16}/> Add another domain team</button>}
        <div className="registration-fee-summary"><span>{teams.length} separate {teams.length===1?'team':'teams'}</span><b>₹{(teams.length*registrationFeePerTeam).toLocaleString('en-IN')} total registration fee</b><small>₹{registrationFeePerTeam.toLocaleString('en-IN')} per team. Registration deadline: 21 November 2026. Payment via UPI / online gateway.</small></div>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <button className="button button-red submit-btn" type="submit">Review registration <ArrowRight size={16}/></button>
      </form>}
      {!loading&&!loadError&&step==='review'&&<div className="registration-review"><div className="form-heading"><span>REVIEW BEFORE SUBMITTING</span><small>{teams.length} DOMAIN {teams.length===1?'TEAM':'TEAMS'}</small></div><p>Check each team, its challenge, team members and total fee. Registration is submitted as one database transaction.</p>{teams.map((team,index)=><article key={team.key}><span>TEAM {index+1} / {currentDomain(team)?.name}</span><h3>{team.teamName} · {currentChallenge(team)?.name}</h3><p>{team.institution} · {team.members.length+1} members</p><ul><li>Leader · {leader.name} ({leader.email})</li>{team.members.map(m=><li key={`${m.email}`}>{m.fullName} ({m.email})</li>)}</ul></article>)}<div className="registration-fee-summary"><span>{teams.length} teams</span><b>₹{(teams.length*registrationFeePerTeam).toLocaleString('en-IN')}</b><small>No payment is taken in this step.</small></div>{error&&<p className="form-error" role="alert">{error}</p>}<div className="captcha-review"><span className="eyebrow">SECURITY CHECK</span><p>Complete this quick verification to protect registrations from automated submissions.</p><TurnstileCaptcha key={captchaVersion} onToken={handleCaptchaToken}/></div><div className="review-actions"><button className="button button-red" onClick={()=>setStep('edit')}><ArrowLeft size={15}/> Edit teams</button><button className="button button-red" onClick={()=>void submit()} disabled={busy}>{busy?'Saving registrationsâ€¦':'Submit registrations'} <ArrowUpRight size={15}/></button></div></div>}
    </div>
  </section>;
}
