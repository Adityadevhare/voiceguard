import { useState } from "react"
import { Mic } from "lucide-react"
import { VoiceOrbWave } from "./VoiceOrbWave"
import type { MicrophoneState, VoiceStatus } from "@/types/voice"
import { STATUS_COLORS } from "@/utils/statusColors"
import { cn } from "@/utils/cn"

const EMPTY_SAMPLES: number[] = []

function toneColorFor(status: VoiceStatus | null): string {
  return status ? STATUS_COLORS[status] : "var(--orb-neutral)"
}

export interface VoiceOrbProps {
  status: VoiceStatus | null
  state: MicrophoneState
  samples?: number[]
  onClick: () => void
  ariaLabel: string
}

export function VoiceOrb({
  status,
  state,
  samples,
  onClick,
  ariaLabel,
}: VoiceOrbProps) {
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false),
  )

  const listening = state === "listening"
  const requesting = state === "requesting"
  const interactive =
    state === "idle" || state === "ready" || state === "listening"

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      aria-label={ariaLabel}
      style={{ ["--tone-color" as string]: toneColorFor(status) }}
      className={cn(
        "voice-orb block h-[min(64vw,20rem)] w-[min(64vw,20rem)] sm:h-[21.5rem] sm:w-[21.5rem] lg:h-[23rem] lg:w-[23rem]",
        listening && "voice-orb--listening",
        !interactive && "cursor-not-allowed opacity-90",
      )}
    >
      <span aria-hidden="true" className="voice-orb__halo" />
      <span aria-hidden="true" className="voice-orb__glass" />
      <span aria-hidden="true" className="voice-orb__rim" />
      <span aria-hidden="true" className="voice-orb__specular" />
      <span aria-hidden="true" className="voice-orb__wave">
        <VoiceOrbWave samples={samples ?? EMPTY_SAMPLES} enabled={listening} reduced={reduced} />
      </span>
      <span aria-hidden="true" className="voice-orb__front" />
      <span
        aria-hidden="true"
        className={cn("voice-orb__mic", requesting && "voice-orb__mic--busy")}
      >
        <Mic className="h-5 w-5" strokeWidth={1.75} />
      </span>
    </button>
  )
}