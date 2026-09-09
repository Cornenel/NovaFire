"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  drift: number;
  blur: number;
}

// Seeded random - same output on server and client for hydration
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

const PARTICLES = (() => {
  const p: Particle[] = [];
  for (let i = 0; i < 36; i++) {
    const s = i * 7;
    p.push({
      id: i,
      x: Number((seededRandom(s) * 100 - 5).toFixed(2)),
      y: Number((55 + seededRandom(s + 1) * 50).toFixed(2)),
      size: Number((2.5 + seededRandom(s + 2) * 5).toFixed(2)),
      duration: Number((4 + seededRandom(s + 3) * 6).toFixed(2)),
      delay: Number((seededRandom(s + 4) * 4).toFixed(2)),
      opacity: Number((0.3 + seededRandom(s + 5) * 0.5).toFixed(3)),
      drift: Number(((seededRandom(s + 6) - 0.5) * 40).toFixed(2)),
      blur: Number((1 + seededRandom(s + 7) * 4).toFixed(2)),
    });
  }
  return p;
})();

export function EmberBackground() {
  /** Framer Motion applies different style precision on SSR vs first client paint for these particles; render only after mount. */
  const [particlesReady, setParticlesReady] = useState(false);
  const [reduceFx, setReduceFx] = useState(false);
  useEffect(() => {
    setParticlesReady(true);
  }, []);
  useEffect(() => {
    const mqReduce = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const mqTouch = window.matchMedia?.("(hover: none) and (pointer: coarse)");
    const update = () => setReduceFx(Boolean(mqReduce?.matches || mqTouch?.matches));
    update();
    mqReduce?.addEventListener?.("change", update);
    mqTouch?.addEventListener?.("change", update);
    return () => {
      mqReduce?.removeEventListener?.("change", update);
      mqTouch?.removeEventListener?.("change", update);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Living forge base — warm coal, not flat black */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #1a100c 0%, #120c0a 42%, #0c0806 100%)",
        }}
      />

      {/* Heat aurora */}
      <div
        className={`absolute -inset-[20%] ${reduceFx ? "" : "nf-aurora"}`}
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 18%, rgba(249,115,22,0.34) 0%, transparent 58%), radial-gradient(ellipse 40% 35% at 78% 35%, rgba(239,68,68,0.22) 0%, transparent 55%), radial-gradient(ellipse 35% 40% at 18% 60%, rgba(185,28,28,0.2) 0%, transparent 50%)",
        }}
      />

      {/* Rising heat columns */}
      {!reduceFx && (
        <>
          <div
            className="absolute left-[18%] bottom-0 h-[70%] w-[22%] nf-heat-rise opacity-70"
            style={{
              background:
                "linear-gradient(to top, rgba(249,115,22,0.28), rgba(239,68,68,0.08), transparent)",
              filter: "blur(40px)",
            }}
          />
          <div
            className="absolute left-[55%] bottom-0 h-[80%] w-[18%] nf-heat-rise opacity-60"
            style={{
              background:
                "linear-gradient(to top, rgba(239,68,68,0.26), rgba(251,146,60,0.1), transparent)",
              filter: "blur(48px)",
              animationDelay: "2.5s",
            }}
          />
          <div
            className="absolute left-[78%] bottom-0 h-[55%] w-[14%] nf-heat-rise opacity-50"
            style={{
              background:
                "linear-gradient(to top, rgba(251,146,60,0.22), transparent)",
              filter: "blur(36px)",
              animationDelay: "4s",
            }}
          />
        </>
      )}

      {/* Soft horizon ember */}
      <div
        className="absolute inset-x-0 bottom-0 h-[45%]"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 100%, rgba(249,115,22,0.22) 0%, rgba(127,29,29,0.12) 40%, transparent 70%)",
        }}
      />

      {/* Breathing core glow */}
      {!reduceFx && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ pointerEvents: "none" }}
        >
          <motion.div
            className="w-[min(90vw,720px)] h-[min(55vw,420px)] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(251,146,60,0.28) 0%, rgba(239,68,68,0.14) 35%, transparent 70%)",
              filter: "blur(48px)",
            }}
            animate={{
              opacity: [0.55, 0.95, 0.55],
              scale: [1, 1.12, 1],
            }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}

      {/* Soft radial vignette — keep edges readable, not muddy */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 95% 85% at 50% 40%, transparent 40%, rgba(12,8,6,0.55) 100%)",
        }}
      />

      {/* Warm mesh lines instead of cold tech grid */}
      <div
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(251,146,60,0.45) 1px, transparent 1px),
            linear-gradient(90deg, rgba(239,68,68,0.35) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 40%, black 20%, transparent 75%)",
        }}
      />

      {!reduceFx && (
        <>
          {/* Slow heat sweep */}
          <motion.div
            className="absolute left-0 right-0 h-24 nf-heat-band blur-2xl"
            animate={{ y: ["110%", "-30%"] }}
            transition={{ duration: 11, repeat: Infinity, ease: "linear" }}
          />

          {/* Embers rising from the floor */}
          {particlesReady &&
            PARTICLES.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute rounded-full"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: particle.size,
                  height: particle.size,
                  background: `radial-gradient(circle, rgba(255,200,120,0.95) 0%, rgba(239,68,68,0.45) 45%, transparent 75%)`,
                  boxShadow: `0 0 ${(particle.size * 5).toFixed(2)}px rgba(249, 115, 22, 0.45)`,
                  filter: `blur(${particle.blur}px)`,
                }}
                animate={{
                  y: [0, -120 - particle.size * 8],
                  x: [0, particle.drift],
                  opacity: [0, particle.opacity, 0],
                  scale: [0.8, 1.3, 0.6],
                }}
                transition={{
                  duration: particle.duration,
                  delay: particle.delay,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}

          <div className="absolute inset-0 nf-noise" />
        </>
      )}
    </div>
  );
}
