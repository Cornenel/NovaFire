import Image from "next/image";
import Link from "next/link";

const LEGAL_LINKS = [
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Terms", href: "/legal/terms" },
  { label: "Cookies", href: "/legal/cookies" },
  { label: "Disclaimer", href: "/legal/disclaimer" },
] as const;

const QUICK_LINKS = [
  { label: "Services", href: "/services" },
  { label: "Industries", href: "/industries" },
  { label: "Compliance", href: "/compliance" },
  { label: "Training", href: "/training" },
  { label: "Service areas", href: "/areas" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Request a quote", href: "/services#quote" },
  { label: "Client portal", href: "/client-portal/login" },
  { label: "Staff login", href: "/tech-login" },
] as const;

export function LegalNav({ className }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-sm text-zinc-500">
        {LEGAL_LINKS.map(({ label, href }, i) => (
          <li key={href} className="flex items-center gap-x-1">
            {i > 0 ? (
              <span className="select-none px-2 text-zinc-700" aria-hidden>
                ·
              </span>
            ) : null}
            <Link
              href={href}
              className="px-1 underline-offset-4 transition-colors hover:text-zinc-200 hover:underline"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteFooter({ variant = "full" }: { variant?: "full" | "compact" }) {
  if (variant === "compact") {
    return (
      <footer className="nf-bg-base relative mt-auto border-t border-white/[0.06] py-10">
        <div className="nf-container flex flex-col items-center gap-6 text-center">
          <LegalNav />
          <p className="text-sm text-zinc-600">
            © {new Date().getFullYear()} Nova Fire. All rights reserved.
          </p>
          <Link
            href="/"
            className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
          >
            ← Back to home
          </Link>
        </div>
      </footer>
    );
  }

  return (
    <footer id="contact" className="nf-bg-base relative border-t border-white/[0.06] pt-20 pb-12">
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent"
        aria-hidden
      />
      <div className="nf-container">
        <div className="mb-16 grid gap-12 md:grid-cols-4 md:gap-10">
          <div>
            <span className="inline-flex items-center gap-2.5 font-[family-name:var(--font-syne)] text-2xl font-bold text-zinc-50">
              <span className="nf-seal relative h-10 w-10 overflow-hidden rounded-full border border-red-500/40 bg-[#161616]">
                <Image
                  src="/brand/logo-mark.png"
                  alt=""
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              </span>
              <span>
                Nova<span className="text-red-500">Fire</span>
              </span>
            </span>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-zinc-400">
              Professional fire protection, equipment servicing and compliance support across
              Mpumalanga and Limpopo.
            </p>
          </div>
          <div>
            <h4 className="mb-5 text-sm font-semibold tracking-wider text-zinc-300 uppercase">
              Quick links
            </h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              {QUICK_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="transition-colors hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-5 text-sm font-semibold tracking-wider text-zinc-300 uppercase">
              Contact
            </h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li>
                <a href="tel:+27662700293" className="transition-colors hover:text-white">
                  066 270 0293
                </a>
              </li>
              <li>
                <a
                  href="mailto:jacques@novafire.co.za"
                  className="transition-colors hover:text-white"
                >
                  jacques@novafire.co.za
                </a>
              </li>
              <li>Mpumalanga &amp; Limpopo, South Africa</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-5 text-sm font-semibold tracking-wider text-zinc-300 uppercase">
              Standards &amp; practice
            </h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li>Work aligned to applicable SANS servicing practice</li>
              <li>Documented service records and equipment registers</li>
              <li>
                Specific accreditation marks published only when independently verified
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-6 border-t border-white/[0.06] pt-8">
          <LegalNav />
          <p className="text-center text-sm text-zinc-600">
            © {new Date().getFullYear()} Nova Fire. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
