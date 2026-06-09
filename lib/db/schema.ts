import { pgTable, uuid, char, text, timestamp } from "drizzle-orm/pg-core";

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
 *
 * The Stamper↔Stamp binding (CONTEXT.md "Stamper") and deactivation flag arrive
 * in later slices (#6); this slice models only the auth columns.
 */
export const staff = pgTable("staff", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
