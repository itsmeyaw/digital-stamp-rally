import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { setupTestDb } from "@/test/db-harness";
import { stamps } from "@/lib/db/schema";
import { signToken, type Role } from "@/lib/auth/token";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const SECRET = "route-test-secret";
const h = setupTestDb();

// Build a minimal PNG carrying a real IHDR so image-size can read dimensions.
function png(width: number, height: number): Uint8Array {
  const u32 = (n: number) => [
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  ];
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // signature
    ...u32(13), 0x49, 0x48, 0x44, 0x52, // IHDR length + type
    ...u32(width), ...u32(height),
    0x08, 0x06, 0x00, 0x00, 0x00,
  ]);
}

function token(role: Role): string {
  return signToken({ sub: `${role}-1`, role }, { secret: SECRET, ttlSeconds: 3600 });
}

function form(
  name: string | null,
  image: Uint8Array | null,
  type = "image/png",
  extra?: { bgColor?: string; textColor?: string },
): FormData {
  const fd = new FormData();
  if (name !== null) fd.set("name", name);
  if (image !== null) {
    fd.set("image", new Blob([image.buffer as ArrayBuffer], { type }), "stamp.png");
  }
  if (extra?.bgColor !== undefined) fd.set("bgColor", extra.bgColor);
  if (extra?.textColor !== undefined) fd.set("textColor", extra.textColor);
  return fd;
}

async function postStamp(opts: {
  role?: Role;
  fd: FormData;
}) {
  const { POST } = await import("./route");
  const headers: Record<string, string> = {};
  if (opts.role) headers.cookie = `${SESSION_COOKIE_NAME}=${token(opts.role)}`;
  const req = new NextRequest("http://localhost/api/admin/stamps", {
    method: "POST",
    headers,
    body: opts.fd,
  });
  return POST(req);
}

async function getStamps(role?: Role) {
  const { GET } = await import("./route");
  const headers: Record<string, string> = {};
  if (role) headers.cookie = `${SESSION_COOKIE_NAME}=${token(role)}`;
  return GET(
    new NextRequest("http://localhost/api/admin/stamps", { method: "GET", headers }),
  );
}

beforeAll(() => {
  process.env.SESSION_SECRET = SECRET;
  globalThis.__dsrDb = h.db;
});

beforeEach(async () => {
  // Inject a fake Blob uploader so no network call happens.
  globalThis.__dsrBlob = async (filename) => ({
    url: `https://fake.blob/${filename}`,
  });
  // Start each test from an empty stamps table for clean count assertions.
  await h.db.delete(stamps);
});

afterAll(() => {
  delete globalThis.__dsrBlob;
});

describe("POST /api/admin/stamps", () => {
  it("creates a stamp from a square image, persists and lists it (admin)", async () => {
    const res = await postStamp({ role: "admin", fd: form("Coffee", png(200, 200)) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Coffee");
    expect(body.imageUrl).toContain("https://fake.blob/");

    const rows = await h.db.select().from(stamps);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Coffee");
    expect(rows[0].active).toBe(true);

    const listRes = await getStamps("admin");
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(list.stamps).toHaveLength(1);
    expect(list.stamps[0].name).toBe("Coffee");
  });

  it("rejects a non-square image with 400 and persists nothing", async () => {
    const res = await postStamp({ role: "admin", fd: form("Wide", png(200, 100)) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/square/i);
    const rows = await h.db.select().from(stamps);
    expect(rows).toHaveLength(0);
  });

  it("rejects a disallowed content type with 400", async () => {
    const res = await postStamp({
      role: "admin",
      fd: form("Gif", png(200, 200), "image/gif"),
    });
    expect(res.status).toBe(400);
  });

  it("rejects a missing name with 400", async () => {
    const res = await postStamp({ role: "admin", fd: form(null, png(200, 200)) });
    expect(res.status).toBe(400);
  });

  it("rejects a non-admin session with 403 and persists nothing", async () => {
    const res = await postStamp({ role: "stamper", fd: form("Nope", png(200, 200)) });
    expect(res.status).toBe(403);
    const rows = await h.db.select().from(stamps);
    expect(rows).toHaveLength(0);
  });

  it("rejects an unauthenticated request with 403", async () => {
    const res = await postStamp({ fd: form("Nope", png(200, 200)) });
    expect(res.status).toBe(403);
  });

  it("uses default bgColor and textColor when not provided", async () => {
    const res = await postStamp({ role: "admin", fd: form("Default", png(200, 200)) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.bgColor).toBe("#0057FF");
    expect(body.textColor).toBe("#FFFFFF");
  });

  it("persists explicit bgColor and textColor when provided", async () => {
    const res = await postStamp({
      role: "admin",
      fd: form("Custom", png(200, 200), "image/png", { bgColor: "#FF0000", textColor: "#000000" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.bgColor).toBe("#FF0000");
    expect(body.textColor).toBe("#000000");
  });
});

describe("GET /api/admin/stamps", () => {
  it("rejects a non-admin session with 403", async () => {
    const res = await getStamps("stamper");
    expect(res.status).toBe(403);
  });
});
