import type { Metadata } from "next";
import Link from "next/link";
import { ServiceAreaStructuredData } from "@/components/structured-data";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Fire extinguisher servicing (portable) | Mpumalanga & Limpopo",
  description:
    "Portable fire extinguisher servicing in Mpumalanga and Limpopo. Certified inspections, maintenance, replacements where required, and compliant documentation aligned with SANS requirements.",
  alternates: { canonical: "/services/fire-extinguisher-servicing" },
};

export default function FireExtinguisherServicingPage() {
  return (
    <div className="min-h-screen nf-bg-base flex flex-col">
      <ServiceAreaStructuredData
        name="Portable fire extinguisher servicing"
        url="https://novafire.co.za/services/fire-extinguisher-servicing"
        areas={["Mpumalanga", "Limpopo"]}
        services={[
          "Portable fire extinguisher servicing",
          "Inspection and certification",
          "Replacement and recharge where required",
        ]}
      />
      <Navbar />

      <main className="flex-1 pt-28 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.25em] mb-3">
            Servicing
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white font-[family-name:var(--font-syne)] leading-tight">
            Portable fire extinguisher servicing in Mpumalanga & Limpopo
          </h1>
          <p className="text-zinc-400 mt-5 text-base md:text-lg leading-relaxed">
            Keep your site audit-ready with scheduled extinguisher inspections, maintenance, and
            documentation. We service portable extinguishers for lodges, estates, farms, warehouses,
            and commercial facilities across Mpumalanga and Limpopo.
          </p>

          <div className="mt-10 grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7">
              <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                What’s included
              </h2>
              <ul className="text-sm text-zinc-500 space-y-2">
                <li>Inspection and condition checks</li>
                <li>Servicing to manufacturer requirements</li>
                <li>Replacement/recharge where required</li>
                <li>Site register and compliance documentation</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7">
              <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                Who we help
              </h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Hospitality & lodges, estates, property managers, industrial sites, and commercial
                facilities that need reliable servicing and paperwork that stands up to audits.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Button asChild className="bg-red-600 hover:bg-red-500">
              <Link href="/services#request-quote">Request a quote</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/20 text-zinc-400 hover:text-white">
              <Link href="/services">Back to services</Link>
            </Button>
          </div>
        </div>
      </main>

      <SiteFooter variant="compact" />
    </div>
  );
}

