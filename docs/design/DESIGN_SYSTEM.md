# Nova Fire Design System

Premium corporate identity for the public website and progressive visual alignment for operational apps.

## Brand foundations

| Token | Value | Use |
|-------|-------|-----|
| Obsidian | `#0a0a0a` | Page void / deepest background |
| Charcoal | `#111111` | Base surfaces |
| Steel | `#1a1a1a` | Raised panels |
| Rim | `#2a2a2a` | Borders / dividers |
| Off-white | `#f4f4f5` | Primary text on dark |
| Mist | `#a1a1aa` | Secondary text |
| Nova red | `#dc2626` | Primary brand accent / CTAs |
| Ember | `#b91c1c` | Hover / emphasis |
| Steel grey | `#71717a` | Muted UI |

Quiet Ground gold/brown campaign tokens are retired from primary marketing chrome. Legacy utility class names (`nf-bg-base`, `nf-btn-primary`, etc.) remain but resolve to the corporate palette so operational screens stay coherent.

## Typography

- Display: Syne (`--font-syne`)
- Body: Outfit (`--font-outfit`)
- Mono: JetBrains Mono (`--font-jetbrains`)

## Motion

- Marketing micro-interactions: Framer Motion / Motion
- Editorial scroll sequences: GSAP + ScrollTrigger (marketing only)
- Optional smooth scroll: Lenis on marketing layouts only
- 3D: React Three Fiber, dynamic import, static fallback
- Always honour `prefers-reduced-motion`

## Components

See `src/components/marketing/` and Storybook stories under `.storybook` / `src/components/marketing/**/*.stories.tsx`.

## Unverified claims (business verification required)

Do not present as fact until confirmed:

- ISO 9001
- SAQCC registration wording on marketing pages
- BSI accreditation / permit holder claims
- Guaranteed 24-hour response / quote turnaround
- Named client testimonials or compliance score demos without “demonstration” labelling
