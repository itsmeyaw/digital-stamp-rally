"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StampCard } from "@/components/StampCard";

const DEFAULT_BG_COLOR = "#0057ff";
const DEFAULT_TEXT_COLOR = "#ffffff";

/**
 * Admin Stamp-creation form. Posts a multipart name + square image to
 * POST /api/admin/stamps; on success the server validates, uploads the image to
 * Blob, persists the Stamp, and we refresh so the new Stamp appears in the list.
 * Validation failures (non-square / oversized / wrong type) surface inline.
 */
export default function StampForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [bgColor, setBgColor] = useState(DEFAULT_BG_COLOR);
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) {
      setPreviewUrl(URL.createObjectURL(selected));
    } else {
      setPreviewUrl("");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Choose a square image.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("image", file);
      fd.set("bgColor", bgColor);
      fd.set("textColor", textColor);
      const res = await fetch("/api/admin/stamps", { method: "POST", body: fd });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not create the stamp.");
        return;
      }
      setName("");
      setFile(null);
      setPreviewUrl("");
      setBgColor(DEFAULT_BG_COLOR);
      setTextColor(DEFAULT_TEXT_COLOR);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      aria-label="Create stamp"
      onSubmit={onSubmit}
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <label className="flex flex-col gap-1 text-left text-sm font-medium">
        Name
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="h-11 rounded-lg border border-black/15 px-3 dark:border-white/20 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-left text-sm font-medium">
        Square image
        <input
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          required
          className="text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-left text-sm font-medium">
        Background color
        <input
          name="bgColor"
          type="color"
          value={bgColor}
          onChange={(e) => setBgColor(e.target.value)}
          className="h-11 w-full cursor-pointer rounded-lg border border-black/15"
        />
      </label>
      <label className="flex flex-col gap-1 text-left text-sm font-medium">
        Text color
        <input
          name="textColor"
          type="color"
          value={textColor}
          onChange={(e) => setTextColor(e.target.value)}
          className="h-11 w-full cursor-pointer rounded-lg border border-black/15"
        />
      </label>

      <section aria-label="Preview">
        <p className="mb-2 text-sm font-medium">Preview</p>
        <StampCard
          name={name || "Preview"}
          imageUrl={previewUrl || "/placeholder.png"}
          bgColor={bgColor}
          textColor={textColor}
        />
      </section>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="flex h-12 items-center justify-center rounded-full bg-black px-5 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {submitting ? "Creating…" : "Create stamp"}
      </button>
    </form>
  );
}
