import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// `/` redirects to /apply for now — the application form is the landing page.
// The landing hub (`LandingHub` below) is kept but not rendered. To restore the
// hub, make `LandingHub` the default export and remove this redirect.
export default function HomePage() {
  redirect('/apply');
}

export const metadata = {
  title: 'FAFICS — Expertise Pool',
  description:
    'Federation of Associations of Former International Civil Servants — Expertise Pool. Apply, track your application, or sign in as an officer.',
};

// ---------------------------------------------------------------------------
// Landing hub — currently disabled (not the default export). Re-enable by
// swapping this in for HomePage above.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LandingHub() {
  return (
    <div className="min-h-screen bg-off-white flex flex-col">
      {/* Hero */}
      <div className="bg-navy text-white px-4 md:px-8 py-12 lg:py-16 border-t border-white/10">
        <div className="max-w-[1020px] mx-auto text-center">
          <div className="mx-auto mb-6 flex h-[80px] w-[80px] items-center justify-center">
            <Image src="/logo.png" alt="FAFICS" width={80} height={80} className="h-full w-full object-contain" priority />
          </div>
          <div className="text-[12px] uppercase tracking-[0.1em] text-gold font-bold mb-3">
            Volunteer Programme
          </div>
          <h1 className="font-serif text-[30px] md:text-[40px] font-bold mb-4 leading-tight">
            Federation&apos;s Expertise Pool
          </h1>
          <p className="text-[14px] md:text-[15px] text-white/80 max-w-[660px] leading-relaxed mx-auto">
            For all former International Civil Servants wishing to volunteer their experience.
            Start a new application, check the status of an existing one, or sign in as a FAFICS
            officer.
          </p>
        </div>
      </div>

      {/* Action cards */}
      <div className="max-w-[1020px] mx-auto w-full px-4 md:px-8 py-12 lg:py-16 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Apply */}
          <Link
            href="/apply"
            className="group bg-white border border-border rounded-theme shadow-theme p-7 flex flex-col transition-all duration-150 hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(13,34,64,0.12)] hover:border-navy/40"
          >
            <div className="w-12 h-12 rounded-full bg-navy flex items-center justify-center mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="#C8973A" strokeWidth="1.6" className="w-6 h-6">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </div>
            <h2 className="font-serif text-[22px] font-bold text-navy mb-2">Start your application</h2>
            <p className="text-[14px] text-text-mid leading-relaxed flex-1">
              Begin the Expertise Pool volunteer form. Your progress is saved as you go.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-navy group-hover:text-gold transition-colors">
              Apply now
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>

          {/* Check status */}
          <Link
            href="/status"
            className="group bg-white border border-border rounded-theme shadow-theme p-7 flex flex-col transition-all duration-150 hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(13,34,64,0.12)] hover:border-navy/40"
          >
            <div className="w-12 h-12 rounded-full bg-navy flex items-center justify-center mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="#C8973A" strokeWidth="1.6" className="w-6 h-6">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <h2 className="font-serif text-[22px] font-bold text-navy mb-2">Check application status</h2>
            <p className="text-[14px] text-text-mid leading-relaxed flex-1">
              Track a submitted application, or retrieve a link to a saved draft by email.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-navy group-hover:text-gold transition-colors">
              Check status
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>
        </div>

        {/* Subtle officer entry */}
        <div className="mt-8 text-center">
          <Link
            href="/admin/login"
            className="text-[13px] text-text-muted hover:text-navy transition-colors"
          >
            FAFICS officer? Sign in →
          </Link>
        </div>
      </div>
    </div>
  );
}
