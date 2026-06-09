import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { getUserById } from "@/lib/user/get-user";
import { getCard } from "@/lib/user/card";

/**
 * The User's collection card: 5 (currently empty) Slots, their QR code, and
 * their 6-character public handle. Requires a valid user session; anyone else
 * is sent to welcome. Slots/Complete are derived (ADR-0003) — empty in this
 * foundation slice.
 */
export default async function CardPage() {
  const session = await getSession();
  if (!session || session.role !== "user") redirect("/welcome");

  const user = await getUserById(getDb(), session.sub);
  if (!user) redirect("/welcome");

  const card = getCard(session);
  const qrDataUrl = await QRCode.toDataURL(user.code, { margin: 1, width: 256 });

  return (
    <main className="flex flex-1 flex-col items-center gap-8 bg-zinc-50 px-6 py-12 dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Your card
      </h1>

      <ul
        aria-label="stamp slots"
        className="grid grid-cols-5 gap-3"
      >
        {card.slots.map((slot, i) => (
          <li
            key={i}
            data-testid="slot"
            data-filled={slot !== null}
            className="flex aspect-square w-14 items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-zinc-300 dark:border-zinc-700 dark:text-zinc-700"
          >
            {i + 1}
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt={`QR code for ${user.code}`}
          width={256}
          height={256}
          className="rounded-xl bg-white p-3"
        />
        <p
          data-testid="user-code"
          className="font-mono text-2xl tracking-[0.3em] text-black dark:text-zinc-50"
        >
          {user.code}
        </p>
        <p className="text-sm text-zinc-500">
          Show this to a booth to collect a stamp.
        </p>
      </div>
    </main>
  );
}
