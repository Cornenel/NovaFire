import type { Metadata } from "next";
import MarketingHome from "@/components/marketing/home";

export const metadata: Metadata = {
  title: "Nova Fire | Fire Protection, Servicing & Compliance | South Africa",
  description:
    "Professional fire protection, equipment servicing and compliance support for lodges, estates, commercial and industrial sites across Mpumalanga and Limpopo.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Nova Fire | Fire Protection, Servicing & Compliance",
    description:
      "Fire equipment servicing, supply, documentation and scheduled maintenance across Mpumalanga and Limpopo.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Nova Fire — fire protection and compliance",
      },
    ],
  },
};

export default function HomePage() {
  return (
    <>
      <MarketingHome />
      <noscript>
        <main
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "48px 24px",
            fontFamily: "system-ui, sans-serif",
            background: "#0a0a0a",
            color: "#f4f4f5",
          }}
        >
          <p
            style={{
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontSize: 12,
              color: "#a1a1aa",
            }}
          >
            Fire protection · Servicing · Compliance
          </p>
          <h1 style={{ fontSize: 36, lineHeight: 1.15 }}>
            Fire protection that keeps South African sites operational.
          </h1>
          <p style={{ color: "#a1a1aa", fontSize: 18 }}>
            Nova Fire services, supplies and documents fire equipment across Mpumalanga and
            Limpopo.
          </p>
          <p>
            <a href="/services#quote">Request a quote</a> ·{" "}
            <a href="tel:+27662700293">066 270 0293</a> ·{" "}
            <a href="mailto:jacques@novafire.co.za">jacques@novafire.co.za</a>
          </p>
        </main>
      </noscript>
    </>
  );
}
