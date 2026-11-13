import { notFound, redirect } from 'next/navigation';
import App from '@/src/App';
import { eventDomains } from '@/lib/domain-content';

export default function EventDetailRoute({ params }: { params: { slug: string } }) {
  if (params.slug === 'theodo') redirect('/events/civilx');
  if (!eventDomains.some(domain => domain.slug === params.slug)) notFound();
  return <App page="event" eventSlug={params.slug} />;
}
