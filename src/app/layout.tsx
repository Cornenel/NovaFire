import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthHashRedirect } from "@/components/auth/auth-hash-redirect";
import { OrganizationStructuredData } from "@/components/structured-data";
import { CookieConsent } from "@/components/cookie-consent";
import "./globals.css";
import "./forms.css";

/**
 * Self-hosted fonts (Google OFL sources) so production builds do not fetch
 * fonts.gstatic.com. Next 16 Turbopack currently fails when Google returns
 * extensionless /l/font?kit= URLs (vercel/next.js#99114).
 */
const outfit = localFont({
  src: "./fonts/Outfit-Variable.ttf",
  variable: "--font-outfit",
  weight: "400 700",
  display: "swap",
});

const syne = localFont({
  src: "./fonts/Syne-Variable.ttf",
  variable: "--font-syne",
  weight: "600 800",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-Variable.ttf",
  variable: "--font-jetbrains",
  weight: "100 800",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.novafire.co.za"),
  title: {
    default: "Nova Fire | Fire Protection, Compliance & Safety | South Africa",
    template: "%s | Nova Fire",
  },
  description:
    "Nova Fire delivers fire protection systems, fire equipment servicing, installations, and compliance solutions. Keep your business operational and audit-ready across South Africa.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/brand/logo-mark.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  openGraph: {
    type: "website",
    url: "https://www.novafire.co.za",
    siteName: "Nova Fire",
    title: "Nova Fire | Fire Protection, Compliance & Safety | South Africa",
    description:
      "Fire protection systems, servicing, installations, compliance management, risk assessments, and fire safety training across South Africa.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Nova Fire — fire protection and compliance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nova Fire | Fire Protection, Compliance & Safety | South Africa",
    description:
      "Fire protection systems, servicing, installations, compliance management, risk assessments, and fire safety training across South Africa.",
    images: ["/og.png"],
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
        className={`${outfit.variable} ${syne.variable} ${jetbrainsMono.variable} font-sans text-zinc-50 selection:bg-red-600/35 selection:text-white`}
      >
        <AuthHashRedirect />
        <OrganizationStructuredData />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
