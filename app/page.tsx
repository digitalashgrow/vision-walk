"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CameraPreview } from "@/components/CameraPreview";
import { DeviceDebugPanel } from "@/components/DeviceDebugPanel";
import { SosControl } from "@/components/SosControl";
import { SosSettings } from "@/components/SosSettings";
import { StatusBadge } from "@/components/StatusBadge";
import { useAssistantState } from "@/hooks/useAssistantState";
import { useSos } from "@/hooks/useSos";
import { speakInstruction } from "@/lib/sos/speech";
import { PRIMARY_STATUS, PRIMARY_STATUS_HINT } from "@/types";
import type { SosPhase } from "@/types/sos";

const DEBUG_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_VISION_WALK_DEBUG === "true";

const BUTTON_BASE =
  "h-14 w-full rounded-2xl px-6 text-lg font-bold tracking-wide transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40";

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sos = useSos();
  const { startConfirmation: startSosConfirmation } = sos;
  const handleVoiceSosCommand = useCallback(() => {
    // A voice phrase only opens the confirmation dialog; activation
    // always requires the physical hold-for-3-seconds confirmation.
    const started = startSosConfirmation();
    if (started) {
      speakInstruction(
        "I can help you activate SOS. Hold the SOS button for 3 seconds to confirm.",
      );
    }
  }, [startSosConfirmation]);
  const {
    state,
    errorMessage,
    errorDetails,
    cameraStream,
    cameraActive,
    microphoneActive,
    cameraPermission,
    microphonePermission,
    geminiConnectionState,
    geminiTokenStatus,
    transcript,
    visualStats,
    startSession,
    endSession,
    suspendForSos,
    resumeFromSos,
  } = useAssistantState({ onVoiceSosCommand: handleVoiceSosCommand });

  // When SOS takes over (confirmation or activated), pause Gemini output
  // and input pipelines; when it is resolved, restore the active session.
  const previousSosPhaseRef = useRef<SosPhase>("idle");
  useEffect(() => {
    const previous = previousSosPhaseRef.current;
    previousSosPhaseRef.current = sos.phase;
    if (sos.phase === "confirming" || sos.phase === "activated") {
      if (previous === "idle") suspendForSos();
    } else if (sos.phase === "idle" && previous !== "idle") {
      resumeFromSos();
    }
  }, [sos.phase, suspendForSos, resumeFromSos]);

  const overlayOpen = sos.phase !== "idle" || settingsOpen;
  const connecting = state === "connecting";
  const idle = state === "idle";
  const geminiStatus =
    geminiConnectionState === "CONNECTED"
      ? { dot: "bg-emerald-400", label: "CONNECTED" }
      : geminiConnectionState === "CONNECTING"
        ? { dot: "bg-amber-400", label: "CONNECTING" }
        : { dot: "bg-foreground/25", label: "DISCONNECTED" };

  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-3 focus:font-semibold focus:text-accent-contrast"
      >
        Skip to main content
      </a>

      <header className="flex w-full items-center justify-between px-5 py-4 sm:px-8 [@media(max-height:480px)]:py-2">
        <h1 className="text-lg font-bold tracking-[0.3em] text-foreground">
          VISION&nbsp;WALK
        </h1>
        <StatusBadge state={state} />
      </header>

      <section
        id="main-content"
        inert={overlayOpen}
        aria-label="Vision Walk assistant"
        className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-5 pb-40 sm:gap-5 sm:pb-10 [@media(max-height:600px)]:justify-start [@media(max-height:480px)]:gap-3"
      >
        <CameraPreview stream={cameraStream} />

        <div aria-live="polite" aria-atomic="true" className="text-center">
          <p className="text-2xl font-semibold text-foreground">
            {PRIMARY_STATUS[state]}
          </p>
          <p className="mt-2 text-base text-muted">
            {state === "error" ? errorMessage : PRIMARY_STATUS_HINT[state]}
          </p>
        </div>

        <section
          aria-label="Connection status"
          className="w-full [@media(max-height:460px)]:hidden"
        >
          <dl className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${
                  microphoneActive ? "bg-emerald-400" : "bg-foreground/25"
                }`}
              />
              <dt className="sr-only">Microphone</dt>
              <dd className="font-medium text-foreground">
                Mic {microphoneActive ? "ACTIVE" : "INACTIVE"}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${
                  cameraActive ? "bg-emerald-400" : "bg-foreground/25"
                }`}
              />
              <dt className="sr-only">Camera</dt>
              <dd className="font-medium text-foreground">
                Camera {cameraActive ? "ACTIVE" : "INACTIVE"}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${geminiStatus.dot}`}
              />
              <dt className="sr-only">Gemini connection</dt>
              <dd className="font-medium text-foreground">
                Gemini {geminiStatus.label}
              </dd>
            </div>
          </dl>
        </section>

        {DEBUG_ENABLED && transcript.length > 0 && (
          <section
            aria-label="Conversation transcript"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3"
          >
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Transcript
            </h2>
            <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto text-sm">
              {transcript.map((entry) => (
                <li key={entry.id} className="break-words">
                  <span className="font-semibold text-foreground">
                    {entry.role === "user" ? "You" : "Vision Walk"}
                  </span>
                  <span className="text-muted">: {entry.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {state === "error" && errorMessage && (
          <div
            role="alert"
            className="w-full rounded-2xl border border-red-500/50 bg-red-950/40 px-4 py-3 text-sm text-red-200"
          >
            {errorMessage}
          </div>
        )}

        <div className="grid w-full gap-3">
          {state === "error" ? (
            <button
              type="button"
              onClick={startSession}
              className={`${BUTTON_BASE} bg-accent text-accent-contrast hover:bg-accent-hover`}
            >
              TRY AGAIN
            </button>
          ) : (
            <button
              type="button"
              onClick={startSession}
              disabled={!idle}
              className={`${BUTTON_BASE} bg-accent text-accent-contrast hover:bg-accent-hover`}
            >
              {connecting ? "STARTING…" : "START ASSISTANT"}
            </button>
          )}
          <button
            type="button"
            onClick={endSession}
            disabled={idle}
            className={`${BUTTON_BASE} border border-border bg-surface text-foreground hover:border-accent/60 hover:bg-surface-raised`}
          >
            END SESSION
          </button>
        </div>

        {DEBUG_ENABLED && (
          <DeviceDebugPanel
            cameraActive={cameraActive}
            microphoneActive={microphoneActive}
            cameraPermission={cameraPermission}
            microphonePermission={microphonePermission}
            geminiConnectionState={geminiConnectionState}
            geminiTokenStatus={geminiTokenStatus}
            visualStats={visualStats}
            errorDetails={errorDetails}
          />
        )}
      </section>

      <footer className="px-5 pb-32 text-center sm:pb-6 [@media(max-height:480px)]:hidden">
        <p className="text-xs text-muted">
          Audio is processed in real time through the Gemini Live session and
          is not stored.
        </p>
      </footer>

      <SosControl
        phase={sos.phase}
        progress={sos.progress}
        announcement={sos.announcement}
        primaryContact={sos.primaryContact}
        location={sos.location}
        locationLoading={sos.locationLoading}
        settingsOpen={settingsOpen}
        onStartConfirmation={startSosConfirmation}
        onCancelConfirmation={sos.cancelConfirmation}
        onCancelSos={sos.cancelSos}
        onArmHold={sos.armHold}
        onDisarmHold={sos.disarmHold}
        onShareLocation={() => void sos.shareLocation()}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SosSettings
        open={settingsOpen}
        contacts={sos.contacts}
        onSave={sos.saveContacts}
        onDelete={sos.deleteContact}
        onClearAll={sos.clearAllContacts}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  );
}
