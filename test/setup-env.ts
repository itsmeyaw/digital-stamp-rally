/**
 * Shared environment variable defaults for all test environments.
 * Ensures env accessors in lib/env.ts don't throw due to missing vars
 * when tests have not explicitly set them.
 */
process.env.NEXT_PUBLIC_BASE_URL ??= "http://localhost:3000";
