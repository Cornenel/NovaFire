import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { ServiceAreaStructuredData } from "@/components/structured-data";
import { Button } from "@/components/ui/button";
import { SERVICE_AREAS, getServiceArea } from "@/lib/service-areas";
import { absoluteUrl } from "@/lib/seo";

export function generateStaticParams() {
  return SERVICE_AREAS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const area = getServiceArea(slug);
  if (!area) return {};
  const title = `Fire extinguisher servicing & supply in ${area.name}`;
  const description = `Fire extinguisher service company and supplier in ${area.name}, ${area.province}. Portable extinguisher servicing, supply & installation, hose reels, hydrants and compliance documentation.`;
  return {
    title,
    description,
    alternates: { canonical: `/areas/${area.slug}` },
    openGraph: {
      title: `${title} | ${area.province}`,
      description,
      url: absoluteUrl(`/areas/${area.slug}`),
    },
  };
}

export default async function AreaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const area = getServiceArea(slug);
  if (!area) notFound();

  return (
    <div className="min-h-screen nf-bg-base flex flex-col">
      <ServiceAreaStructuredData
        name={`Fire extinguisher servicing and supply in ${area.name}`}
        url={absoluteUrl(`/areas/${area.slug}`)}
        areas={[area.name, area.province]}
        services={[
          "Portable fire extinguisher servicing",
          "Fire extinguisher supply and installation",
          "Fixed fire equipment servicing (hose reels / hydrants / suppression)",
          "Fire detection and alarm servicing",
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
            Fire extinguisher service company in {area.name}
          </h1>
          <p className="text-zinc-400 mt-5 text-base md:text-lg leading-relaxed">
            Nova Fire services and supplies portable fire extinguishers in {area.name}, {area.province}.
            {" "}
            {area.focus}
          </p>

          <div className="mt-10 grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7">
              <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                Common requests in {area.name}
              </h2>
              <ul className="text-sm text-zinc-500 space-y-2">
                <li>Portable fire extinguisher servicing</li>
                <li>Fire extinguisher supply &amp; installation</li>
                <li>Hose reel servicing and testing</li>
                <li>Hydrant equipment supply &amp; installation</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7">
              <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
                Sites we commonly support
              </h2>
              <ul className="text-sm text-zinc-500 space-y-2">
                {area.commonSites.map((site) => (
                  <li key={site}>{site}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-zinc-500 leading-relaxed">
                Looking for a fire extinguisher supplier in {area.name} as well as a service
                company? We can quote supply, mounting and ongoing servicing together.
              </p>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-white/[0.07] nf-glass-panel p-7">
            <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-syne)] mb-3">
              Related service pages
            </h2>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <Link
                className="text-zinc-300 hover:text-white underline-offset-4 hover:underline"
                href="/services/fire-extinguisher-servicing"
              >
                Fire extinguisher servicing
              </Link>
              <Link
                className="text-zinc-300 hover:text-white underline-offset-4 hover:underline"
                href="/services/fire-extinguisher-supply-installation"
              >
                Fire extinguisher supply &amp; installation
              </Link>
              <Link
                className="text-zinc-300 hover:text-white underline-offset-4 hover:underline"
                href="/services/fire-hose-reel-servicing"
              >
                Fire hose reel servicing
              </Link>
              <Link
                className="text-zinc-300 hover:text-white underline-offset-4 hover:underline"
                href="/services/fire-hydrant-supply-installation"
              >
                Fire hydrant supply &amp; installation
              </Link>
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
