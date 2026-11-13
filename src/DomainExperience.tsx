import { ArrowUpRight, Atom, Code2, Hammer, Radio, Shield } from 'lucide-react';
import { eventDomains, type DomainChallenge, type EventDomain } from '@/lib/domain-content';
import { registrationUrl } from '@/lib/portal-links.mjs';

const icons = [Shield, Code2, Radio, Hammer, Atom];

function teamSize(domain: EventDomain, challenge: DomainChallenge) {
  const min = challenge.minTeamSize ?? domain.minTeamSize;
  const max = challenge.maxTeamSize ?? domain.maxTeamSize;
  if (min && max) return min === max ? `${min} members` : `${min}–${max} members`;
  if (max) return `Maximum ${max} members`;
}

export default function DomainExperience({ slug }: { slug?: string }) {
  return (
    <div className="domain-experience-grid">
      {eventDomains.map((domain, index) => {
        if (slug && domain.slug !== slug) return null;
        const Icon = icons[index] ?? Atom;
        return (
          <article className="experience-card" key={domain.slug}>
            <div className="experience-card-top"><span>{domain.number} / {domain.code}</span><Icon size={23} aria-hidden="true" /></div>
            <h3>{domain.name}</h3>
            <p>{domain.short}</p>
            <dl className="domain-contacts">
              {domain.coordinators.map(({ role, name, phone }) => (
                <div key={role}>
                  <dt>{role}</dt>
                  <dd><a href={`tel:${phone.replace(/\s/g, '')}`}>{name} · {phone}</a></dd>
                </div>
              ))}
            </dl>
            <details className="domain-rules">
              <summary>Rules &amp; challenges</summary>
              <p>{domain.description}</p>
              {!!domain.focus?.length && <><h4>Focus areas</h4><ul>{domain.focus.map(item => <li key={item}>{item}</li>)}</ul></>}
              {domain.challenges.map(challenge => (
                <section key={challenge.id}>
                  <h4>{challenge.name}</h4>
                  <p>{[teamSize(domain, challenge), challenge.duration ?? domain.duration].filter(Boolean).join(' · ')}</p>
                  <p>{challenge.summary}</p>
                  <h5>Requirements &amp; rules</h5>
                  <ul>{challenge.requirements.map(item => <li key={item}>{item}</li>)}</ul>
                  <h5>Evaluation</h5>
                  <ul>{challenge.evaluation.map(item => <li key={item}>{item}</li>)}</ul>
                </section>
              ))}
              <p>All participants must report with institutional ID at BGS Seminar Hall.</p>
            </details>
            <div className="experience-actions">
              <span>Registration open</span>
              <a className="button button-red" href={registrationUrl} aria-label={`Register for ${domain.name}`}>Register <ArrowUpRight size={14} /></a>
            </div>
          </article>
        );
      })}
    </div>
  );
}
