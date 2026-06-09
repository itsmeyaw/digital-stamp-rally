import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { getUserById } from "@/lib/user/get-user";
import { getCard } from "@/lib/user/card";
import CardPoller from "./CardPoller";

/**
 * The User's collection card: stamp art grid (filled/empty slots), their QR
 * code with a thick border, and a COMPLETE! banner when all slots are filled.
 *
 * No navigation chrome on this page — users access it via a shared link or
 * the QR code on their device.
 *
 * The `CardPoller` client component polls /api/card every ~4s so the card
 * updates live while the user stands at a booth.
 */
export default async function CardPage() {
  const session = await getSession();
  if (!session || session.role !== "user") redirect("/welcome");

  const user = await getUserById(getDb(), session.sub);
  if (!user) redirect("/welcome");

  const card = await getCard(getDb(), session.sub);
  const qrDataUrl = await QRCode.toDataURL(user.code, { margin: 1, width: 256 });

  return (
    <main className="flex flex-1 flex-col items-center gap-10 px-6 py-12">
      <h1 className="font-display text-3xl uppercase text-[var(--color-text)]">
        Your card
      </h1>

      {/* Polling stamp slots grid + completion banner */}
      <CardPoller initialCard={card} />

      {/* QR code — a punched ticket stub the booth scans. */}
      <div className="flex flex-col items-center gap-3">
        <div className="border-brutal bg-white p-3 shadow-hard-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`QR code for ${user.code}`}
            width={256}
            height={256}
            className="h-48 w-48"
          />
        </div>
        <p
          data-testid="user-code"
          className="border-[3px] border-black bg-[var(--color-accent)] px-4 py-1 font-mono text-2xl font-bold tracking-[0.3em] text-black"
        >
          {user.code}
        </p>
        <p className="text-sm font-medium text-[var(--color-text)]/70">
          Show this to a booth to collect a stamp.
        </p>
      </div>
    </main>
  );
}
