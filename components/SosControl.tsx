"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import {
  SOS_CONFIRM_HOLD_MS,
  SOS_NO_CONTACT,
  formatPhoneForDisplay,
  toTelHref,
  type EmergencyContact,
  type SosAnnouncement,
  type SosLocationResult,
  type SosPhase,
} from "@/types/sos";
import { copyText, sharePayload, shareUnsupportedMessage } from "@/lib/sos/share";

const BUTTON_BASE =
  "h-14 w-full rounded-2xl px-4 text-lg font-bold tracking-wide transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent";

interface SosControlProps {
  phase: SosPhase;
  progress: number;
  announcement: SosAnnouncement | null;
  primaryContact: EmergencyContact | null;
  location: SosLocationResult | null;
  locationLoading: boolean;
  settingsOpen: boolean;
  onStartConfirmation: () => void;
  onCancelConfirmation: () => void;
  onCancelSos: () => void;
  onArmHold: () => void;
  onDisarmHold: () => void;
  onShareLocation: () => void;
  onOpenSettings: () => void;
}

/**
 * The SOS control surface:
 *
 *  - A large, high-contrast floating SOS button (idle state).
 *  - A confirmation dialog: holding the CONFIRM button for ~3 seconds
 *    activates SOS; releasing or pressing CANCEL cancels. The dialog is
 *    keyboard- and screen-reader friendly (the hold works with Enter/Space,
 *    Escape and CANCEL cancel, progress is announced via aria-live).
 *  - An activated panel with CALL / SHARE LOCATION / CANCEL SOS.
 *
 * Activation always requires two deliberate gestures (tap SOS, then hold
 * CONFIRM for 3 seconds) — a single accidental tap can never trigger it.
 */
export function SosControl({
  phase,
  progress,
  announcement,
  primaryContact,
  location,
  locationLoading,
  settingsOpen,
  onStartConfirmation,
  onCancelConfirmation,
  onCancelSos,
  onArmHold,
  onDisarmHold,
  onShareLocation,
  onOpenSettings,
}: SosControlProps) {
  const sosButtonRef = useRef<HTMLButtonElement | null>(null);
  const holdButtonRef = useRef<HTMLButtonElement | null>(null);
  const holdActiveRef = useRef(false);
  const [holdActive, setHoldActive] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<{
    timestamp: number;
    message: string;
  } | null>(null);

  const confirming = phase === "confirming";
  const activated = phase === "activated";

  const confirmContainerRef = useDialogFocus({
    open: confirming,
    onEscape: onCancelConfirmation,
    initialFocusRef: holdButtonRef,
    restoreFocusRef: sosButtonRef,
  });
  const activatedContainerRef = useDialogFocus({
    open: activated,
    onEscape: onCancelSos,
    restoreFocusRef: sosButtonRef,
  });

  // Lock background scrolling while an SOS overlay is open.
  useEffect(() => {
    if (!confirming && !activated) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [confirming, activated]);

  const secondsRemaining = Math.max(
    1,
    Math.ceil(((100 - progress) / 100) * (SOS_CONFIRM_HOLD_MS / 1000)),
  );

  const handleHoldStart = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is optional; the hold still works.
      }
      holdActiveRef.current = true;
      setHoldActive(true);
      onArmHold();
    },
    [onArmHold],
  );

  const handleHoldEnd = useCallback(() => {
    if (!holdActiveRef.current) return;
    holdActiveRef.current = false;
    setHoldActive(false);
    onDisarmHold();
  }, [onDisarmHold]);

  const handleHoldKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (holdActiveRef.current) return;
      holdActiveRef.current = true;
      setHoldActive(true);
      onArmHold();
    },
    [onArmHold],
  );

  const handleHoldKeyEnd = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      handleHoldEnd();
    },
    [handleHoldEnd],
  );

  const handleShare = useCallback(async () => {
    if (!location?.ok) return;
    const result = await sharePayload(location.payload);
    const message =
      result === "shared"
        ? "Location shared."
        : result === "unsupported"
          ? shareUnsupportedMessage()
          : "Sharing was cancelled. Use Copy to share manually.";
    setShareFeedback({ timestamp: location.timestamp, message });
  }, [location]);

  const handleCopy = useCallback(async () => {
    if (!location?.ok) return;
    const result = await copyText(location.payload);
    setShareFeedback({
      timestamp: location.timestamp,
      message:
        result === "copied"
          ? "Location message copied. Send it to your emergency contact."
          : "Copying failed. Select the message text manually.",
    });
  }, [location]);

  const visibleShareFeedback =
    shareFeedback &&
    location?.ok &&
    shareFeedback.timestamp === location.timestamp
      ? shareFeedback.message
      : null;

  return (
    <>
      {/* Screen-reader announcements (never the only status signal). */}
      {activated ? (
        <div role="alert" className="sr-only">
          {announcement && <span key={announcement.id}>{announcement.message}</span>}
        </div>
      ) : (
        <div role="status" aria-live="polite" className="sr-only">
          {announcement && <span key={announcement.id}>{announcement.message}</span>}
        </div>
      )}

      {/* Idle floating control cluster (bottom-right, always reachable). */}
      {phase === "idle" && (
        <div
          className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3"
          inert={settingsOpen}
        >
          <button
            ref={sosButtonRef}
            type="button"
            onClick={onStartConfirmation}
            aria-label="SOS emergency. Press to start confirmation."
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-red-600 text-xl font-black tracking-wider text-white shadow-lg shadow-red-950/60 transition-colors hover:bg-red-500 active:bg-red-700 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            SOS
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="h-12 rounded-full border border-border bg-surface px-4 text-xs font-bold tracking-wide text-foreground transition-colors hover:border-accent/60 hover:bg-surface-raised focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            EMERGENCY CONTACTS
          </button>
        </div>
      )}

      {/* Confirmation overlay: two deliberate gestures are required. */}
      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          role="presentation"
        >
          <div className="absolute inset-0 bg-black/80" aria-hidden="true" />
          <div
            ref={confirmContainerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sos-confirm-title"
            aria-describedby="sos-confirm-desc"
            className="relative max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-3xl border-2 border-red-500 bg-surface-raised p-6 shadow-2xl"
          >
            <h2
              id="sos-confirm-title"
              className="text-xl font-black tracking-widest text-red-400"
            >
              SOS CONFIRMATION
            </h2>
            <p id="sos-confirm-desc" className="mt-2 text-sm text-foreground/85">
              Hold the CONFIRM button for 3 seconds to activate SOS. Release
              the button or press CANCEL to cancel.
            </p>

            <div className="mt-5">
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-label="Confirmation hold progress"
                className="h-3 w-full overflow-hidden rounded-full bg-black/40"
              >
                <div
                  className="h-full bg-red-500 transition-[width] duration-75"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-center text-sm font-semibold text-foreground">
                {holdActive
                  ? "HOLDING… RELEASE TO CANCEL"
                  : `Hold for ${secondsRemaining} second${secondsRemaining === 1 ? "" : "s"}`}
              </p>
            </div>

            <button
              ref={holdButtonRef}
              type="button"
              onPointerDown={handleHoldStart}
              onPointerUp={handleHoldEnd}
              onPointerCancel={handleHoldEnd}
              onKeyDown={handleHoldKeyDown}
              onKeyUp={handleHoldKeyEnd}
              onContextMenu={(event) => event.preventDefault()}
              aria-pressed={holdActive}
              className="mt-5 flex h-20 w-full touch-none items-center justify-center rounded-2xl border-2 border-white bg-red-600 px-4 text-2xl font-black tracking-wider text-white transition-colors hover:bg-red-500 active:bg-red-700 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {holdActive ? "RELEASE TO CANCEL" : "HOLD TO CONFIRM"}
            </button>

            <button
              type="button"
              onClick={onCancelConfirmation}
              className={`${BUTTON_BASE} mt-3 border border-border bg-surface text-foreground hover:border-accent/60 hover:bg-surface-raised`}
            >
              CANCEL
            </button>

            <p className="mt-3 text-center text-xs text-muted">
              Releasing before 3 seconds cancels. Nothing is sent automatically.
            </p>
          </div>
        </div>
      )}

      {/* Activated overlay: explicit actions only. */}
      {activated && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          role="presentation"
        >
          <div className="absolute inset-0 bg-black/85" aria-hidden="true" />
          <div
            ref={activatedContainerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sos-activated-title"
            className="relative flex max-h-[92dvh] w-full max-w-sm flex-col overflow-y-auto rounded-3xl border-2 border-red-500 bg-surface-raised shadow-2xl"
          >
            <header className="sticky top-0 bg-red-600 px-6 py-4">
              <h2
                id="sos-activated-title"
                className="animate-pulse text-center text-3xl font-black tracking-widest text-white"
              >
                SOS ACTIVATED
              </h2>
            </header>

            <div className="flex flex-col gap-3 p-5">
              <p className="text-center text-sm text-foreground/85">
                Emergency mode is active. Emergency services are not called
                automatically. Choose an action below.
              </p>

              {primaryContact ? (
                <a
                  href={toTelHref(primaryContact.phone)}
                  className={`${BUTTON_BASE} flex flex-col items-center justify-center bg-emerald-500 text-center text-accent-contrast hover:bg-emerald-400`}
                >
                  <span className="block">CALL {primaryContact.name.toUpperCase()}</span>
                  <span className="block text-sm font-semibold opacity-90">
                    {formatPhoneForDisplay(primaryContact.phone)}
                  </span>
                </a>
              ) : (
                <div className="rounded-2xl border border-border bg-black/30 p-4">
                  <button
                    type="button"
                    disabled
                    className={`${BUTTON_BASE} cursor-not-allowed border border-border bg-surface text-muted opacity-60`}
                  >
                    CALL EMERGENCY CONTACT
                  </button>
                  <p className="mt-2 text-xs text-muted">{SOS_NO_CONTACT}</p>
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="mt-2 w-full text-center text-sm font-bold text-accent underline underline-offset-2 hover:text-accent-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    OPEN SOS SETTINGS
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onShareLocation}
                disabled={locationLoading}
                className={`${BUTTON_BASE} border border-border bg-surface text-foreground hover:border-accent/60 hover:bg-surface-raised`}
              >
                {locationLoading ? "GETTING LOCATION…" : "SHARE LOCATION"}
              </button>

              {location?.ok && (
                <div
                  aria-live="polite"
                  className="rounded-2xl border border-border bg-black/30 p-4"
                >
                  <p className="text-sm font-semibold text-foreground">
                    Location found. Send it to your emergency contact.
                  </p>
                  <p className="mt-2 break-words rounded-lg bg-black/40 p-3 text-xs text-foreground/90">
                    {location.payload}
                  </p>
                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      onClick={handleShare}
                      className={`${BUTTON_BASE} bg-accent text-accent-contrast hover:bg-accent-hover`}
                    >
                      SHARE LOCATION
                    </button>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`${BUTTON_BASE} border border-border bg-surface text-foreground hover:border-accent/60 hover:bg-surface-raised`}
                    >
                      COPY MESSAGE
                    </button>
                    <a
                      href={location.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${BUTTON_BASE} flex items-center justify-center border border-border bg-surface text-foreground hover:border-accent/60 hover:bg-surface-raised`}
                    >
                      OPEN MAP
                    </a>
                  </div>
                  {visibleShareFeedback && (
                    <p className="mt-3 text-xs text-muted">{visibleShareFeedback}</p>
                  )}
                </div>
              )}

              {location && !location.ok && (
                <div
                  aria-live="polite"
                  className="rounded-2xl border border-border bg-black/30 p-4"
                >
                  <p className="text-sm text-foreground/90">{location.message}</p>
                  <button
                    type="button"
                    onClick={onShareLocation}
                    className={`${BUTTON_BASE} mt-3 border border-border bg-surface text-foreground hover:border-accent/60 hover:bg-surface-raised`}
                  >
                    TRY AGAIN
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onCancelSos}
                className={`${BUTTON_BASE} border-2 border-white bg-surface text-white hover:bg-surface-raised`}
              >
                CANCEL SOS
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}