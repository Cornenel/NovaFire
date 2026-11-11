import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = "https://www.novafire.co.za";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/tech",
          "/tech/",
          "/tech-login",
          "/tech-restricted",
          "/client-portal",
          "/admin",
          "/admin/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
