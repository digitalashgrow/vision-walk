import type { GeminiConnectionState } from "@/lib/gemini/types";
import type { CameraFrameStats } from "@/lib/camera/CameraFrameStreamer";
import type { MediaPermissionState } from "@/types";
import type { SessionErrorDetails } from "@/hooks/useAssistantState";

interface DeviceDebugPanelProps {
  cameraActive: boolean;
  microphoneActive: boolean;
  cameraPermission: MediaPermissionState;
  microphonePermission: MediaPermissionState;
  geminiConnectionState: GeminiConnectionState;
  geminiTokenStatus: "idle" | "ok" | "error";
  visualStats: CameraFrameStats;
  errorDetails: SessionErrorDetails;
}

const GEMINI_COLOR: Record<GeminiConnectionState, string> = {
  DISCONNECTED: "text-foreground",
  CONNECTING: "text-amber-400",
  CONNECTED: "text-emerald-400",
  ERROR: "text-red-400",
};

/**
 * Developer-only status panel. Rendered only when debug output is
 * enabled (see app/page.tsx). Shows stream, permission, Gemini, and
 * token states plus raw error details for diagnosis. Never shows audio,
 * camera frames, API keys, or token contents.
 */
export function DeviceDebugPanel({
  cameraActive,
  microphoneActive,
  cameraPermission,
  microphonePermission,
  geminiConnectionState,
  geminiTokenStatus,
  visualStats,
  errorDetails,
}: DeviceDebugPanelProps) {
  const lastFrameLabel = visualStats.lastFrameTimestamp
    ? new Date(visualStats.lastFrameTimestamp).toLocaleTimeString()
    : "—";
  const frameRateLabel = visualStats.active ? "~1 FPS" : "—";
  return (
    <details className="w-full rounded-2xl border border-border bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold text-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent">
        Developer status
      </summary>
      <dl className="mt-3 space-y-1.5 font-mono text-xs text-muted">
        <div className="flex justify-between gap-3">
          <dt>Camera stream</dt>
          <dd className={cameraActive ? "text-emerald-400" : "text-foreground"}>
            {cameraActive ? "ACTIVE" : "INACTIVE"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Microphone stream</dt>
          <dd className={microphoneActive ? "text-emerald-400" : "text-foreground"}>
            {microphoneActive ? "ACTIVE" : "INACTIVE"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Gemini</dt>
          <dd className={GEMINI_COLOR[geminiConnectionState]}>
            {geminiConnectionState}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Token</dt>
          <dd className={geminiTokenStatus === "ok" ? "text-emerald-400" : "text-foreground"}>
            {geminiTokenStatus === "ok"
              ? "OK"
              : geminiTokenStatus === "error"
                ? "ERROR"
                : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Camera permission</dt>
          <dd>{cameraPermission.toUpperCase()}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Microphone permission</dt>
          <dd>{microphonePermission.toUpperCase()}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Visual input</dt>
          <dd className={visualStats.active ? "text-emerald-400" : "text-foreground"}>
            {visualStats.active ? "ACTIVE" : "STOPPED"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Frame rate</dt>
          <dd>{frameRateLabel}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Last visual frame</dt>
          <dd>{lastFrameLabel}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Frames sent</dt>
          <dd>{visualStats.framesSent}</dd>
        </div>
        {errorDetails && (
          <>
            <div className="flex justify-between gap-3">
              <dt>Last error</dt>
              <dd className="text-right">{errorDetails.name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Error detail</dt>
              <dd className="max-w-[60%] break-all text-right">
                {"rawMessage" in errorDetails
                  ? (errorDetails.rawMessage ?? errorDetails.message)
                  : errorDetails.message}
              </dd>
            </div>
          </>
        )}
      </dl>
    </details>
  );
}