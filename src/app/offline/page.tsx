import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = {
  title: "Offline | Nova Fire",
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen nf-bg-base flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-xl bg-amber-500/15 flex items-center justify-center mb-6">
        <WifiOff className="w-8 h-8 text-amber-400" />
      </div>
      <h1 className="text-xl font-bold text-white font-[family-name:var(--font-syne)] mb-2">
        You&apos;re offline
      </h1>
      <p className="text-zinc-400 text-sm max-w-xs mb-8">
        This page isn&apos;t available offline. Pages you&apos;ve opened
        before are still accessible, and any work you save will sync when
        signal returns.
      </p>
      <Link
        href="/tech"
        className="px-6 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm"
      >
        Go to Today&apos;s Jobs
      </Link>
    </div>
  );
}
