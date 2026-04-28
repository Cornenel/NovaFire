export function LegalArticle({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto max-w-3xl">
      <p className="nf-eyebrow mb-3 tracking-[0.22em]">Legal</p>
      <h1 className="text-3xl md:text-4xl font-bold text-white font-[family-name:var(--font-syne)] mb-2">
        {title}
      </h1>
      <p className="text-sm text-zinc-500 mb-10">Last updated: {lastUpdated}</p>
      <div className="legal-doc space-y-5 text-sm text-zinc-400 leading-relaxed [&_h2]:text-base [&_h2]:md:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-2 [&_h2]:first:mt-0 [&_h2]:font-[family-name:var(--font-syne)] [&_h3]:text-white [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-2 [&_strong]:text-zinc-200 [&_a]:text-red-400 [&_a]:underline-offset-2 hover:[&_a]:text-red-300">
        {children}
      </div>
    </div>
  );
}
