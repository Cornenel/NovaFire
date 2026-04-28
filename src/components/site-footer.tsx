import Link from "next/link";
import { Flame } from "lucide-react";

const LEGAL_LINKS = [
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Terms", href: "/legal/terms" },
  { label: "Cookies", href: "/legal/cookies" },
  { label: "Disclaimer", href: "/legal/disclaimer" },
] as const;

const DEFAULT_QUICK = [
  { label: "Services", href: "/services" },
  { label: "Training", href: "/training" },
  { label: "Why Nova Fire", href: "/#whynovafire" },
  { label: "Industries", href: "/#industries" },
  { label: "Process", href: "/#process" },
] as const;

export function LegalNav({ className }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-sm text-zinc-500">
        {LEGAL_LINKS.map(({ label, href }, i) => (
          <li key={href} className="flex items-center gap-x-1">
            {i > 0 && (
              <span className="text-zinc-700 px-2 select-none" aria-hidden>
                ·
              </span>
            )}
            <Link
              href={href}
              className="hover:text-orange-200/90 transition-colors px-1 underline-offset-4 hover:underline decoration-red-500/40"
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
      <footer className="relative nf-bg-base border-t border-white/[0.06] py-10 mt-auto">
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/25 to-transparent"
          aria-hidden
        />
        <div className="container mx-auto px-6 flex flex-col items-center gap-6 text-center">
          <LegalNav />
          <p className="text-zinc-600 text-sm">
            © {new Date().getFullYear()} Nova Fire. All rights reserved.
          </p>
          <Link
            href="/"
            className="text-sm font-medium text-orange-400/90 hover:text-orange-300 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </footer>
    );
  }

  return (
    <footer id="contact" className="relative nf-bg-base border-t border-white/[0.06] pt-20 pb-12">
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent"
        aria-hidden
      />
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-16 mb-16">
          <div>
            <span className="inline-flex items-center gap-2.5 text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-gradient-to-br from-red-950/60 to-zinc-950/80 shadow-[0_0_28px_rgba(220,38,38,0.12)]">
                <Flame className="h-5 w-5 text-orange-400/90" strokeWidth={2} />
              </span>
              <span>
                Nova
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-red-600">
                  Fire
                </span>
              </span>
            </span>
            <p className="mt-5 text-zinc-500 text-sm leading-relaxed max-w-xs">
              Fire protection, compliance, and safety solutions. South Africa.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider text-orange-200/70">
              Quick Links
            </h4>
            <ul className="space-y-4 text-sm text-zinc-400">
              {DEFAULT_QUICK.map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="hover:text-white transition-colors duration-200">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider text-orange-200/70">
              Contact
            </h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li>
                <a href="tel:+27662700293" className="hover:text-white transition-colors">
                  066 270 0293
                </a>
              </li>
              <li>
                <a href="mailto:jacques@novafire.co.za" className="hover:text-white transition-colors">
                  jacques@novafire.co.za
                </a>
              </li>
              <li>South Africa</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider text-orange-200/70">
              Accreditations
            </h4>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li>BSI accredited</li>
              <li>SANS 1475</li>
              <li>SAQCC</li>
              <li>ISO 9001</li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/[0.06] flex flex-col gap-6">
          <LegalNav />
          <p className="text-center text-zinc-600 text-sm">
            © {new Date().getFullYear()} Nova Fire. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
