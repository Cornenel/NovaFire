import {
  BUSINESS_ADDRESS,
  BUSINESS_MAPS_URL,
  PRIMARY_EMAIL,
  PRIMARY_PHONE,
  SERVICE_PROVINCES,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from "@/lib/seo";

/**
 * Structured Data (JSON-LD) for SEO
 * Add to layout or pages where relevant.
 */

export function OrganizationStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    legalName: "Nova Fire",
    url: SITE_URL,
    logo: absoluteUrl("/brand/logo.png"),
    image: absoluteUrl("/og.png"),
    description:
      "Nova Fire is a fire extinguisher service company and equipment supplier for portable and fixed fire equipment across Mpumalanga and Limpopo, South Africa.",
    email: PRIMARY_EMAIL,
    telephone: PRIMARY_PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS_ADDRESS.streetAddress,
      addressLocality: BUSINESS_ADDRESS.addressLocality,
      addressRegion: BUSINESS_ADDRESS.addressRegion,
      postalCode: BUSINESS_ADDRESS.postalCode,
      addressCountry: BUSINESS_ADDRESS.addressCountry,
    },
    hasMap: BUSINESS_MAPS_URL,
    areaServed: SERVICE_PROVINCES.map((name) => ({
      "@type": "AdministrativeArea",
      name,
    })),
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: PRIMARY_EMAIL,
        telephone: PRIMARY_PHONE,
        contactType: "customer service",
        areaServed: SERVICE_PROVINCES.map((name) => ({
          "@type": "AdministrativeArea",
          name,
        })),
        availableLanguage: ["en", "af"],
      },
    ],
    knowsAbout: [
      "Fire extinguisher servicing",
      "Fire extinguisher supply",
      "Fire hose reel servicing",
      "Fire hydrant supply and installation",
      "Fire safety compliance documentation",
    ],
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
  url = SITE_URL,
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
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function ServiceAreaStructuredData({
  name,
  url,
  areas,
  services,
}: {
  name: string;
  url: string;
  areas: string[];
  services: string[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    url,
    provider: {
      "@type": "LocalBusiness",
      name: SITE_NAME,
      url: SITE_URL,
      telephone: PRIMARY_PHONE,
      email: PRIMARY_EMAIL,
    },
    areaServed: areas.map((a) => ({ "@type": "AdministrativeArea", name: a })),
    serviceType: services,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
