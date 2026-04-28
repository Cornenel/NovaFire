import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle } from "@/components/legal-article";

export const metadata: Metadata = {
  title: "Cookie Policy | Nova Fire",
  description: "How Nova Fire uses cookies and similar technologies on novafire.co.za.",
};

export default function CookiePolicyPage() {
  return (
    <LegalArticle title="Cookie Policy" lastUpdated="21 April 2026">
      <p>
        This Cookie Policy explains how Nova Fire (&quot;we&quot;) uses cookies and similar
        technologies on <Link href="/">novafire.co.za</Link>. It should be read together with our{" "}
        <Link href="/legal/privacy">Privacy Policy</Link>.
      </p>

      <h2>What are cookies?</h2>
      <p>
        Cookies are small text files stored on your device. Similar technologies include local storage
        and session storage. They help websites function, remember preferences, measure performance, or
        support security.
      </p>

      <h2>How you control cookies</h2>
      <p>
        When you first visit our site, you can use our cookie banner to choose &quot;Essential
        only&quot; or &quot;Accept all&quot;. You can also clear cookies and site data through your
        browser settings. Blocking some cookies may affect how parts of the site work (for example
        staying signed in to staff tools).
      </p>

      <h2>Cookies and storage we use</h2>

      <h3>Strictly necessary</h3>
      <ul>
        <li>
          <strong>Security and routing</strong> — Our hosting platform (for example Vercel) and
          application framework may set cookies or use headers required for security, load balancing,
          and correct delivery of pages.
        </li>
        <li>
          <strong>Staff / Firetech access</strong> — Where you use restricted technician areas on the
          appropriate subdomain, we may set an httpOnly session cookie to verify authorised access.
          That cookie is necessary for the feature and is not used for advertising.
        </li>
        <li>
          <strong>Cookie consent preference</strong> — We store your banner choice (for example under
          the key <code className="text-zinc-500 font-mono text-xs">nf_cookie_consent</code>) in
          browser local storage so we do not ask you on every visit.
        </li>
      </ul>

      <h3>Optional / analytics (if enabled in future)</h3>
      <p>
        If we add analytics or marketing pixels, we will only activate non-essential tags when you
        choose &quot;Accept all&quot; in the banner (or as otherwise required by law). This policy
        will be updated to list specific providers and retention periods.
      </p>

      <h3>Third-party embeds (forms)</h3>
      <p>
        Pages that embed Zoho (or other) forms load content from those providers&apos; domains. Those
        providers may set their own cookies or use their own storage to prevent fraud, maintain
        sessions, or measure usage. We do not control those cookies; please refer to the
        provider&apos;s privacy and cookie documentation. Submitting a form typically involves
        transferring the data you enter to that provider and to Nova Fire as described in our Privacy
        Policy.
      </p>

      <h2>Updates</h2>
      <p>
        We may update this Cookie Policy when our practices or the law change. Check the
        &quot;Last updated&quot; date above.
      </p>
    </LegalArticle>
  );
}
