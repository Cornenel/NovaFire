import type { MetadataRoute } from "next";
import { SERVICE_AREAS } from "@/lib/service-areas";

const siteUrl = "https://novafire.co.za";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Core public routes you want indexed.
  const routes: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/services", changeFrequency: "monthly", priority: 0.9 },
    { path: "/services/fire-extinguisher-servicing", changeFrequency: "monthly", priority: 0.85 },
    { path: "/services/fire-hose-reel-servicing", changeFrequency: "monthly", priority: 0.85 },
    { path: "/services/fire-hydrant-supply-installation", changeFrequency: "monthly", priority: 0.85 },
    { path: "/areas", changeFrequency: "monthly", priority: 0.7 },
    { path: "/training", changeFrequency: "monthly", priority: 0.7 },
    { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.2 },
    { path: "/legal/terms", changeFrequency: "yearly", priority: 0.2 },
    { path: "/legal/disclaimer", changeFrequency: "yearly", priority: 0.2 },
    { path: "/legal/cookies", changeFrequency: "yearly", priority: 0.2 },
  ];

  const areaRoutes: MetadataRoute.Sitemap = SERVICE_AREAS.map((a) => ({
    url: `${siteUrl}/areas/${a.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    ...routes.map((r) => ({
    url: `${siteUrl}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
    })),
    ...areaRoutes,
  ];
}

