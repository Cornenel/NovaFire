import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { MarketingContainer, SectionEyebrow } from "@/components/marketing/primitives";

export function MarketingPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="nf-obsidian relative min-h-screen text-zinc-50">
      <Navbar />
      <header className="border-b border-white/[0.06] pt-28 pb-14">
        <MarketingContainer className="max-w-3xl">
          <SectionEyebrow className="mb-4 text-red-400/80">{eyebrow}</SectionEyebrow>
          <h1 className="font-[family-name:var(--font-syne)] text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-zinc-400">{description}</p>
        </MarketingContainer>
      </header>
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
