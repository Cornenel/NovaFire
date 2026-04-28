import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle } from "@/components/legal-article";

export const metadata: Metadata = {
  title: "Terms of Use | Nova Fire",
  description: "Terms governing use of the Nova Fire website and online services.",
};

export default function TermsOfUsePage() {
  return (
    <LegalArticle title="Terms of Use" lastUpdated="21 April 2026">
      <p>
        These Terms of Use (&quot;Terms&quot;) govern your access to and use of the Nova Fire website
        at <Link href="/">novafire.co.za</Link> and related pages operated by Nova Fire
        (&quot;Nova Fire&quot;, &quot;we&quot;, &quot;us&quot;). By using the site, you agree to these
        Terms. If you do not agree, please do not use the site.
      </p>

      <h2>Services and reliance on information</h2>
      <p>
        Website content is for general information and marketing. It does not replace on-site
        inspection, engineering sign-off, or professional advice specific to your premises. Always
        follow applicable South African National Standards (SANS), local bylaws, insurer conditions,
        and occupational health and safety requirements. See also our{" "}
        <Link href="/legal/disclaimer">Disclaimer</Link>.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the site in any unlawful way or to harm others;</li>
        <li>Attempt to gain unauthorised access to our systems, other users&apos; data, or restricted areas;</li>
        <li>Introduce malware, overload infrastructure, or scrape the site in a way that impairs service;</li>
        <li>Misrepresent your identity or affiliation when submitting forms or enquiries.</li>
      </ul>

      <h2>Forms and submissions</h2>
      <p>
        When you submit forms (including via embedded third-party providers), you warrant that the
        information is accurate to the best of your knowledge and that you have authority to share it.
        You agree to our <Link href="/legal/privacy">Privacy Policy</Link> and applicable processor
        terms where forms are hosted by a supplier such as Zoho.
      </p>

      <h2>Intellectual property</h2>
      <p>
        Text, graphics, logos, layout, and software on this site are owned by Nova Fire or our
        licensors. You may view and print reasonable copies for personal or internal business use;
        you may not copy, modify, distribute, or exploit content for commercial purposes without our
        prior written consent.
      </p>

      <h2>Third-party links</h2>
      <p>
        The site may link to third-party websites or embed third-party tools. We are not responsible
        for their content or practices; use them at your own risk and read their terms and privacy
        notices.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by applicable law, Nova Fire and its directors, employees,
        and contractors are not liable for any indirect, consequential, or special loss arising from
        your use of the site or reliance on its content. Our total liability for any claim relating to
        the site (except where law prohibits exclusion) is limited to the amount you paid us
        specifically for the service giving rise to the claim in the twelve months before the event,
        or where there was no payment, ZAR 1,000.
      </p>
      <p>Nothing in these Terms limits liability that cannot legally be limited.</p>

      <h2>Indemnity</h2>
      <p>
        You agree to indemnify and hold harmless Nova Fire against claims arising from your misuse of
        the site, your breach of these Terms, or unlawful content you submit.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of the Republic of South Africa. Courts in South Africa
        have non-exclusive jurisdiction, without prejudice to mandatory consumer protections where
        applicable.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these Terms periodically. Continued use after changes constitutes acceptance of
        the revised Terms. The &quot;Last updated&quot; date at the top of this page indicates the
        latest revision.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms:{" "}
        <a href="mailto:jacques@novafire.co.za">jacques@novafire.co.za</a>.
      </p>
    </LegalArticle>
  );
}
