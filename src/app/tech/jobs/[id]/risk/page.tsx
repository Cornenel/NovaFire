import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FireRiskForm } from "@/components/tech/fire-risk-form";
import { featureFlags } from "@/lib/fsm/feature-flags";
import type { JobWithRelations } from "@/lib/fsm/types";

export default async function LogFireRiskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!featureFlags.fireRiskRegister) notFound();

  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("jobs")
    .select("*, customer:customers(id), site:sites(name, address)")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const job = data as JobWithRelations;

  return (
    <div>
      <Link
        href={`/tech/jobs/${job.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to job
      </Link>

      <h1 className="text-xl font-bold text-white font-[family-name:var(--font-syne)] mb-1">
        Fire Risk
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        {job.site.name} · {job.site.address}
      </p>

      <FireRiskForm
        jobId={job.id}
        customerId={job.customer_id}
        siteId={job.site_id}
        defaultLocation={job.site.address}
      />
    </div>
  );
}
