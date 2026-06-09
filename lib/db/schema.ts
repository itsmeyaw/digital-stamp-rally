import {
  pgTable,
  uuid,
  char,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

/**
 * A participant who collects Stamps (see CONTEXT.md "User").
 *
 * - `id`      internal surrogate key; the subject (`sub`) of the session token.
 * - `code`    the public 6-character handle (Crockford alphabet). Unique. Shown
 *             in the QR; read by Stampers. Does NOT authenticate.
 *
 * The bearer credential is NOT stored: the session token is a stateless,
 * server-signed HMAC token whose `sub` is this row's `id` (see ADR-0001).
 * Stamps/grants are intentionally not modelled in this foundation slice; later
 * slices add them as separate tables (ADR-0003: slots/completion are derived).
 */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: char("code", { length: 6 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/**
 * A staff account — Stamper, Redeemer, or Administrator (CONTEXT.md). Staff are
 * NOT Users: they authenticate with username + password (the hash is stored
 * here) rather than a bearer cookie minted at "collect". The session token's
 * `sub` for a logged-in staff member is this row's `id`; its `role` claim is
 * this row's `role` (ADR-0001: one token format spans all roles).
 *
 * - `id`            internal surrogate key; the `sub` of the staff session token.
 * - `username`      login handle, unique.
 * - `passwordHash`  bcrypt hash; the plaintext password is never stored.
 * - `role`          one of the staff roles "stamper" | "redeemer" | "admin"
 *                   (never "user"). Validated in app code via STAFF_ROLES.
 * - `stampId`       the single Stamp a Stamper is bound to (CONTEXT.md
 *                   "Stamper"). NULL for Redeemers and Admins; set for Stampers.
 *                   Multiple Stampers may share one Stamp design (no uniqueness).
 *                   An Admin can re-assign it one at a time (#6).
 * - `active`        deactivation flag (#6). Staff are NEVER hard-deleted; flipping
 *                   this to false stops the account logging in / granting /
 *                   redeeming while preserving history (mirrors `stamps.active`).
 */
export const staff = pgTable("staff", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  stampId: uuid("stamp_id").references(() => stamps.id),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;

/**
 * A Stamp — a collectible an Administrator creates with a name and a square
 * image (CONTEXT.md "Stamp"). Stamps are referenced by grants in later slices
 * (#7) and can be deactivated retroactively (#9) by flipping `active`; they are
 * NEVER hard-deleted, so history is always preserved.
 *
 * - `id`        internal surrogate key (referenced by grants).
 * - `name`      human-readable label shown on the card and in the admin list.
 * - `imageUrl`  the Vercel Blob URL of the uploaded square image (ADR-0002).
 *               The image bytes live in Blob; only the URL is stored here.
 * - `active`    deactivation flag (#9 flips this). This slice only ever creates
 *               active Stamps and exposes no deactivate/delete path.
 * - `createdAt` insertion time; orders the admin list (newest first).
 */
export const stamps = pgTable("stamps", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Stamp = typeof stamps.$inferSelect;
export type NewStamp = typeof stamps.$inferInsert;
