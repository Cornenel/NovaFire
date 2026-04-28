import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";

export default function LegalSectionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen nf-bg-base flex flex-col">
      <Navbar />
      <main className="flex-1 pt-28 pb-12 px-6">{children}</main>
      <SiteFooter variant="compact" />
    </div>
  );
}
