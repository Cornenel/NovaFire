import type { Metadata } from "next";
import Link from "next/link";
import { ServiceAreaStructuredData } from "@/components/structured-data";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Fire hose reel servicing (fixed) | Mpumalanga & Limpopo",
  description:
    "Fire hose reel servicing in Mpumalanga and Limpopo. Inspection, testing, maintenance, and compliant documentation for fixed hose reel installations.",
  alternates: { canonical: "/services/fire-hose-reel-servicing" },
};

export default function FireHoseReelServicingPage() {
  return (
    <div className="min-h-screen nf-bg-base flex flex-col">
      <ServiceAreaStructuredData
        name="Fire hose reel servicing"
        url="https://novafire.co.za/services/fire-hose-reel-servicing"
        areas={["Mpumalanga", "Limpopo"]}
        services={[
          "Fire hose reel servicing",
          "Inspection and testing",
          "Maintenance and reporting",
        ]}
      />
      <Navbar />

      <main className="flex-1 pt-28 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.25em] mb-3">
            Servicing
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white font-[family-name:var(--font-syne)] leading-tight">
            Fire hose reel servicing in Mpumalanga & Limpopo
          </h1>
          <p className="text-zinc-400 mt-5 text-base md:text-lg leading-relaxed">
            Hose reels are a critical first-response system. We service fixed hose reel installations
            with inspection, testing, maintenance, and documentation to keep your site operational and
            audit-ready across Mpumalanga and Limpopo.
          </p>

          <div className="mt-10 grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7">
              <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                What’s included
              </h2>
              <ul className="text-sm text-zinc-500 space-y-2">
                <li>Inspection of drum, hose, nozzle, valves</li>
                <li>Operational testing and pressure checks</li>
                <li>Maintenance and replacement where required</li>
                <li>Compliance documentation and reporting</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7">
              <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                Fixed equipment servicing
              </h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                We can bundle hose reel servicing with hydrants, suppression, extinguishers, and
                detection systems to simplify your maintenance schedule.
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

