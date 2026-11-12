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
    default:
      "Nova Fire | Fire Extinguisher Service Company & Supplier | Mpumalanga & Limpopo",
    template: "%s | Nova Fire",
  },
  description:
    "Fire extinguisher servicing and supply company for Mpumalanga and Limpopo. Portable extinguishers, hose reels, hydrants, installations and compliance documentation for lodges, estates, commercial and industrial sites.",
  keywords: [
    "fire extinguisher service company Mpumalanga",
    "fire extinguisher supplier Limpopo",
    "fire extinguisher servicing Mbombela",
    "fire extinguisher servicing Polokwane",
    "fire equipment supply Mpumalanga",
    "fire protection Limpopo",
  ],
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
    title:
      "Nova Fire | Fire Extinguisher Service Company & Supplier | Mpumalanga & Limpopo",
    description:
      "Servicing and supply of fire extinguishers and related fire equipment across Mpumalanga and Limpopo.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Nova Fire — fire extinguisher servicing and supply in Mpumalanga and Limpopo",
      },
    ],
    locale: "en_ZA",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Nova Fire | Fire Extinguisher Service Company & Supplier | Mpumalanga & Limpopo",
    description:
      "Servicing and supply of fire extinguishers and related fire equipment across Mpumalanga and Limpopo.",
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
