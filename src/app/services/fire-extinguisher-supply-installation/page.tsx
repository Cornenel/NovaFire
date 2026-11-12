import type { Metadata } from "next";
import Link from "next/link";
import { ServiceAreaStructuredData } from "@/components/structured-data";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Fire extinguisher supplier & installation | Mpumalanga & Limpopo",
  description:
    "Fire extinguisher supplier for Mpumalanga and Limpopo. Supply and install portable DCP, CO2 and related extinguishers with site scoping, mounting and follow-up servicing.",
  alternates: { canonical: "/services/fire-extinguisher-supply-installation" },
  openGraph: {
    title: "Fire extinguisher supplier & installation | Mpumalanga & Limpopo",
    description:
      "Supply and install portable fire extinguishers for lodges, estates, commercial and industrial sites across Mpumalanga and Limpopo.",
    url: absoluteUrl("/services/fire-extinguisher-supply-installation"),
  },
};

export default function FireExtinguisherSupplyInstallationPage() {
  return (
    <div className="min-h-screen nf-bg-base flex flex-col">
      <ServiceAreaStructuredData
        name="Fire extinguisher supply and installation"
        url={absoluteUrl("/services/fire-extinguisher-supply-installation")}
        areas={["Mpumalanga", "Limpopo"]}
        services={[
          "Fire extinguisher supply",
          "Fire extinguisher installation",
          "Portable extinguisher replacement",
          "Wall bracket and mounting supply",
        ]}
      />
      <Navbar />

      <main className="flex-1 pt-28 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.25em] mb-3">
            Supply &amp; Installation
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white font-[family-name:var(--font-syne)] leading-tight">
            Fire extinguisher supplier for Mpumalanga &amp; Limpopo
          </h1>
          <p className="text-zinc-400 mt-5 text-base md:text-lg leading-relaxed">
            Nova Fire supplies and installs portable fire extinguishers for lodges, estates, farms,
            warehouses and commercial sites. Get the right unit sizes for your risk, professional
            mounting, and a servicing plan that keeps equipment audit-ready.
          </p>

          <div className="mt-10 grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7">
              <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                What we supply
              </h2>
              <ul className="text-sm text-zinc-500 space-y-2">
                <li>9kg and other portable DCP extinguishers</li>
                <li>CO2 and specialty extinguishers where scoped</li>
                <li>Wall brackets, seals, gauges and related spares</li>
                <li>Replacement units after discharge or condemnation</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7">
              <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                Installation &amp; follow-up
              </h2>
              <ul className="text-sm text-zinc-500 space-y-2">
                <li>Site walk-through and quantity recommendation</li>
                <li>Mounting and placement for accessibility</li>
                <li>Commissioning checks and labelling</li>
                <li>Scheduled servicing after installation</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-white/[0.07] nf-glass-panel p-7">
            <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
              Service company and supplier in one programme
            </h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Many Mpumalanga and Limpopo sites need both supply and ongoing extinguisher servicing.
              We can quote new equipment, install it, and keep the portable extinguisher register
              current with inspections, recharge work and documentation.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link
                href="/services/fire-extinguisher-servicing"
                className="text-zinc-300 underline-offset-4 hover:text-white hover:underline"
              >
                Fire extinguisher servicing
              </Link>
              <Link
                href="/services/fire-hydrant-supply-installation"
                className="text-zinc-300 underline-offset-4 hover:text-white hover:underline"
              >
                Hydrant supply &amp; installation
              </Link>
              <Link
                href="/areas"
                className="text-zinc-300 underline-offset-4 hover:text-white hover:underline"
              >
                Service areas
              </Link>
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
