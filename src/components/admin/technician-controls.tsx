"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserX, UserCheck, MailQuestion, Check } from "lucide-react";
import {
  setTechnicianActive,
  sendPasswordReset,
} from "@/app/admin/technician-actions";
import { reassignJob } from "@/app/admin/actions";

export function TechnicianStatusButton({
  technicianId,
  isActive,
}: {
  technicianId: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (
          isActive &&
          !confirm(
            "Deactivate this technician? They will lose app access and stop appearing in assignment lists. Job history is preserved."
          )
        )
          return;
        startTransition(() => setTechnicianActive(technicianId, !isActive));
      }}
      disabled={isPending}
      className={
        isActive
          ? "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-600/15 border border-red-500/40 text-red-400 hover:bg-red-600/30 transition-colors disabled:opacity-50"
          : "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
      }
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isActive ? (
        <UserX className="w-3.5 h-3.5" />
      ) : (
        <UserCheck className="w-3.5 h-3.5" />
      )}
      {isActive ? "Deactivate" : "Activate"}
    </button>
  );
}

export function PasswordResetButton({ email }: { email: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await sendPasswordReset(email);
          router.refresh();
        })
      }
      disabled={isPending}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <MailQuestion className="w-3.5 h-3.5" />
      )}
      Get setup link
    </button>
  );
}

export function AssignJobButton({
  jobId,
  technicianId,
}: {
  jobId: string;
  technicianId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await reassignJob(jobId, technicianId);
          setDone(true);
          router.refresh();
        })
      }
      disabled={isPending || done}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 shrink-0"
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : done ? (
        <Check className="w-3.5 h-3.5" />
      ) : null}
      {done ? "Assigned" : "Assign"}
    </button>
  );
}
