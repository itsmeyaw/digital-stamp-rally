import { describe, it, expect } from "vitest";
import { validateStampImage } from "./validate-image";

// Minimal valid PNG headers carrying explicit IHDR width/height. image-size
// reads dimensions from the header, so a header-only buffer is enough.
function pngOfSize(width: number, height: number): Uint8Array {
  // PNG signature + IHDR chunk (length, "IHDR", width, height, ...).
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const ihdrLen = [0x00, 0x00, 0x00, 0x0d];
  const ihdrType = [0x49, 0x48, 0x44, 0x52];
  const w = [
    (width >>> 24) & 0xff,
    (width >>> 16) & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
  ];
  const h = [
    (height >>> 24) & 0xff,
    (height >>> 16) & 0xff,
    (height >>> 8) & 0xff,
    height & 0xff,
  ];
  const rest = [0x08, 0x06, 0x00, 0x00, 0x00];
  return Uint8Array.from([
    ...sig,
    ...ihdrLen,
    ...ihdrType,
    ...w,
    ...h,
    ...rest,
  ]);
}

describe("validateStampImage", () => {
  it("accepts a square png within limits", () => {
    const result = validateStampImage(pngOfSize(200, 200), "image/png");
    expect(result.ok).toBe(true);
  });

  it("rejects a non-square image", () => {
    const result = validateStampImage(pngOfSize(200, 100), "image/png");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/square/i);
  });

  it("rejects an oversized image", () => {
    process.env.STAMP_IMAGE_MAX_BYTES = "10";
    try {
      const result = validateStampImage(pngOfSize(200, 200), "image/png");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/too large/i);
    } finally {
      delete process.env.STAMP_IMAGE_MAX_BYTES;
    }
  });

  it("rejects a disallowed content type", () => {
    const result = validateStampImage(pngOfSize(200, 200), "image/gif");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/type/i);
  });
});
