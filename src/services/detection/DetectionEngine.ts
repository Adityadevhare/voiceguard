import type { VoiceStatus } from "@/types/voice"

/**
 * A single processed slice of audio fed to the engine while listening.
 * `level` is a smoothed amplitude in the 0..1 range derived from real
 * microphone input. `active` indicates whether speech is currently present.
 */
export interface AnalysisFrame {
  level: number
  active: boolean
}

/**
 * The contract for any detection engine.
 *
 * The real anti-spoofing engine will implement this same interface and can
 * replace the demo without changing the UI or the audio pipeline.
 */
export interface DetectionEngine {
  readonly name: string

  /** Feed one processed audio frame while listening. */
  onFrame(frame: AnalysisFrame): void

  /** Register the callback invoked whenever the current status changes. */
  setStatusListener(listener: DetectionListener): void

  /** Clear internal state between voice checks. */
  reset(): void
}

export type DetectionListener = (status: VoiceStatus) => void
