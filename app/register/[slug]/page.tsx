import { redirect, notFound } from 'next/navigation';
import { eventDomains } from '@/lib/domain-content';

export default function EventRegistrationRoute({ params }: { params: { slug: string } }) {
  const slug = params.slug === 'theodo' ? 'civilx' : params.slug;
  if (!eventDomains.some(domain => domain.slug === slug)) notFound();
  redirect(`/register?domain=${encodeURIComponent(slug)}`);
}
