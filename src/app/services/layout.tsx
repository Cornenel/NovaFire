import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fire equipment servicing, detection servicing, supply & installation",
  description:
    "Portable and fixed fire equipment servicing, fire detection servicing, and supply & installation across Mpumalanga and Limpopo. Fire extinguishers, hose reels, fire hydrants, suppression systems, alarms and compliance support.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Fire equipment servicing & installations | Mpumalanga & Limpopo",
    description:
      "Portable and fixed fire equipment servicing, fire detection servicing, and supply & installation across Mpumalanga and Limpopo.",
    url: "https://novafire.co.za/services",
  },
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

