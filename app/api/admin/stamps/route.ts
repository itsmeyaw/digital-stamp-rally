import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/authorize";
import { getDb } from "@/lib/db/client";
import { createStamp, listStamps } from "@/lib/stamp/stamp";
import { validateStampImage } from "@/lib/stamp/validate-image";
import { uploadStampImage } from "@/lib/storage/blob";

/**
 * Admin Stamps API (issue #5). Both handlers gate on an Admin session read from
 * the request cookie (same seam as /api/admin/ping): a non-admin or missing
 * session gets 403.
 *
 * POST — create a Stamp from multipart/form-data (`name` + `image` file). The
 * image is validated as square and within configured size/type limits; a
 * rejection is a 400 with a clear message. On success the bytes go to Vercel
 * Blob (via the injectable seam) and the row is persisted; returns 201.
 *
 * GET — list all Stamps (newest first) for the admin dashboard.
 *
 * There is intentionally NO delete/deactivate handler: Stamps are never
 * hard-deleted (#9 adds retroactive deactivation as a separate, additive path).
 */

function requireAdmin(req: NextRequest) {
  const session = readSession(req.cookies.get(SESSION_COOKIE_NAME)?.value);
  return requireRole(session, "admin");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const name = formData.get("name");
  const image = formData.get("image");

  if (typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!(image instanceof Blob)) {
    return NextResponse.json({ error: "image is required" }, { status: 400 });
  }

  const data = new Uint8Array(await image.arrayBuffer());
  const contentType = image.type;

  const validation = validateStampImage(data, contentType);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const filename =
    image instanceof File && image.name ? image.name : `${name.trim()}.png`;
  const { url } = await uploadStampImage(filename, data, contentType);

  const stamp = await createStamp(getDb(), { name: name.trim(), imageUrl: url });
  return NextResponse.json(stamp, { status: 201 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!requireAdmin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const stamps = await listStamps(getDb());
  return NextResponse.json({ stamps }, { status: 200 });
}
