import { pgTable, uuid, char, timestamp } from "drizzle-orm/pg-core";

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
