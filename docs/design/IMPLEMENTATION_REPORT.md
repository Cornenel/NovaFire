# Nova Fire premium overhaul — implementation report

Branch: `design/nova-premium-overhaul-2026`  
Scope: NovaFire only (no ABNova)

## Summary

Replaced the Quiet Ground campaign homepage and gold/brown marketing chrome with a charcoal/red corporate design system. Preserved operational routes, server actions, Supabase schemas and form submissions. Softened unverified accreditation and SLA claims.

## Phase status

| Phase | Status |
|-------|--------|
| 0 Audit & baseline | Done |
| 1 Design tokens & primitives | Done |
| 2 Nav / home / footer / CTAs | Done |
| 3 Services / industries / compliance / training / areas / enquiry | Done (training/areas retained; industries/compliance/about/contact added) |
| 4 GSAP / Lenis / selective 3D | Done |
| 5 Portal / admin visual unify | Partial (nav active states + token remapping; no workflow changes) |
| 6 Tests / SEO / docs / PR | In progress |

## Key files

- `src/app/globals.css` — corporate tokens; legacy `--nf-gold` aliases to red
- `src/components/navbar.tsx`, `site-footer.tsx`
- `src/components/marketing/*` — home, primitives, motion, 3D demo
- `src/app/{industries,compliance,about,contact}/page.tsx`
- `src/app/{page,robots,sitemap}.ts(x)`
- Storybook / Vitest / Playwright configs
- Optional Sentry stubs (`NEXT_PUBLIC_SENTRY_DSN`)

## Dependencies added

Runtime: `gsap`, `lenis`, `@react-three/fiber`, `@react-three/drei`, `three`, `@sentry/nextjs`  
Dev: Storybook 8, Vitest, Playwright, Vite 6

Package manager: **npm** (`package-lock.json`). `pnpm-lock.yaml` remains but was not used for this overhaul.

## Baseline / verification notes

- `npx tsc --noEmit` — pass
- `npm run test:unit` — pass
- `npm test` (legacy suite) — **pre-existing fail** in `test-zoho-import.mjs` (`WARNING` vs expected `COMPLIANT`)
- Supabase is **production / Vercel only** — no local `.env` is maintained. Protected workflows and live quote inserts are verified on preview/production, not locally.
- Local `next build` without Vercel env fails prerender of auth/portal pages that instantiate Supabase; that is expected and not a marketing regression.

## Business verification still required

- ISO 9001 / SAQCC / BSI mark publication
- Any guaranteed response times
- Confirmation emails claimed on training thank-you
- Exact service-accreditation scope per offering

## Known risks

- Dual lockfiles may confuse CI if pnpm is assumed
- Lenis only on marketing paths; disable if any scroll-linked form issues appear
- 3D module gated off on coarse pointers / reduced motion / save-data
- Storybook may need CSS path tweaks in some environments
- Bundle cost of three.js only via dynamic import on homepage demo
