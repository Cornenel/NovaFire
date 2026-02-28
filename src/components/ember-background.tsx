"use client";

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
  for (let i = 0; i < 32; i++) {
    const s = i * 7; // stride for independent values
    p.push({
      id: i,
      x: seededRandom(s) * 100 - 5,
      y: seededRandom(s + 1) * 100 - 5,
      size: 1.5 + seededRandom(s + 2) * 3,
      duration: 5 + seededRandom(s + 3) * 8,
      delay: seededRandom(s + 4) * 4,
      opacity: 0.15 + seededRandom(s + 5) * 0.35,
      drift: (seededRandom(s + 6) - 0.5) * 40,
      blur: 2 + seededRandom(s + 7) * 4,
    });
  }
  return p;
})();

export function EmberBackground() {

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient - deeper, more atmospheric */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 50% 20%, rgba(139, 0, 0, 0.12) 0%, transparent 45%), radial-gradient(ellipse 60% 40% at 80% 60%, rgba(220, 38, 38, 0.06) 0%, transparent 50%)",
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, rgba(0,0,0,0.4) 100%)",
        }}
      />
      {/* Mission control grid - finer, perspective feel */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "36px 36px",
        }}
      />
      {/* Animated scan line - very subtle */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/10 to-transparent"
        style={{ top: "30%" }}
        animate={{ y: ["0vh", "100vh"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      {/* Floating ember particles - layered, deterministic for hydration */}
      {PARTICLES.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            background: `radial-gradient(circle, rgba(255,100,80,0.8) 0%, rgba(220,38,38,0.3) 40%, transparent 70%)`,
            boxShadow: `0 0 ${particle.size * 6}px rgba(220, 38, 38, 0.4), 0 0 ${particle.size * 12}px rgba(220, 38, 38, 0.15)`,
            filter: `blur(${particle.blur}px)`,
          }}
          animate={{
            y: [0, -50, 0],
            x: [0, particle.drift, 0],
            opacity: [particle.opacity * 0.3, particle.opacity, particle.opacity * 0.3],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      {/* Film grain overlay - premium texture */}
      <div
        className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
