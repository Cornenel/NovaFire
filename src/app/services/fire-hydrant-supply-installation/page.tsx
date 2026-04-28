import type { Metadata } from "next";
import Link from "next/link";
import { ServiceAreaStructuredData } from "@/components/structured-data";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Fire hydrant supply & installation | Mpumalanga & Limpopo",
  description:
    "Fire hydrant supply and installation in Mpumalanga and Limpopo. Site assessment, equipment specification, professional installation, and documentation to support compliance.",
  alternates: { canonical: "/services/fire-hydrant-supply-installation" },
};

export default function FireHydrantSupplyInstallationPage() {
  return (
    <div className="min-h-screen nf-bg-base flex flex-col">
      <ServiceAreaStructuredData
        name="Fire hydrant supply and installation"
        url="https://novafire.co.za/services/fire-hydrant-supply-installation"
        areas={["Mpumalanga", "Limpopo"]}
        services={[
          "Fire hydrant supply and installation",
          "Equipment specification and installation",
          "Commissioning and documentation",
        ]}
      />
      <Navbar />

      <main className="flex-1 pt-28 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.25em] mb-3">
            Supply & Installation
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white font-[family-name:var(--font-syne)] leading-tight">
            Fire hydrant supply & installation in Mpumalanga & Limpopo
          </h1>
          <p className="text-zinc-400 mt-5 text-base md:text-lg leading-relaxed">
            We supply and install hydrant components and related fixed fire equipment for commercial
            and industrial sites. Get a clear scope, professional installation, and documentation that
            supports compliance requirements across Mpumalanga and Limpopo.
          </p>

          <div className="mt-10 grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7">
              <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                Typical scope
              </h2>
              <ul className="text-sm text-zinc-500 space-y-2">
                <li>Site assessment and equipment specification</li>
                <li>Supply of hydrant components</li>
                <li>Installation coordination and commissioning support</li>
                <li>Service scheduling and ongoing maintenance plan</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7">
              <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                Bundle with hose reels & detection
              </h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Many sites install hydrants alongside hose reels, extinguishers, signage, and detection
                systems. We can scope supply and installation as one coordinated project.
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

