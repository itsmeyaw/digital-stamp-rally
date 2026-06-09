import { describe, it, expect, afterEach } from "vitest";
import { uploadStampImage } from "./blob";

afterEach(() => {
  delete globalThis.__dsrBlob;
});

describe("uploadStampImage", () => {
  it("delegates to an injected uploader and returns its url", async () => {
    const calls: Array<{ filename: string; contentType: string; size: number }> =
      [];
    globalThis.__dsrBlob = async (filename, data, contentType) => {
      calls.push({ filename, contentType, size: data.byteLength });
      return { url: `https://fake.blob/${filename}` };
    };

    const result = await uploadStampImage(
      "coffee.png",
      Uint8Array.from([1, 2, 3]),
      "image/png",
    );

    expect(result.url).toBe("https://fake.blob/coffee.png");
    expect(calls).toEqual([
      { filename: "coffee.png", contentType: "image/png", size: 3 },
    ]);
  });
});
