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
  for (let i = 0; i < 48; i++) {
    const s = i * 7;
    p.push({
      id: i,
      x: seededRandom(s) * 100 - 5,
      y: seededRandom(s + 1) * 100 - 5,
      size: 2 + seededRandom(s + 2) * 4,
      duration: 3 + seededRandom(s + 3) * 5,
      delay: seededRandom(s + 4) * 3,
      opacity: 0.25 + seededRandom(s + 5) * 0.45,
      drift: (seededRandom(s + 6) - 0.5) * 60,
      blur: 1 + seededRandom(s + 7) * 5,
    });
  }
  return p;
})();

export function EmberBackground() {

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient - stronger, more dramatic */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 100% at 50% 10%, rgba(185, 28, 28, 0.18) 0%, transparent 50%), radial-gradient(ellipse 80% 50% at 20% 80%, rgba(220, 38, 38, 0.08) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 85% 50%, rgba(220, 38, 38, 0.06) 0%, transparent 50%)",
        }}
      />
      {/* Pulsing central glow */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ pointerEvents: "none" }}
      >
        <motion.div
          className="w-[600px] h-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(220, 38, 38, 0.25) 0%, rgba(185, 28, 28, 0.1) 30%, transparent 70%)",
            filter: "blur(60px)",
          }}
          animate={{
            opacity: [0.5, 0.9, 0.5],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, rgba(0,0,0,0.4) 100%)",
        }}
      />
      {/* Mission control grid - perspective */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      {/* Animated scan lines - more visible */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent"
        animate={{ y: ["0vh", "100vh"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/15 to-transparent"
        animate={{ y: ["100vh", "0vh"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear", delay: 2 }}
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
            y: [0, -80, 0],
            x: [0, particle.drift, 0],
            opacity: [particle.opacity * 0.4, particle.opacity, particle.opacity * 0.4],
            scale: [1, 1.4, 1],
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
