import { getDb } from "@/lib/db/client";
import { adminPassword, adminUsername } from "@/lib/env";
import { seedAdmin } from "@/lib/auth/seed";

/**
 * Deploy-time seed entry point: creates the first Administrator from
 * ADMIN_USERNAME / ADMIN_PASSWORD env vars (issue #4). Idempotent — safe to run
 * on every deploy; a second run with an existing username is a no-op.
 *
 * Run with: pnpm db:seed
 */
async function main(): Promise<void> {
  const username = adminUsername();
  const password = adminPassword();
  const admin = await seedAdmin(getDb(), { username, password });
  console.log(`Seeded admin "${admin.username}" (id ${admin.id}).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("seed-admin failed:", err);
    process.exit(1);
  });
