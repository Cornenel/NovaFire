import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import {
  MarketingContainer,
  MarketingCta,
  MarketingPanel,
  SectionHeading,
} from "@/components/marketing/primitives";

export const metadata: Metadata = {
  title: "Compliance",
  description:
    "How Nova Fire approaches routine servicing, corrective work, pressure testing, service certificates, equipment registers and South African standards — without unsupported legal guarantees.",
  alternates: { canonical: "/compliance" },
};

export default function CompliancePage() {
  return (
    <MarketingPageShell
      eyebrow="Compliance"
      title="Servicing, evidence and standards — explained clearly"
      description="Compliance is not a slogan. It is a combination of competent work, applicable procedures, honest findings and durable documentation."
    >
      <section className="nf-section border-b border-white/[0.06]">
        <MarketingContainer className="grid gap-6 lg:grid-cols-2">
          <MarketingPanel>
            <h2 className="font-[family-name:var(--font-syne)] text-2xl font-semibold">
              Routine servicing
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              Scheduled inspections and maintenance of portable and fixed fire equipment according
              to the agreed programme. Findings are recorded per device. A completed visit does not
              automatically mean every asset passed, and it does not certify whole-building
              compliance.
            </p>
          </MarketingPanel>
          <MarketingPanel>
            <h2 className="font-[family-name:var(--font-syne)] text-2xl font-semibold">
              Corrective work &amp; pressure testing
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              Defects, replacements, recharges and pressure testing are scoped separately from
              routine checks. Quantities, parts and technical outcomes are reviewed before billing
              and before any released technical document is finalised.
            </p>
          </MarketingPanel>
        </MarketingContainer>
      </section>

      <section className="nf-section">
        <MarketingContainer>
          <SectionHeading
            eyebrow="Documentation"
            title="What you can expect to receive"
            description="Document titles should match the work performed. Not every output is a Certificate of Compliance."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Service records",
                body: "Evidence of work performed on listed equipment, with technician attribution and dates.",
              },
              {
                title: "Equipment registers",
                body: "Living inventories of assets, locations and service history for authorised sites.",
              },
              {
                title: "Defect notifications",
                body: "Clear records of findings that need assessment, quotation or follow-up verification.",
              },
            ].map((item) => (
              <MarketingPanel key={item.title}>
                <h3 className="font-semibold text-zinc-100">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{item.body}</p>
              </MarketingPanel>
            ))}
          </div>
        </MarketingContainer>
      </section>

      <section className="border-t border-white/[0.06] bg-[#0f0f0f] py-20">
        <MarketingContainer className="max-w-3xl">
          <SectionHeading
            eyebrow="South African standards"
            title="SANS practice, stated carefully"
            description="Where portable fire extinguisher servicing is concerned, SANS 1475 Part 1 is the relevant reference family. Fixed installations such as hose reels are addressed under SANS 1475 Part 2. Signage and other disciplines reference their own applicable parts. We do not claim universal legal certification of a building from a questionnaire or a single service visit."
          />
          <p className="mt-6 text-sm leading-7 text-zinc-500">
            Specific permit numbers, registration marks and accreditation logos are published only
            after business verification. Until then, marketing pages describe practice and
            documentation — not invented credentials.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <MarketingCta href="/services#quote">Request a quote</MarketingCta>
            <MarketingCta href="/contact" variant="secondary">
              Ask a compliance question
            </MarketingCta>
          </div>
        </MarketingContainer>
      </section>
    </MarketingPageShell>
  );
}
