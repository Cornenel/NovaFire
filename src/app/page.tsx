import type { Metadata } from "next";
import QuietGroundHome from "@/components/quiet-ground/home";

export const metadata: Metadata = {
  title: "Nova Fire | Quiet ground for South African facilities",
  description:
    "One failed audit closes the lodge. Nova Fire supplies, services, and certifies so doors stay open — a night-watch for lodges, estates, commercial and industrial sites across South Africa.",
  openGraph: {
    title: "Nova Fire | Quiet ground for South African facilities",
    description:
      "One failed audit closes the lodge. We supply, service, and certify so the doors stay open.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Nova Fire Quiet Ground" }],
  },
};

/**
 * Server-rendered Quiet Ground story stays in the HTML for crawlers and no-JS.
 * The interactive client homepage mounts on top with the same narrative.
 */
export default function HomePage() {
  return (
    <>
      <QuietGroundHome />
      <noscript>
        <main
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "48px 24px",
            fontFamily: "system-ui, sans-serif",
            background: "#0B0908",
            color: "#F5F0E8",
          }}
        >
          <p style={{ letterSpacing: "0.2em", textTransform: "uppercase", fontSize: 12, color: "#C9B8A4" }}>
            Quiet ground
          </p>
          <h1 style={{ fontSize: 36, lineHeight: 1.15 }}>One failed audit closes the lodge.</h1>
          <p style={{ color: "#C9B8A4", fontSize: 18 }}>
            We supply, service, and certify so the doors stay open.
          </p>
          <h2>Watch — living site map</h2>
          <p>
            Gold points mark extinguishers, hose reels, detectors, and cert dates on your
            kind of property. A status card shows compliance score, active systems, and next
            service — the product surface a GM would trust.
          </p>
          <h2>Chapters</h2>
          <ul>
            <li>Ground — supply and install on a real SA site.</li>
            <li>Watch — service, detection, monitoring at 2am.</li>
            <li>Paper that holds — risk assessments, SANS certification, drills.</li>
          </ul>
          <h2>Proof of place</h2>
          <p>Luxury safari lodge, Limpopo · Coastal estate, Western Cape · Cold-storage plant, Gauteng.</p>
          <p>
            Call <a href="tel:+27662700293">066 270 0293</a> ·{" "}
            <a href="mailto:jacques@novafire.co.za">jacques@novafire.co.za</a>
          </p>
        </main>
      </noscript>
    </>
  );
}
