import Link from "next/link";
import { cn } from "@/lib/utils";

export function FormLegalNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-zinc-500 leading-relaxed", className)}>
      By using this form you confirm the information is accurate to the best of your knowledge. Your
      data is processed in line with our{" "}
      <Link href="/legal/privacy" className="text-zinc-400 hover:text-white underline-offset-2 hover:underline">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
