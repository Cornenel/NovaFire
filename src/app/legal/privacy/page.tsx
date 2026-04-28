import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle } from "@/components/legal-article";

export const metadata: Metadata = {
  title: "Privacy Policy | Nova Fire",
  description:
    "How Nova Fire collects, uses, and protects personal information in line with South African privacy law (POPIA).",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalArticle title="Privacy Policy" lastUpdated="21 April 2026">
      <p>
        Nova Fire (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) respects your privacy. This policy
        explains how we process personal information when you use{" "}
        <Link href="/">novafire.co.za</Link> and related services, in accordance with the Protection of
        Personal Information Act, 2013 (&quot;POPIA&quot;) and sensible international practice.
      </p>

      <h2>Who we are</h2>
      <p>
        Nova Fire provides fire protection, compliance, and related services in South Africa. For
        privacy-related questions or requests, contact us at{" "}
        <a href="mailto:jacques@novafire.co.za">jacques@novafire.co.za</a> or{" "}
        <a href="tel:+27662700293">066 270 0293</a>.
      </p>

      <h2>Information we may collect</h2>
      <ul>
        <li>
          <strong>Contact and identity details</strong> — for example name, company, phone number,
          email address, and site address when you request a quote, complete an assessment, register
          for training, or contact us.
        </li>
        <li>
          <strong>Form and assessment content</strong> — information you voluntarily submit through
          our web forms (including self-assessments and compliance questionnaires).
        </li>
        <li>
          <strong>Technical data</strong> — such as IP address, browser type, device information, and
          approximate location derived from network data, collected automatically by our hosting and
          security infrastructure where applicable.
        </li>
        <li>
          <strong>Staff and portal access</strong> — if you use restricted areas (for example
          technician tools), we may process login identifiers and session data required to secure
          those areas.
        </li>
      </ul>

      <h2>How we use information</h2>
      <p>We use personal information to:</p>
      <ul>
        <li>Respond to enquiries, provide quotes, and deliver contracted services;</li>
        <li>Schedule inspections, training, and on-site work;</li>
        <li>Maintain records for compliance, invoicing, and legitimate business administration;</li>
        <li>Operate, secure, and improve our website and internal tools;</li>
        <li>Meet legal, regulatory, or insurance obligations where required.</li>
      </ul>
      <p>
        We do not sell your personal information. We do not use it for unrelated automated profiling
        beyond what is needed to assess compliance risk in the context of services you request.
      </p>

      <h2>Lawful basis (POPIA)</h2>
      <p>
        Depending on the situation, processing may be based on your consent, the performance of a
        contract, our legitimate interests (for example network security and service improvement,
        balanced against your rights), or legal obligation.
      </p>

      <h2>Third parties and processors</h2>
      <p>
        We use reputable service providers to host our website, manage forms, email, and business
        systems. Where forms are embedded from providers such as{" "}
        <strong>Zoho</strong>, your submissions are processed by them under their terms and privacy
        notices as well as ours. We choose processors who provide appropriate safeguards and
        contractual commitments.
      </p>

      <h2>Cross-border transfers</h2>
      <p>
        Some providers may process data outside South Africa. Where this occurs, we rely on lawful
        mechanisms under POPIA (for example your consent, contractual necessity, or adequacy /
        appropriate safeguards offered by the supplier).
      </p>

      <h2>Retention</h2>
      <p>
        We keep information only as long as needed for the purposes above, including statutory
        retention periods for tax, safety, and regulatory records. When data is no longer required, we
        delete or de-identify it where practicable.
      </p>

      <h2>Your rights</h2>
      <p>Under POPIA you may have the right to:</p>
      <ul>
        <li>Request access to personal information we hold about you;</li>
        <li>Request correction or deletion where appropriate;</li>
        <li>Object to certain processing, or withdraw consent where processing was consent-based;</li>
        <li>Lodge a complaint with the Information Regulator of South Africa.</li>
      </ul>
      <p>
        Information Regulator:{" "}
        <a href="https://www.inforegulator.org.za" target="_blank" rel="noopener noreferrer">
          www.inforegulator.org.za
        </a>
        .
      </p>

      <h2>Security</h2>
      <p>
        We implement reasonable technical and organisational measures to protect personal information.
        No method of transmission over the Internet is completely secure; we encourage you to use
        strong passwords and caution when submitting sensitive documents.
      </p>

      <h2>Children</h2>
      <p>
        Our services are directed at businesses and adults. We do not knowingly collect personal
        information from children without appropriate authority.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. Material changes will be reflected on this page
        with an updated &quot;Last updated&quot; date. Related documents:{" "}
        <Link href="/legal/terms">Terms of Use</Link>, <Link href="/legal/cookies">Cookie Policy</Link>
        , <Link href="/legal/disclaimer">Disclaimer</Link>.
      </p>
    </LegalArticle>
  );
}
