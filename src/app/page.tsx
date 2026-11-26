"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { PhotoRecord } from "@/lib/gallery-types";

import WeddingSlideshow from "@/components/wedding-slideshow";
import PhotoUploader from "@/components/photo-uploader";
import PhotoGallery from "@/components/photo-gallery";
import PhotoLightbox from "@/components/photo-lightbox";
import GuestMessageForm from "@/components/guest-message-form";

function sortPhotos(items: PhotoRecord[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );
}

export default function Home() {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] =
    useState<PhotoRecord | null>(null);
  const [galleryError, setGalleryError] = useState("");

  const addPhoto = useCallback((photo: PhotoRecord) => {
    setPhotos((current) => {
      if (current.some((item) => item.id === photo.id)) {
        return current;
      }

      return sortPhotos([photo, ...current]).slice(0, 100);
    });
  }, []);

  const closeLightbox = useCallback(() => {
    setSelectedPhoto(null);
  }, []);

  useEffect(() => {
    let active = true;

    const channel = supabase
      .channel("shared-gallery-live-photos")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "photos",
        },
        (payload) => {
          if (!active) return;
          addPhoto(payload.new as PhotoRecord);
        }
      )
      .subscribe();

    async function loadPhotos() {
      const { data, error } = await supabase
        .from("photos")
        .select("id, file_path, guest_name, note, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!active) return;

      if (error) {
        console.error("Could not load gallery:", error.message);
        setGalleryError(
          "We could not load the photographs. Please refresh the page."
        );
      } else {
        const incoming = (data ?? []) as PhotoRecord[];

        setPhotos((current) => {
          const combined = new Map<string, PhotoRecord>();

          incoming.forEach((photo) => combined.set(photo.id, photo));
          current.forEach((photo) => combined.set(photo.id, photo));

          return sortPhotos(Array.from(combined.values())).slice(0, 100);
        });
      }

      setLoading(false);
    }

    void loadPhotos();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [addPhoto]);

  async function downloadPhoto(photo: PhotoRecord) {
    const imageUrl = supabase.storage
      .from("event-photos")
      .getPublicUrl(photo.file_path).data.publicUrl;

    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error("The photograph could not be downloaded.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const extension = photo.file_path.split(".").pop() || "jpg";

      link.href = objectUrl;
      link.download = `charles-wanjiku-${photo.id}.${extension}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch (error) {
      console.error("Download error:", error);
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f8f6f0] text-[#29382e]">
      <header className="sticky top-0 z-50 border-b border-[#e6e3d9] bg-[#f8f6f0]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-10">
          <a href="#" className="flex items-center gap-3">
            <span className="font-display text-2xl font-semibold">
              C <span className="italic text-[#b59660]">&</span> W
            </span>
            <span className="hidden h-7 w-px bg-[#d9d6ca] sm:block" />
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-[#788277] sm:block">
              Our celebration
            </span>
          </a>

          <nav className="flex items-center gap-4 text-xs font-semibold text-[#526653] sm:gap-7 sm:text-sm">
            <a href="#gallery" className="transition hover:text-[#b59660]">
              Gallery
            </a>
            <a href="#message" className="hidden transition hover:text-[#b59660] sm:block">
              Leave a wish
            </a>
            <a href="#upload" className="primary-button min-h-10 px-4 py-2 text-xs">
              Share photos
            </a>
          </nav>
        </div>
      </header>

      <WeddingSlideshow />

      <section className="px-5 py-12 md:px-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="eyebrow">One day, countless memories</p>
          <h2 className="font-display mt-4 text-3xl font-medium leading-tight md:text-4xl">
            The best moments are even better when shared.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#788277]">
            Welcome to our shared collection. Add the photographs
            you captured, discover moments from family and friends,
            and leave a little love for the couple.
          </p>
        </div>
      </section>

      <PhotoUploader onPhotoUploaded={addPhoto} />

      <PhotoGallery
        photos={photos}
        loading={loading}
        onSelectPhoto={setSelectedPhoto}
      />

      {galleryError && (
        <p role="alert" className="mx-auto max-w-3xl px-5 pb-8 text-center text-sm text-red-700">
          {galleryError}
        </p>
      )}

      <GuestMessageForm />

      <footer className="border-t border-[#e6e3d9] bg-[#f8f6f0] px-5 py-12 text-center">
        <p className="font-display text-3xl font-medium text-[#29382e] sm:text-4xl">
          Charles <span className="italic text-[#b59660]">&</span> Wanjiku
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#788277]">
          <span>The Beginning of Forever</span>
          <span className="text-[#b59660]">✦</span>
          <span>Ruracio Ceremony</span>
        </div>
      </footer>

      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          onClose={closeLightbox}
          onDownload={() => void downloadPhoto(selectedPhoto)}
        />
      )}
    </main>
  );
}
