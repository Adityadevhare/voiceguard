import type {
  AnalysisFrame,
  DetectionEngine,
  DetectionListener,
} from "@/services/detection/DetectionEngine"
import type { VoiceStatus } from "@/types/voice"

/**
 * Temporary stand-in for the real anti-spoofing engine.
 *
 * It reads real microphone features (how much the user speaks, and how
 * uniform the amplitude is) and derives a simple, readable status. It has no
 * idea whether a voice is actually cloned — the real model will replace it
 * later without touching the UI or the audio pipeline.
 *
 * A stability window prevents the status from flickering while the user
 * speaks unevenly: a candidate classification is only committed once it has
 * persisted consistently.
 */
export class DemoDetectionEngine implements DetectionEngine {
  readonly name = "demo"

  private listener: DetectionListener | null = null
  private frameCount = 0
  private activeCount = 0
  private sumLevel = 0
  private sumSqLevel = 0
  private lastStatus: VoiceStatus = "human"
  private candidate: VoiceStatus | null = null
  private candidateCount = 0
  private emittedAtFrame = -Infinity

  // Commit after this many consecutive frames at the same classification.
  private static readonly STABLE_FRAMES = 6
  // Minimum frames between committed status changes.
  private static readonly COOLDOWN = 24

  setStatusListener(listener: DetectionListener): void {
    this.listener = listener
  }

  reset(): void {
    this.frameCount = 0
    this.activeCount = 0
    this.sumLevel = 0
    this.sumSqLevel = 0
    this.lastStatus = "human"
    this.candidate = null
    this.candidateCount = 0
    this.emittedAtFrame = -Infinity
  }

  onFrame(frame: AnalysisFrame): void {
    this.frameCount += 1

    if (frame.active) {
      this.activeCount += 1
      this.sumLevel += frame.level
      this.sumSqLevel += frame.level * frame.level
    }

    // Need a little speech before we can say anything meaningful.
    if (this.activeCount < 24) {
      this.candidate = null
      this.candidateCount = 0
      return
    }

    const mean = this.sumLevel / this.activeCount
    const variance = Math.max(
      0,
      this.sumSqLevel / this.activeCount - mean * mean,
    )
    const cv = mean > 0.0001 ? Math.sqrt(variance) / mean : 0

    const status = this.classify(this.activeRatio(), cv)
    this.commitCandidate(status)
  }

  private activeRatio(): number {
    if (this.frameCount === 0) return 0
    return this.activeCount / this.frameCount
  }

  private classify(activeRatio: number, cv: number): VoiceStatus {
    if (activeRatio < 0.18) return "uncertain"
    if (cv < 0.2) return "ai"
    if (cv < 0.3) return "suspicious"
    if (cv < 0.38) return "uncertain"
    return "human"
  }

  private commitCandidate(status: VoiceStatus): void {
    // Reset candidate if classification changed.
    if (status !== this.candidate) {
      this.candidate = status
      this.candidateCount = 1
    } else {
      this.candidateCount += 1
    }

    if (this.candidateCount < DemoDetectionEngine.STABLE_FRAMES) return

    // Respect a cooldown between observable changes.
    if (this.frameCount - this.emittedAtFrame < DemoDetectionEngine.COOLDOWN) {
      return
    }

    if (status === this.lastStatus) return
    this.lastStatus = status
    this.emittedAtFrame = this.frameCount
    this.listener?.(status)
  }
}
