import type { Metadata } from "next";
import Image from "next/image";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import {
  MarketingContainer,
  MarketingCta,
  MarketingPanel,
} from "@/components/marketing/primitives";

export const metadata: Metadata = {
  title: "About",
  description:
    "Nova Fire provides fire protection, equipment servicing and compliance support focused on Mpumalanga and Limpopo, South Africa.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <MarketingPageShell
      eyebrow="About Nova Fire"
      title="A regional fire protection partner with operational discipline"
      description="We focus on professional servicing, supply and documentation for the properties that keep our provinces working — hospitality, estates, commercial, industrial and institutional sites."
    >
      <section className="nf-section">
        <MarketingContainer className="grid items-center gap-10 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/[0.08]">
            <Image
              src="/brand/logo.png"
              alt="Nova Fire logo"
              fill
              className="object-contain bg-black p-10"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>
          <div className="space-y-5 text-sm leading-7 text-zinc-400">
            <p>
              Nova Fire is a South African fire protection business serving Mpumalanga and Limpopo.
              Our work covers portable and fixed fire equipment, related supply and installation,
              documentation, and practical support for site managers who need reliable servicing
              cycles.
            </p>
            <p>
              We do not invent qualifications or publish accreditation marks without verification.
              Where a capability depends on specialist partners or additional authorisation, we say
              so in scoping conversations.
            </p>
            <MarketingPanel className="!p-5">
              <p className="text-zinc-300">
                Contact:{" "}
                <a className="text-red-400 hover:text-red-300" href="tel:+27662700293">
                  066 270 0293
                </a>
                <br />
                Email:{" "}
                <a
                  className="text-red-400 hover:text-red-300"
                  href="mailto:jacques@novafire.co.za"
                >
                  jacques@novafire.co.za
                </a>
                <br />
                Web: novafire.co.za
              </p>
            </MarketingPanel>
            <MarketingCta href="/contact">Contact the team</MarketingCta>
          </div>
        </MarketingContainer>
      </section>
    </MarketingPageShell>
  );
}
