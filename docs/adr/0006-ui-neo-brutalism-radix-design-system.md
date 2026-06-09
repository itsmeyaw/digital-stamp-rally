# 6. UI design system: neo-brutalism, Radix UI primitives, blue/orange palette

Date: 2026-06-09

## Status

Accepted

## Context

The application needed a visual design direction and component strategy. Key decisions were:

1. **Component library**: no component library existed; choices were shadcn/ui (pre-styled on Radix primitives) or raw Radix UI primitives.
2. **Design aesthetic**: the app is a playful one-day event tool; a distinctive visual style improves engagement.
3. **Stamp visual data**: stamps currently store only `imageUrl` and `name`; the card UI needs per-stamp color customization.
4. **Admin navigation**: the admin page was a single long scroll with 4 sections — unwieldy on mobile.
5. **Navigation shell**: staff need role context on every page; Users are guests with no login.

## Decision

### Component library: raw Radix UI primitives (no shadcn)

Install `@radix-ui/react-tabs`, `@radix-ui/react-dialog`, `@radix-ui/react-select`, and `@radix-ui/react-label` directly. shadcn ships with its own design tokens (gray scale, rounded corners, muted borders) that would fight neo-brutalism — stripping them out would cost more than starting from primitives.

### Design system: neo-brutalism

- **Border**: `3px solid #000000` on all interactive surfaces
- **Shadow**: `4px 4px 0px #000000` (hard, no blur)
- **Background**: `#F5F5F0` (off-white)
- **Primary**: `#0057FF` (electric blue)
- **Accent**: `#FF6600` (orange — direct complement)
- **Font**: Space Grotesk (chunky, free, Google Fonts)

### Stamp data model: add bgColor + textColor

Two new columns on the `stamps` table: `bg_color text NOT NULL DEFAULT '#0057FF'` and `text_color text NOT NULL DEFAULT '#FFFFFF'`. The stamp card UI renders: colored rectangle → white circle → icon (existing `imageUrl`) → name label. All three visual parts (background, icon, text color) are set by an Administrator at creation time.

### Stamp slot display: full stamp art (Option A)

Each of the 5 slots on the User's card shows the full stamp visual (colored background, white circle, icon, name). Empty slots show a dashed black border with the slot number. 2-column grid on mobile.

### Admin dashboard: 3 sub-pages with bottom tab bar

`/admin/stamps`, `/admin/staff`, `/admin/grants` — one section per route. A persistent bottom tab bar (Radix Tabs mapped to Next.js routes) replaces the long single-page scroll. Active tab: blue background, white text.

### Navigation shell: staff-only top bar

The top bar (logo + role badge) appears only on staff pages (`/admin/*`, `/scan`, `/redeem`, `/login`). User-facing pages (`/welcome`, `/collect`, `/card`) have no nav chrome — Users are anonymous guests and the top bar adds friction with no benefit.

## Consequences

- One DB migration required: add `bg_color` and `text_color` to `stamps`.
- Admin stamp-creation form gains two color picker inputs.
- All existing card/slot UI components need a full visual rewrite.
- Space Grotesk must be loaded via `next/font/google`.
- No shadcn dependency — all form, dialog, and tab components are hand-styled on Radix primitives.
