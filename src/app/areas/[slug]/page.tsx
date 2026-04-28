import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { ServiceAreaStructuredData } from "@/components/structured-data";
import { Button } from "@/components/ui/button";
import { SERVICE_AREAS, getServiceArea } from "@/lib/service-areas";

export function generateStaticParams() {
  return SERVICE_AREAS.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const area = getServiceArea(params.slug);
  if (!area) return {};
  const title = `Fire equipment servicing & installations in ${area.name}`;
  const description = `Portable and fixed fire equipment servicing, fire detection servicing, and supply & installation in ${area.name}, ${area.province}. Extinguishers, hose reels, hydrants, and compliance support.`;
  return {
    title,
    description,
    alternates: { canonical: `/areas/${area.slug}` },
    openGraph: {
      title: `${title} | Mpumalanga & Limpopo`,
      description,
      url: `https://novafire.co.za/areas/${area.slug}`,
    },
  };
}

export default function AreaPage({ params }: { params: { slug: string } }) {
  const area = getServiceArea(params.slug);
  if (!area) notFound();

  return (
    <div className="min-h-screen nf-bg-base flex flex-col">
      <ServiceAreaStructuredData
        name={`Fire services in ${area.name}`}
        url={`https://novafire.co.za/areas/${area.slug}`}
        areas={[area.name, area.province]}
        services={[
          "Portable fire extinguisher servicing",
          "Fixed fire equipment servicing (hose reels / hydrants / suppression)",
          "Fire detection and alarm servicing",
          "Fire extinguisher supply and installation",
          "Fire hose reel supply and installation",
          "Fire hydrant supply and installation",
        ]}
      />

      <Navbar />
      <main className="flex-1 pt-28 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.25em] mb-3">
            {area.province} • Service Area
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white font-[family-name:var(--font-syne)] leading-tight">
            Fire equipment servicing & installations in {area.name}
          </h1>
          <p className="text-zinc-400 mt-5 text-base md:text-lg leading-relaxed">
            Nova Fire supports sites in {area.name} with portable and fixed fire equipment servicing,
            fire detection servicing, and supply & installation. We work with extinguishers, hose reels,
            hydrants, and compliant documentation to keep your business audit-ready.
          </p>

          <div className="mt-10 grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7">
              <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                Common requests in {area.name}
              </h2>
              <ul className="text-sm text-zinc-500 space-y-2">
                <li>Portable fire extinguisher servicing</li>
                <li>Hose reel servicing and testing</li>
                <li>Hydrant equipment supply & installation</li>
                <li>Fire detection and alarm servicing</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7">
              <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                Related service pages
              </h2>
              <div className="space-y-3 text-sm">
                <Link className="block text-zinc-300 hover:text-white underline-offset-4 hover:underline" href="/services/fire-extinguisher-servicing">
                  Fire extinguisher servicing
                </Link>
                <Link className="block text-zinc-300 hover:text-white underline-offset-4 hover:underline" href="/services/fire-hose-reel-servicing">
                  Fire hose reel servicing
                </Link>
                <Link className="block text-zinc-300 hover:text-white underline-offset-4 hover:underline" href="/services/fire-hydrant-supply-installation">
                  Fire hydrant supply & installation
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Button asChild className="bg-red-600 hover:bg-red-500">
              <Link href="/services#request-quote">Request a quote</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/20 text-zinc-400 hover:text-white">
              <Link href="/areas">View all areas</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter variant="compact" />
    </div>
  );
}

