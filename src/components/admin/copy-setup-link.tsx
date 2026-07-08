"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** One-click copy for staff invite / password-setup links (WhatsApp friendly). */
export function CopySetupLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-emerald-200/80">
        Share this link on WhatsApp if the email link fails (email scanners sometimes burn invite links):
      </p>
      <div className="flex gap-2 items-start">
        <code className="flex-1 text-[11px] leading-relaxed break-all rounded-lg bg-black/40 border border-emerald-500/20 px-3 py-2 text-emerald-100">
          {link}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
