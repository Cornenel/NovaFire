import type { Metadata } from "next";
import { QuoteRequestForm } from "@/components/forms/quote-request-form";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import {
  MarketingContainer,
  MarketingPanel,
} from "@/components/marketing/primitives";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Nova Fire for quotations, servicing enquiries and training across Mpumalanga and Limpopo.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <MarketingPageShell
      eyebrow="Contact"
      title="Speak to the Nova Fire office"
      description="Call, email, or send a quotation request. We respond with scoped guidance for your site — not automated promises we cannot verify."
    >
      <section className="nf-section">
        <MarketingContainer className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <MarketingPanel>
            <h2 className="font-[family-name:var(--font-syne)] text-2xl font-semibold">
              Direct channels
            </h2>
            <ul className="mt-6 space-y-4 text-sm text-zinc-300">
              <li>
                <span className="block text-xs tracking-[0.2em] text-zinc-500 uppercase">
                  Telephone
                </span>
                <a href="tel:+27662700293" className="mt-1 inline-block text-lg text-white">
                  066 270 0293
                </a>
              </li>
              <li>
                <span className="block text-xs tracking-[0.2em] text-zinc-500 uppercase">
                  Email
                </span>
                <a
                  href="mailto:jacques@novafire.co.za"
                  className="mt-1 inline-block text-lg text-white"
                >
                  jacques@novafire.co.za
                </a>
              </li>
              <li>
                <span className="block text-xs tracking-[0.2em] text-zinc-500 uppercase">
                  Coverage
                </span>
                <p className="mt-1 text-zinc-400">Mpumalanga &amp; Limpopo, South Africa</p>
              </li>
            </ul>
          </MarketingPanel>

          <div id="quote" className="scroll-mt-28">
            <h2 className="mb-4 font-[family-name:var(--font-syne)] text-2xl font-semibold">
              Request a quotation
            </h2>
            <p className="mb-6 text-sm text-zinc-400">
              Uses the existing Nova Fire quote submission workflow. No change to server actions or
              data handling.
            </p>
            <QuoteRequestForm />
          </div>
        </MarketingContainer>
      </section>
    </MarketingPageShell>
  );
}
