"use client";

import { supabase } from "@/lib/supabase/client";
import type { PhotoRecord } from "@/lib/gallery-types";

type Props = {
  photos: PhotoRecord[];
  loading: boolean;
  onSelectPhoto: (photo: PhotoRecord) => void;
};

export default function PhotoGallery({
  photos,
  loading,
  onSelectPhoto,
}: Props) {
  function photoUrl(path: string) {
    return supabase.storage
      .from("event-photos")
      .getPublicUrl(path).data.publicUrl;
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  }

  return (
    <section id="gallery" className="px-5 py-20 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">Captured together</p>
            <h2 className="section-heading mt-4">
              The shared gallery
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#788277]">
              Every photograph adds another beautiful memory
              to Charles and Wanjiku&apos;s celebration.
            </p>
          </div>

          <span className="rounded-full border border-[#dce3d9] bg-white px-4 py-2 text-xs font-semibold text-[#526653]">
            {photos.length} {photos.length === 1 ? "memory" : "memories"}
          </span>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-[#e6e3d9] bg-white py-24 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#d9d6ca] border-t-[#304936]" />
            <p className="mt-5 text-sm text-[#788277]">
              Gathering your memories...
            </p>
          </div>
        ) : photos.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#d7ddcf] bg-white px-6 py-24 text-center">
            <div className="text-5xl">✧</div>
            <h3 className="font-display mt-5 text-3xl">
              The memories start here
            </h3>
            <p className="mt-3 text-sm text-[#788277]">
              Be the first to share a photograph with everyone.
            </p>
            <a href="#upload" className="primary-button mt-7">
              Share the first photograph
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {photos.map((photo) => (
              <article
                key={photo.id}
                className="gallery-card group overflow-hidden rounded-2xl border border-[#e6e3d9] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <button
                  type="button"
                  onClick={() => onSelectPhoto(photo)}
                  className="block aspect-[4/5] w-full overflow-hidden bg-[#eeece3] text-left"
                  aria-label={`View photograph shared by ${photo.guest_name || "a guest"}`}
                >
                  <img
                    src={photoUrl(photo.file_path)}
                    alt={`Photograph shared by ${photo.guest_name || "a guest"}`}
                    loading="lazy"
                    className="gallery-image"
                  />
                </button>

                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-[#304936]">
                      {photo.guest_name || "A guest"}
                    </p>
                    <span className="shrink-0 text-[11px] text-[#92988d]">
                      {formatDate(photo.created_at)}
                    </span>
                  </div>

                  {photo.note && (
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#788277]">
                      &ldquo;{photo.note}&rdquo;
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectPhoto(photo)}
                    className="mt-4 text-xs font-semibold text-[#9a8058] transition hover:text-[#304936]"
                  >
                    View photograph ↗
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {photos.length > 0 && (
          <p className="mt-8 text-center text-xs text-[#92988d]">
            Showing the latest {photos.length} shared photographs.
          </p>
        )}
      </div>
    </section>
  );
}
