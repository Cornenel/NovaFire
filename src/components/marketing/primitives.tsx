import Link from "next/link";
import { cn } from "@/lib/utils";

export function MarketingContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("nf-container", className)}>{children}</div>;
}

export function SectionEyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("nf-eyebrow", className)}>{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow ? <SectionEyebrow className="mb-4">{eyebrow}</SectionEyebrow> : null}
      <h2 className="font-[family-name:var(--font-syne)] text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl md:text-[2.75rem] md:leading-[1.1]">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
          {description}
        </p>
      ) : null}
    </div>
  );
}

type CtaVariant = "primary" | "secondary" | "ghost";

const ctaStyles: Record<CtaVariant, string> = {
  primary:
    "nf-btn-primary inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm transition-[filter,box-shadow,transform]",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-red-500/40 hover:bg-white/[0.06]",
  ghost:
    "nf-btn-ghost inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-medium transition-colors",
};

export function MarketingCta({
  href,
  children,
  variant = "primary",
  className,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  variant?: CtaVariant;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className={cn(ctaStyles[variant], className)}>
      {children}
    </Link>
  );
}

export function MarketingPanel({
  className,
  children,
  id,
}: {
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "rounded-xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8",
        className
      )}
    >
      {children}
    </div>
  );
}
