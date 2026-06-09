/**
 * Blob storage seam for Stamp images (ADR-0002).
 *
 * The real implementation uploads to Vercel Blob via `@vercel/blob`'s `put()`
 * and returns the public URL saved on the stamp row. To keep tests off the
 * network, the uploader is injectable through `globalThis.__dsrBlob`, mirroring
 * the DB singleton seam in `lib/db/client.ts`. Downstream slices that need to
 * store images (none currently — grant #7 references existing Stamps) reuse
 * this same override: set `globalThis.__dsrBlob` in a test to a fake uploader.
 */

/** A pluggable uploader: takes the file and returns the stored URL. */
export type BlobUploader = (
  filename: string,
  data: Uint8Array,
  contentType: string,
) => Promise<{ url: string }>;

declare global {
  // eslint-disable-next-line no-var
  var __dsrBlob: BlobUploader | undefined;
}

/** The production uploader: writes to Vercel Blob with public access. */
const vercelUploader: BlobUploader = async (filename, data, contentType) => {
  const { put } = await import("@vercel/blob");
  const { url } = await put(filename, Buffer.from(data), {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });
  return { url };
};

/**
 * Upload a Stamp image and return its stored URL. Delegates to the injected
 * `globalThis.__dsrBlob` uploader when present (tests), otherwise to Vercel Blob.
 */
export async function uploadStampImage(
  filename: string,
  data: Uint8Array,
  contentType: string,
): Promise<{ url: string }> {
  const uploader = globalThis.__dsrBlob ?? vercelUploader;
  return uploader(filename, data, contentType);
}
