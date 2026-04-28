import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle } from "@/components/legal-article";

export const metadata: Metadata = {
  title: "Disclaimer | Nova Fire",
  description: "Important limitations on website information and professional fire safety advice.",
};

export default function DisclaimerPage() {
  return (
    <LegalArticle title="Disclaimer" lastUpdated="21 April 2026">
      <p>
        The information on <Link href="/">novafire.co.za</Link> is provided by Nova Fire in good faith
        for general awareness and business promotion. By using this site, you acknowledge and agree to
        the following.
      </p>

      <h2>Not professional advice on this website alone</h2>
      <p>
        Content on this website (including self-assessment tools, blog-style copy, and service
        descriptions) is <strong>not</strong> a substitute for a physical inspection, risk
        assessment, system design, sign-off by a competent person, or compliance verification against
        all applicable SANS standards, municipal rules, insurer warranties, and occupational health
        and safety law. Always obtain site-specific professional advice before relying on compliance
        decisions.
      </p>

      <h2>No guarantee of outcomes</h2>
      <p>
        Fire safety outcomes depend on installation quality, maintenance, human behaviour, product
        selection, and external factors. Nova Fire does not guarantee that use of our services or
        information will result in approval by any authority, insurer, or third party, or that any
        particular risk will be eliminated.
      </p>

      <h2>Accreditations and standards</h2>
      <p>
        References to accreditations, standards (such as SANS 1475), or certifications describe our
        positioning and capabilities in general terms. Specific scope of accreditation and
        contractual obligations are defined in your quotation, service agreement, or certificate — not
        solely on this website.
      </p>

      <h2>Third-party content and tools</h2>
      <p>
        Embedded forms, maps, or other tools from third parties are provided &quot;as is&quot; by
        those vendors. Nova Fire is not responsible for their availability, accuracy, or data
        practices beyond what we agree in our contracts with you.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent permitted by law, Nova Fire excludes liability for loss or damage arising from
        reliance on website content, except where gross negligence or wilful misconduct applies or
        where exclusion is prohibited by law. For contractual services, liability is governed by your
        written agreement with us.
      </p>

      <h2>Related documents</h2>
      <p>
        Please also read our <Link href="/legal/terms">Terms of Use</Link> and{" "}
        <Link href="/legal/privacy">Privacy Policy</Link>.
      </p>
    </LegalArticle>
  );
}
