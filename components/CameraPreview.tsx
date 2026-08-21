"use client";

import { useEffect, useRef } from "react";

interface CameraPreviewProps {
  stream: MediaStream | null;
}

const PANEL_CLASSES = [
  "h-[40dvh] max-h-[360px] w-full overflow-hidden rounded-2xl border border-border bg-surface [@media(max-height:600px)]:h-[28dvh] [@media(max-height:480px)]:h-[22dvh]",
].join(" ");

/**
 * Camera preview area.
 *
 * Shows the real live camera feed once a stream is provided. Until
 * then, a placeholder is shown and no permission is requested.
 * The video is a passive input for the assistant, so it is labelled
 * as such and never announces frame changes.
 */
export function CameraPreview({ stream }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
    }
    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  if (!stream) {
    return (
      <div
        role="img"
        aria-label="Camera preview area."
        className={`${PANEL_CLASSES} flex flex-col items-center justify-center gap-4 text-center`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 48 48"
          className="h-16 w-16 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="6" y="14" width="36" height="24" rx="4" />
          <path d="M22 24l8 5-8 5V24z" fill="currentColor" stroke="none" />
          <path d="M32 10l3-3h4l3 3" />
        </svg>
        <p className="text-lg font-semibold text-foreground">Camera preview</p>
        <p className="max-w-xs text-sm text-muted">
          Press Start Assistant to enable the camera.
        </p>
      </div>
    );
  }

  return (
    <div className={PANEL_CLASSES}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        role="img"
        aria-label="Live camera preview."
        className="h-full w-full rounded-2xl object-cover"
      />
    </div>
  );
}
