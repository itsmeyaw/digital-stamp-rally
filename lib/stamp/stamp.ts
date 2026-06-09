import { desc } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { stamps, type Stamp } from "@/lib/db/schema";

/**
 * Persist a new Stamp. The image has already been validated and uploaded to
 * Blob by the caller; only its URL is stored (ADR-0002). New Stamps are always
 * active — this slice exposes no deactivate/delete path (#9 adds deactivation).
 * Optional bgColor and textColor override the column defaults (#12).
 */
export async function createStamp(
  db: Database,
  input: { name: string; imageUrl: string; bgColor?: string; textColor?: string },
): Promise<Stamp> {
  const values: { name: string; imageUrl: string; bgColor?: string; textColor?: string } = {
    name: input.name,
    imageUrl: input.imageUrl,
  };
  if (input.bgColor !== undefined) values.bgColor = input.bgColor;
  if (input.textColor !== undefined) values.textColor = input.textColor;

  const [row] = await db
    .insert(stamps)
    .values(values)
    .returning();
  return row;
}

/**
 * List all Stamps, newest first. Never filters by `active` — deactivated Stamps
 * still appear in the admin list because history is always preserved.
 */
export async function listStamps(db: Database): Promise<Stamp[]> {
  return db.select().from(stamps).orderBy(desc(stamps.createdAt));
}
