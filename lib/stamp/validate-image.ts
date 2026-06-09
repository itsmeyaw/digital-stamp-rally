import { imageSize } from "image-size";
import {
  stampImageMaxBytes,
  stampImageAllowedTypes,
  stampImageSquareTolerance,
} from "@/lib/env";

/**
 * Result of validating a candidate Stamp image. `ok` discriminates the union so
 * callers get a typed error message to surface to the Administrator (a clear
 * 400) without a thrown exception. Validation is pure: dimensions are read from
 * the image header bytes (no native deps, no I/O).
 */
export type ImageValidationResult =
  | { ok: true; width: number; height: number }
  | { ok: false; error: string };

/**
 * Validate that an uploaded image is acceptable as a Stamp image:
 *   - content type is in the allowed set (env-configurable),
 *   - byte size is within the configured maximum,
 *   - the image is square, allowing a small tolerance so images that look
 *     square but are off by a few pixels are accepted (env-configurable).
 *
 * Returns a discriminated result rather than throwing so route handlers can map
 * a rejection to a 400 with the human-readable reason.
 */
export function validateStampImage(
  data: Uint8Array,
  contentType: string,
): ImageValidationResult {
  const allowed = stampImageAllowedTypes();
  const type = (contentType ?? "").toLowerCase();
  if (!allowed.includes(type)) {
    return {
      ok: false,
      error: `Unsupported image type "${contentType}". Allowed: ${allowed.join(", ")}.`,
    };
  }

  const maxBytes = stampImageMaxBytes();
  if (data.byteLength > maxBytes) {
    return {
      ok: false,
      error: `Image is too large (${data.byteLength} bytes); maximum is ${maxBytes} bytes.`,
    };
  }

  let dimensions: { width?: number; height?: number };
  try {
    dimensions = imageSize(data);
  } catch {
    return { ok: false, error: "Could not read image dimensions." };
  }

  const { width, height } = dimensions;
  if (typeof width !== "number" || typeof height !== "number") {
    return { ok: false, error: "Could not read image dimensions." };
  }
  const tolerance = stampImageSquareTolerance();
  const longer = Math.max(width, height);
  const deviation = longer === 0 ? 0 : Math.abs(width - height) / longer;
  if (deviation > tolerance) {
    return {
      ok: false,
      error: `Image must be square; received ${width}x${height}.`,
    };
  }

  return { ok: true, width, height };
}
