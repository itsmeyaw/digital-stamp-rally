import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { stamps, type Stamp } from "@/lib/db/schema";

// ──────────────────────────────────────────────────────────────────────────────
// Error

export class StampNotFoundError extends Error {
  constructor(public readonly stampId: string) {
    super(`Stamp not found: ${stampId}`);
    this.name = "StampNotFoundError";
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Domain

/**
 * Deactivate a Stamp by setting its `active` flag to false.
 *
 * This is a flag flip — the Stamp row is never deleted. The deactivation is
 * retroactive: because `deriveCard` filters on active Stamps, the Stamp
 * immediately disappears from every User's card computation once this returns.
 *
 * Throws `StampNotFoundError` if no Stamp with the given id exists.
 */
export async function deactivateStamp(
  db: Database,
  stampId: string,
): Promise<Stamp> {
  const [updated] = await db
    .update(stamps)
    .set({ active: false })
    .where(eq(stamps.id, stampId))
    .returning();

  if (!updated) {
    throw new StampNotFoundError(stampId);
  }

  return updated;
}
