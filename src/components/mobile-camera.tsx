"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  onUsePicker: () => void;
};

export default function MobileCamera({
  open,
  onClose,
  onCapture,
  onUsePicker,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      setCameraError("");

      if (
        !window.isSecureContext ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setCameraError(
          "Direct camera access needs a secure HTTPS connection. You can use your phone's camera picker instead."
        );
        return;
      }

      setStarting(true);

      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });

        if (cancelled) {
          cameraStream.getTracks().forEach((track) => track.stop());
          return;
        }

        activeStream = cameraStream;
        setStream(cameraStream);
      } catch (error) {
        console.error("Camera access error:", error);
        setCameraError(
          "We couldn't open your camera. Check browser permissions or use the camera picker."
        );
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      activeStream?.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  useEffect(() => {
    const video = videoRef.current;

    if (!stream || !video) return;

    video.srcObject = stream;
    void video.play().catch((error) => {
      console.error("Camera preview could not start:", error);
    });
  }, [stream]);

  function closeCamera() {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    onClose();
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("Your camera is not ready yet. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("Unable to capture this photograph.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("The photograph could not be captured.");
          return;
        }

        const file = new File(
          [blob],
          `shared-gallery-${Date.now()}.jpg`,
          { type: "image/jpeg" }
        );

        onCapture(file);
        closeCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex flex-col bg-[#111611] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Take a photograph"
    >
      <header className="flex items-center justify-between px-5 py-5">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#d9c394]">
            Camera
          </p>
          <h2 className="mt-1 font-display text-2xl">
            Capture a memory
          </h2>
        </div>

        <button
          type="button"
          onClick={closeCamera}
          aria-label="Close camera"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-2xl"
        >
          ×
        </button>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-3">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-full w-full rounded-2xl bg-black object-contain"
          />
        ) : (
          <div className="mx-auto max-w-md px-6 text-center">
            <div className="text-5xl">📷</div>

            <p className="mt-5 text-sm leading-7 text-white/75">
              {starting
                ? "Opening your camera..."
                : cameraError || "Preparing your camera..."}
            </p>

            {!starting && (
              <button
                type="button"
                onClick={onUsePicker}
                className="mt-7 rounded-full bg-[#e5d6b5] px-6 py-3 text-sm font-semibold text-[#26382c]"
              >
                Use phone camera picker
              </button>
            )}
          </div>
        )}
      </div>

      <footer className="flex flex-col items-center gap-4 px-5 pb-8 pt-5">
        {stream && (
          <button
            type="button"
            onClick={capturePhoto}
            className="flex min-h-16 min-w-16 items-center justify-center rounded-full border-[5px] border-white bg-[#e5d6b5] shadow-xl"
            aria-label="Capture photograph"
          >
            <span className="h-10 w-10 rounded-full bg-[#304936]" />
          </button>
        )}

        <p className="text-xs text-white/50">
          Your captured photo will be added to your selection.
        </p>
      </footer>
    </div>
  );
}
