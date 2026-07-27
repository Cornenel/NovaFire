import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JobCreateForm } from "@/components/admin/job-create-form";

export const dynamic = "force-dynamic";

function todayInSA(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Africa/Johannesburg",
  });
}

export default async function NewJobPage() {
  const supabase = await createClient();

  const [{ data: customers }, { data: technicians }] = await Promise.all([
    supabase.from("customers").select("id, name").order("name"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("role", ["technician", "dispatcher", "admin"])
      .eq("is_active", true)
      .order("full_name"),
  ]);

  return (
    <div>
      <Link
        href="/admin/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Jobs
      </Link>

      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-6">
        Create Job
      </h1>

      <JobCreateForm
        customers={customers ?? []}
        technicians={technicians ?? []}
        defaultDate={todayInSA()}
      />
    </div>
  );
}
