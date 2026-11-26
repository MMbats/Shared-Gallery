"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { PhotoRecord } from "@/lib/gallery-types";

type Props = {
  photo: PhotoRecord;
  onClose: () => void;
  onDownload: () => void;
};

export default function PhotoLightbox({
  photo,
  onClose,
  onDownload,
}: Props) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const imageUrl = supabase.storage
    .from("event-photos")
    .getPublicUrl(photo.file_path).data.publicUrl;

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photograph viewer"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-6xl flex-col items-center"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex w-full items-center justify-between gap-4">
          <div className="min-w-0 text-white">
            <p className="truncate text-sm font-semibold">
              {photo.guest_name || "A guest"}
            </p>
            <p className="mt-1 text-xs text-white/55">Shared memory</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              className="rounded-full border border-white/30 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white hover:text-[#203629]"
            >
              Download ↓
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close photograph viewer"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-2xl text-white transition hover:bg-white hover:text-[#203629]"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex min-h-0 w-full flex-1 items-center justify-center">
          <img
            src={imageUrl}
            alt={`Photograph shared by ${photo.guest_name || "a guest"}`}
            className="lightbox-image rounded-md"
          />
        </div>

        {photo.note && (
          <p className="mt-5 max-w-2xl text-center font-display text-xl italic leading-8 text-white/90">
            &ldquo;{photo.note}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
