import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ContactForm } from '@/components/ContactForm';
import { siteConfig } from '@/lib/site.config';

export const metadata = { title: 'Contact' };

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-lg px-4 py-16 outline-none">
        <h1 className="font-display text-3xl font-bold text-silver-bright">Contact</h1>
        <p className="mt-3 text-text-muted">
          Questions about a set, a quote, or an order? Send a note — or email / call directly.
        </p>
        <p className="mt-2 space-y-1 text-sm text-steel">
          <a
            href={`mailto:${siteConfig.contactEmail}`}
            className="block text-silver underline hover:text-silver-bright"
          >
            {siteConfig.contactEmail}
          </a>
          <a
            href={`tel:+1${siteConfig.contactPhone}`}
            className="block hover:text-silver"
          >
            {siteConfig.contactPhoneDisplay}
          </a>
          <span className="block">{siteConfig.location}</span>
        </p>
        <div className="mt-8">
          <ContactForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
