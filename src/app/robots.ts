import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = "https://novafire.co.za";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Internal / staff portals should not be indexed.
          "/tech",
          "/tech/",
          "/tech-login",
          "/tech-restricted",
          "/client-portal",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

