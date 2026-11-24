import { redirect } from 'next/navigation';

export const metadata = { title: 'Build' };

/** Waitlist retired — send people to the builder. */
export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ design?: string; ref?: string }>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.design) q.set('design', sp.design);
  if (sp.ref) q.set('ref', sp.ref);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  redirect(`/build${suffix}`);
}
