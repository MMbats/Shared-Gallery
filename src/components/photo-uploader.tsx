"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import MobileCamera from "@/components/mobile-camera";
import { supabase } from "@/lib/supabase/client";
import type { PhotoRecord } from "@/lib/gallery-types";

type Props = {
  onPhotoUploaded: (photo: PhotoRecord) => void;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const SUPPORTED_EXTENSIONS = [
  "jpg", "jpeg", "png", "webp", "heic",
];

function getContentType(file: File) {
  if (file.type) return file.type;

  const extension = file.name.split(".").pop()?.toLowerCase();

  const types: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
  };

  return types[extension || ""] || "application/octet-stream";
}

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PhotoUploader({ onPhotoUploaded }: Props) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [guestName, setGuestName] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  function handleSelection(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";

    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const file of selected) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const supported = SUPPORTED_EXTENSIONS.includes(extension || "");

      if (!supported) {
        rejected.push(`${file.name}: unsupported image format`);
      } else if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name}: larger than 10 MB`);
      } else {
        accepted.push(file);
      }
    }

    if (accepted.length > 0) {
      setFiles((current) => {
        const combined = [...current, ...accepted];
        const unique = new Map<string, File>();

        combined.forEach((file) => {
          unique.set(
            `${file.name}-${file.size}-${file.lastModified}`,
            file
          );
        });

        return Array.from(unique.values());
      });

      setStatus("");
    }

    if (rejected.length > 0) {
      setStatus(rejected.join(". "));
    }
  }

  function openChoice(input: HTMLInputElement | null) {
    setMenuOpen(false);
    input?.click();
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  function clearSelection() {
    setFiles([]);
    setGuestName("");
    setNote("");
    setStatus("");
    setUploadProgress(0);
  }

  async function uploadPhotos() {
    const cleanName = guestName.trim();
    const cleanNote = note.trim();

    if (!cleanName) {
      setStatus("Please enter your name before uploading.");
      return;
    }

    if (cleanName.length > 60 || cleanNote.length > 500) {
      setStatus("Please check the length of your name or note.");
      return;
    }

    if (files.length === 0) {
      setStatus("Please add at least one photograph.");
      return;
    }

    setUploading(true);
    setStatus("Preparing your photographs...");
    setUploadProgress(0);

    const failedFiles: File[] = [];
    const errors: string[] = [];
    let uploadedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      setStatus(`Uploading photograph ${i + 1} of ${files.length}`);

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `photos/${crypto.randomUUID()}-${safeName}`;

      const { error: storageError } = await supabase.storage
        .from("event-photos")
        .upload(filePath, file, {
          cacheControl: "3600",
          contentType: getContentType(file),
          upsert: false,
        });

      if (storageError) {
        failedFiles.push(file);
        errors.push(`${file.name}: ${storageError.message}`);
        continue;
      }

      const { data, error: databaseError } = await supabase
        .from("photos")
        .insert({
          file_path: filePath,
          guest_name: cleanName,
          note: cleanNote,
        })
        .select("id, file_path, guest_name, note, created_at")
        .single();

      if (databaseError) {
        failedFiles.push(file);
        errors.push(`${file.name}: ${databaseError.message}`);
        continue;
      }

      onPhotoUploaded(data as PhotoRecord);
      uploadedCount++;

      setUploadProgress(
        Math.round(((i + 1) / files.length) * 100)
      );
    }

    setUploading(false);
    setFiles(failedFiles);

    if (failedFiles.length === 0) {
      setGuestName("");
      setNote("");
      setStatus(
        `Wonderful! ${uploadedCount} photograph(s) have been shared.`
      );
      setUploadProgress(100);
    } else {
      setStatus(
        `${uploadedCount} uploaded successfully. ${failedFiles.length} need another attempt.`
      );
      console.error("Photo upload errors:", errors);
    }
  }

  return (
    <section id="upload" className="px-4 py-16 sm:px-6 md:px-10 md:py-20">
      <MobileCamera
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => {
          setFiles((current) => [...current, file]);
          setStatus("Photo captured. Add your name and note before uploading.");
        }}
        onUsePicker={() => {
          setCameraOpen(false);
          cameraInput.current?.click();
        }}
      />

      <div className="soft-card mx-auto max-w-4xl p-5 sm:p-8 md:p-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Your moments matter</p>

          <h2 className="section-heading mt-4">
            Add to the memories
          </h2>

          <p className="mt-4 text-sm leading-7 text-[#788277] sm:text-base">
            Share the beautiful moments you captured.
            Every photograph becomes part of their story.
          </p>

          <p className="mt-6 font-display text-2xl italic leading-relaxed text-[#9a8058] sm:text-3xl">
            Don&apos;t let your pictures die in the camera roll.
          </p>

          <p className="mt-2 text-sm font-semibold tracking-wide text-[#304936]">
            If you captured it, we want it.
          </p>
        </div>

        <div className="mx-auto mt-9 max-w-xl">
          {/* Add photos dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              className="flex min-h-14 w-full items-center justify-between rounded-full bg-[#304936] px-6 py-4 text-sm font-semibold text-white shadow-lg transition hover:bg-[#203629] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#b59660]"
            >
              <span className="flex items-center gap-3">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                Add photos
              </span>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`h-5 w-5 transition-transform ${
                  menuOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              >
                <path
                  d="m6 9 6 6 6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute left-0 right-0 top-[calc(100%+10px)] z-40 overflow-hidden rounded-2xl border border-[#e6e3d9] bg-white p-2 shadow-2xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); setCameraOpen(true); }}
                  className="flex w-full items-center gap-4 rounded-xl p-4 text-left transition hover:bg-[#f4f5ef] active:bg-[#e9eee5]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e7eee5] text-[#304936]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
                      <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#304936]">
                      Take a photo
                    </span>
                    <span className="mt-1 block text-xs text-[#8b9489]">
                      Open your phone camera
                    </span>
                  </span>

                  <span className="text-[#b59660]">›</span>
                </button>

                <div className="mx-3 border-t border-[#eeece4]" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openChoice(galleryInput.current)}
                  className="flex w-full items-center gap-4 rounded-xl p-4 text-left transition hover:bg-[#f4f5ef] active:bg-[#e9eee5]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f3eee3] text-[#987a4d]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#304936]">
                      Photo library
                    </span>
                    <span className="mt-1 block text-xs text-[#8b9489]">
                      Choose pictures from your gallery
                    </span>
                  </span>

                  <span className="text-[#b59660]">›</span>
                </button>

                <div className="mx-3 border-t border-[#eeece4]" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openChoice(filesInput.current)}
                  className="flex w-full items-center gap-4 rounded-xl p-4 text-left transition hover:bg-[#f4f5ef] active:bg-[#e9eee5]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0eaf0] text-[#806783]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                      <path d="M14 2v6h6M8 13h8M8 17h8" />
                    </svg>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#304936]">
                      Browse files
                    </span>
                    <span className="mt-1 block text-xs text-[#8b9489]">
                      Select pictures from device storage
                    </span>
                  </span>

                  <span className="text-[#b59660]">›</span>
                </button>
              </div>
            )}
          </div>

          {/* Hidden device inputs */}
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleSelection}
            className="hidden"
          />

          <input
            ref={galleryInput}
            type="file"
            accept="image/*"
            multiple
            onChange={handleSelection}
            className="hidden"
          />

          <input
            ref={filesInput}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp,image/heic"
            multiple
            onChange={handleSelection}
            className="hidden"
          />


          {/* Selected photographs */}
          {files.length > 0 && (
            <div className="mt-8 rounded-2xl border border-[#e6e3d9] bg-[#fbfaf7] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#304936]">
                    Your selected photos
                  </p>
                  <p className="mt-1 text-xs text-[#92988d]">
                    {files.length} {files.length === 1 ? "photo" : "photos"} ready to share
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={uploading}
                  className="text-xs font-semibold text-[#9a6e4f]"
                >
                  Clear all
                </button>
              </div>

              <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="flex items-center gap-3 rounded-xl bg-white p-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e7eee5] text-[#304936]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-[#435347]">
                        {file.name}
                      </span>
                      <span className="mt-1 block text-[11px] text-[#92988d]">
                        {formatSize(file.size)}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      aria-label={`Remove ${file.name}`}
                      className="shrink-0 rounded-full p-2 text-sm text-[#9a6e4f] hover:bg-[#f6eee7]"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Details appear after photo selection */}
          {files.length > 0 && (
            <div className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="uploadGuestName"
                  className="mb-2 block text-sm font-semibold text-[#304936]"
                >
                  Your name or nickname
                </label>

                <input
                  id="uploadGuestName"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  maxLength={60}
                  placeholder="e.g. Auntie Mary"
                  disabled={uploading}
                  className="form-field"
                />
              </div>

              <div>
                <label
                  htmlFor="uploadPhotoNote"
                  className="mb-2 block text-sm font-semibold text-[#304936]"
                >
                  Add a note
                  <span className="ml-2 font-normal text-[#92988d]">
                    Optional
                  </span>
                </label>

                <textarea
                  id="uploadPhotoNote"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  rows={3}
                  disabled={uploading}
                  placeholder="Write a little message or share the memory behind these photos..."
                  className="form-field resize-y"
                />

                <p className="mt-1 text-right text-xs text-[#92988d]">
                  {note.length}/500
                </p>
              </div>

              {uploading && (
                <div className="h-2 overflow-hidden rounded-full bg-[#e7e7df]">
                  <div
                    className="h-full rounded-full bg-[#304936] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={uploadPhotos}
                disabled={uploading || files.length === 0}
                className="primary-button min-h-14 w-full"
              >
                {uploading
                  ? "Sharing your memories..."
                  : `Upload ${files.length} ${files.length === 1 ? "photo" : "photos"}`}
              </button>
            </div>
          )}

          {status && (
            <p
              aria-live="polite"
              role="status"
              className="mt-5 text-center text-sm leading-6 text-[#536c56]"
            >
              {status}
            </p>
          )}

          <p className="mt-6 text-center text-xs leading-6 text-[#92988d]">
            Your photographs will become part of the shared
            collection for everyone to enjoy.
          </p>
        </div>
      </div>
    </section>
  );
}
