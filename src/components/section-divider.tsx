"use client";

export function SectionDivider() {
  return (
    <div className="relative h-px w-full overflow-visible">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/20 to-transparent blur-sm opacity-70" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
        <div className="w-2.5 h-2.5 rotate-45 border border-red-500/50 bg-gradient-to-br from-red-500/30 to-orange-600/20 shadow-[0_0_20px_rgba(220,38,38,0.35)]" />
      </div>
    </div>
  );
}
