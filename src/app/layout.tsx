import type { Metadata } from "next";
import { Outfit, JetBrains_Mono, Syne } from "next/font/google";
import { OrganizationStructuredData } from "@/components/structured-data";
import { CookieConsent } from "@/components/cookie-consent";
import "./globals.css";
import "./forms.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://novafire.co.za"),
  title: {
    default: "Nova Fire | Fire Protection, Compliance & Safety | South Africa",
    template: "%s | Nova Fire",
  },
  description:
    "Nova Fire delivers fire protection systems, fire equipment servicing, installations, and compliance solutions. Keep your business operational and audit-ready across South Africa.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://novafire.co.za",
    siteName: "Nova Fire",
    title: "Nova Fire | Fire Protection, Compliance & Safety | South Africa",
    description:
      "Fire protection systems, servicing, installations, compliance management, risk assessments, and fire safety training across South Africa.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nova Fire | Fire Protection, Compliance & Safety | South Africa",
    description:
      "Fire protection systems, servicing, installations, compliance management, risk assessments, and fire safety training across South Africa.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${outfit.variable} ${syne.variable} ${jetbrainsMono.variable} font-sans text-white selection:bg-red-950/80 selection:text-red-50`}
      >
        <OrganizationStructuredData />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
