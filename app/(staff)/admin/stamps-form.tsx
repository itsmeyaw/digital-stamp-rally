"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StampCard } from "@/components/StampCard";
import { fieldLabel, fieldInput, btnPrimary, errorBanner } from "./field-styles";

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
      className="flex w-full flex-col gap-4"
    >
      <label className={fieldLabel}>
        Name
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={fieldInput}
        />
      </label>
      <label className={fieldLabel}>
        Square image
        <input
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          required
          className="border-brutal bg-white p-2 text-sm shadow-hard-sm file:mr-3 file:border-0 file:bg-black file:px-3 file:py-1 file:font-bold file:uppercase file:text-white"
        />
      </label>
      <div className="flex gap-4">
        <label className={`${fieldLabel} flex-1`}>
          Background color
          <input
            name="bgColor"
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="h-12 w-full cursor-pointer border-brutal shadow-hard-sm"
          />
        </label>
        <label className={`${fieldLabel} flex-1`}>
          Text color
          <input
            name="textColor"
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="h-12 w-full cursor-pointer border-brutal shadow-hard-sm"
          />
        </label>
      </div>

      <section aria-label="Preview" className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-black/50">
          Live preview
        </p>
        <div className="w-40">
          <StampCard
            name={name || "Preview"}
            imageUrl={previewUrl || "/placeholder.png"}
            bgColor={bgColor}
            textColor={textColor}
          />
        </div>
      </section>

      {error && (
        <p role="alert" className={errorBanner}>
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting} className={btnPrimary}>
        {submitting ? "Creating…" : "Create stamp"}
      </button>
    </form>
  );
}
