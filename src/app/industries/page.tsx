import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import {
  MarketingContainer,
  MarketingCta,
  MarketingPanel,
} from "@/components/marketing/primitives";

export const metadata: Metadata = {
  title: "Industries",
  description:
    "Fire protection and servicing solutions for lodges, estates, commercial facilities, industrial sites, schools and agriculture in Mpumalanga and Limpopo.",
  alternates: { canonical: "/industries" },
};

const INDUSTRIES = [
  {
    id: "lodges",
    title: "Lodges & hospitality",
    body: "Remote access, guest operations and insurer expectations require reliable extinguisher, hose reel and documentation programmes that do not disrupt the guest experience.",
  },
  {
    id: "estates",
    title: "Estates & residential complexes",
    body: "Gatehouses, common areas and multi-building portfolios need clear asset registers, due dates and released service records for managers and body corporates.",
  },
  {
    id: "commercial",
    title: "Commercial facilities",
    body: "Offices, retail and mixed-use sites benefit from scheduled servicing, defect follow-up and audit-ready paperwork for landlords and tenants.",
  },
  {
    id: "industrial",
    title: "Industrial & agriculture",
    body: "Workshops, cold stores, packing facilities and agri operations need equipment matched to hazard profiles, with practical access planning for technicians.",
  },
  {
    id: "schools",
    title: "Schools & institutions",
    body: "Education and community facilities require dependable extinguisher coverage, signage clarity and documentation suitable for governance and safety committees.",
  },
  {
    id: "wildlife",
    title: "Wildlife & conservation properties",
    body: "Conservation and wildlife properties often combine lodge, staff housing and workshop risks — we scope equipment and servicing to the actual site layout.",
  },
] as const;

export default function IndustriesPage() {
  return (
    <MarketingPageShell
      eyebrow="Industries"
      title="Sector-aware fire protection for Mpumalanga and Limpopo"
      description="Useful guidance by property type — not thin duplicate SEO pages. Every site still needs a scoped survey."
    >
      <section className="nf-section">
        <MarketingContainer className="grid gap-5 md:grid-cols-2">
          {INDUSTRIES.map((item) => (
            <MarketingPanel key={item.id} id={item.id} className="scroll-mt-28">
              <h2 className="font-[family-name:var(--font-syne)] text-2xl font-semibold">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{item.body}</p>
              <Link
                href="/services#quote"
                className="mt-5 inline-flex text-sm font-medium text-red-400 hover:text-red-300"
              >
                Request a quote for this sector →
              </Link>
            </MarketingPanel>
          ))}
        </MarketingContainer>
        <MarketingContainer className="mt-12 text-center">
          <MarketingCta href="/services#quote">Discuss your site</MarketingCta>
        </MarketingContainer>
      </section>
    </MarketingPageShell>
  );
}
