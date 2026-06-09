# 6. Neo-brutalism design system

Date: 2026-06-09

## Status

Accepted

## Context

The app had a first-pass "neo-brutalism" styling (3px borders, 4px shadows,
Space Grotesk, a blue/orange pair) applied unevenly — the user-facing and staff
scan/redeem pages were styled, but the entire admin surface still used a
generic rounded-corner / dark-mode look. The execution was also timid: thin
borders, small shadows, rounded corners, small type, no texture, no shared
interaction language.

This change commits fully to a single, loud "carnival brutalism" direction and
applies it consistently across **every** surface.

## Decision

### Tokens (`app/globals.css`)

- **Border**: `4px solid #0A0A0A` (`--border`, utility `border-brutal`).
- **Shadows**: hard offset, no blur — `--shadow` 6px, `--shadow-lg` 10px,
  `--shadow-sm` 3px (utilities `shadow-hard`, `shadow-hard-lg`, `shadow-hard-sm`).
- **Palette**: warm paper `#FFF4E0` base; electric blue `#0057FF` (primary),
  hot orange `#FF6600` (secondary), signage yellow `#FFE100`, acid lime
  `#B6FF3C` (success), shock pink `#FF4D9D`, alarm red `#FF2D2D`.
- **Background texture**: a subtle radial dot-grid on the body instead of a flat
  fill.
- **No rounded corners** on brutalist surfaces (square is the language).

### Typography

- **Display**: Archivo Black (`--font-archivo-black`, utility `font-display`),
  tight tracking, used for signage-style headings, key buttons, and the user
  code chip.
- **Body**: Space Grotesk (unchanged).

### Signature interaction

`.btn-press` — every interactive brutalist surface lifts toward the light on
hover (`translate(-2px,-2px)` + larger shadow) and slams into its own shadow on
press (`translate(4px,4px)` + tiny shadow). Disabled via
`prefers-reduced-motion`.

### Shared admin styles

`app/(staff)/admin/field-styles.ts` (input/select/button/error class strings)
and `app/(staff)/admin/section.tsx` (`PageHeading`, `SectionTitle`,
`ListCaption`) keep the previously-neglected admin forms and sub-pages
consistent with the rest of the app.

### Component library

Unchanged from the prior decision: raw Radix UI primitives (Tabs for the admin
bottom bar), no shadcn — its default tokens fight brutalism.

## Consequences

- Archivo Black is loaded via `next/font/google` alongside Space Grotesk.
- All admin forms/pages were migrated off the old generic styling; dark-mode
  utility classes were dropped (the app is single-theme).
- Behavioural tests are unaffected: they assert tokens (`border-brutal`,
  `shadow-hard`, `min-h-[48px]`), text content, and `data-testid`s, all
  preserved. 267 tests pass.
- The `COMPLETE!` banner text remains literally uppercase in source (a test
  matches the exact text node); CSS `uppercase` styling is layered on top.
