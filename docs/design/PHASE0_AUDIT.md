# Phase 0 — Architecture & design debt audit

Branch: `design/nova-premium-overhaul-2026` @ `88d47df`

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- Framer Motion, Lucide, Radix Slot, shadcn-style Button/Card
- Supabase SSR, Zod, React PDF
- Dual lockfiles present (`package-lock.json` + `pnpm-lock.yaml`); **npm** used for this overhaul to match `package.json` scripts

## Protected surfaces (do not break)

- `/admin/*` scheduling, customers, jobs, imports (Zoho jobcard), stock, compliance
- `/tech/*` jobs, inspections, defects, photos, offline SW
- `/client-portal/*` assets, certificates, defects, quotes, service requests
- `src/app/forms/actions.ts` quote, training, compliance, service-request server actions
- `supabase/` migrations and RLS
- Auth routes under `/auth/*`

## Marketing debt

- Homepage locked to Quiet Ground campaign language
- Dual palettes: gold/brown Quiet Ground vs red/charcoal Ember pages
- Nav uses Ground/Watch/Chapters/Proof instead of commercial IA
- Footer lists unverified ISO 9001 / SAQCC / BSI claims
- Synthetic testimonials and demo compliance scores on homepage
- www vs apex inconsistency (`metadataBase` www; sitemap/robots apex)

## Baseline verification (2026-11-11)

| Check | Result |
|-------|--------|
| `npm install` | OK |
| `npx tsc --noEmit` | See CI output in branch report |
| `npm test` | **FAIL** pre-existing: `test-zoho-import.mjs` expects `COMPLIANT`, got `WARNING` for historical extinguisher pressure-test case. Not introduced by visual work. |

## Business verification flags

- ISO 9001, SAQCC, BSI accreditation wording
- 24-hour quote/response guarantees
- Named testimonials / fabricated scores
- Scope claims that every listed service is independently accredited in-house
