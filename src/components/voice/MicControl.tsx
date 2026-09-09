import { Mic } from "lucide-react"
import type { MicrophoneState } from "@/types/voice"
import { TONE_COLOR, type StatusTone } from "@/utils/statusColors"
import { cn } from "@/utils/cn"

interface MicControlProps {
  state: MicrophoneState
  tone?: StatusTone
  onClick: () => void
  label?: string
}

const INSET = "absolute rounded-full border-2"

export function MicControl({ state, tone = "default", onClick, label }: MicControlProps) {
  const listening = state === "listening"
  const requesting = state === "requesting"
  const interactive =
    state === "idle" || state === "ready" || state === "listening"

  const caption =
    label ??
    (requesting
      ? "Requesting microphone access…"
      : listening
        ? "Tap to stop"
        : state === "idle" || state === "ready"
          ? "Tap to check your voice"
          : "\u00a0")

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={onClick}
        disabled={!interactive}
        aria-label={
          listening
            ? "Stop voice check"
            : requesting
              ? "Requesting microphone access"
              : "Start voice check"
        }
        style={{ ["--tone-color" as string]: TONE_COLOR[tone] }}
        className={cn(
          "relative grid h-20 w-20 place-items-center rounded-full text-primary-fg transition-transform duration-300",
          "active:scale-95",
          "disabled:cursor-not-allowed",
        )}
      >
        {/* soft tone halo */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute -inset-1 rounded-full blur-md transition-opacity duration-500",
            listening || requesting ? "opacity-100" : "opacity-40",
          )}
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--tone-color) 30%, transparent)",
          }}
        />
        {/* core */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-gradient-to-b from-primary to-primary/70 shadow-[0_18px_44px_-14px_color-mix(in_srgb,var(--tone-color)_55%,transparent)]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/25 dark:ring-white/10"
        />

        {requesting && (
          <span
            className={cn(INSET, "inset-0 animate-pulse border-primary/50")}
            aria-hidden="true"
          />
        )}
        {listening && (
          <>
            <span
              className={cn(
                INSET,
                "inset-0 animate-ring motion-reduce:animate-none",
              )}
              aria-hidden="true"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--tone-color) 55%, transparent)",
              }}
            />
            <span
              className="absolute inset-1.5 rounded-full border-2"
              aria-hidden="true"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--tone-color) 45%, transparent)",
              }}
            />
          </>
        )}

        <Mic className="relative h-7 w-7" />
      </button>

      <span className="h-4 text-[13px] text-muted">{caption}</span>
    </div>
  )
}