import Link from "next/link";
import { FormSection } from "@/components/forms";
import { ZohoFormEmbed } from "@/components/forms/zoho-form-embed";
import { FormLegalNotice } from "@/components/form-legal-notice";

export default function PortalServiceRequestPage() {
  return (
    <div>
      <Link
        href="/client-portal"
        className="text-sm text-zinc-500 hover:text-white mb-4 inline-block"
      >
        ← Back to overview
      </Link>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-syne)] mb-2">
        Request a service
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        Submit a service or call-out request. Our dispatch team will contact you to
        schedule the visit.
      </p>

      <FormLegalNotice className="mb-8 max-w-2xl" />

      <FormSection
        id="service-request"
        title="Service / call-out request"
        description="Describe the service you need and preferred timing."
      >
        <ZohoFormEmbed formId="portal-service-request" minHeight={720} />
      </FormSection>
    </div>
  );
}
