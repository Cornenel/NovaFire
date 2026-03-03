/**
 * Structured Data (JSON-LD) for SEO
 * Add to layout or pages where relevant.
 */

export function OrganizationStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Nova Fire",
    url: "https://novafire.co.za",
    logo: "https://novafire.co.za/logo.png",
    description: "Fire protection, compliance, and safety solutions. South Africa.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "ZA",
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: "jacques@novafire.co.za",
      telephone: "+27662700293",
      contactType: "customer service",
      areaServed: "ZA",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function WebPageStructuredData({
  name,
  description,
  url = "https://novafire.co.za",
}: {
  name: string;
  description: string;
  url?: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
