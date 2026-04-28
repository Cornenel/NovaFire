import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { SERVICE_AREAS } from "@/lib/service-areas";

export const metadata: Metadata = {
  title: "Service areas | Mpumalanga & Limpopo",
  description:
    "Nova Fire service areas across Mpumalanga and Limpopo. Fire equipment servicing, detection servicing, and supply & installation.",
  alternates: { canonical: "/areas" },
};

export default function AreasIndexPage() {
  const mp = SERVICE_AREAS.filter((a) => a.province === "Mpumalanga");
  const lp = SERVICE_AREAS.filter((a) => a.province === "Limpopo");

  return (
    <div className="min-h-screen nf-bg-base flex flex-col">
      <Navbar />
      <main className="flex-1 pt-28 pb-20">
        <div className="container mx-auto px-6 max-w-6xl">
          <p className="text-xs font-mono text-red-500/90 uppercase tracking-[0.25em] mb-3">
            Areas We Serve
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white font-[family-name:var(--font-syne)]">
            Mpumalanga & Limpopo
          </h1>
          <p className="text-zinc-400 mt-5 max-w-3xl leading-relaxed">
            We provide portable and fixed fire equipment servicing, fire detection servicing, and
            supply & installation across these areas.
          </p>

          <div className="mt-12 grid lg:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7">
              <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-syne)] mb-4">
                Mpumalanga
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {mp.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/areas/${a.slug}`}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    {a.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.07] nf-glass-panel p-7">
              <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-syne)] mb-4">
                Limpopo
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {lp.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/areas/${a.slug}`}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    {a.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 text-sm text-zinc-500">
            Looking for a specific town not listed?{" "}
            <Link href="/services#request-quote" className="text-zinc-300 hover:text-white underline-offset-4 hover:underline">
              Request a quote
            </Link>
            .
          </div>
        </div>
      </main>
      <SiteFooter variant="compact" />
    </div>
  );
}

