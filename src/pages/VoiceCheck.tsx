import { useCallback, useEffect, useRef, useState } from "react"
import { useMicrophone } from "@/hooks/useMicrophone"
import { useStore } from "@/lib/store"
import { voiceStatusContent } from "@/utils/voiceStatus"
import type { VoiceResult } from "@/types/voice"
import { VoiceOrb } from "@/components/voice/VoiceOrb"
import { VoiceResult as VoiceResultView } from "@/components/status/VoiceResult"
import { Button } from "@/components/ui/Button"

export function VoiceCheckPage() {
  const { addRecord, addActivity } = useStore()
  const [result, setResult] = useState<VoiceResult | null>(null)
  const voiceDetectedRef = useRef(false)

  const handleStatus = useCallback((status: VoiceResult["status"]) => {
    const content = voiceStatusContent(status)
    setResult({ status, message: content.message, detail: content.detail })
  }, [])

  const mic = useMicrophone(handleStatus)

  useEffect(() => {
    if (mic.state === "listening" && mic.frame.active && !voiceDetectedRef.current) {
      voiceDetectedRef.current = true
      addActivity("Voice detected")
    }
    if (mic.state !== "listening") {
      voiceDetectedRef.current = false
    }
  }, [mic.state, mic.frame.active, addActivity])

  const handleMicClick = useCallback(() => {
    if (mic.state === "idle") {
      void mic.begin()
      return
    }
    if (mic.state === "ready") {
      setResult(null)
      addActivity("Voice check started")
      void mic.toggle()
      return
    }
    if (mic.state === "listening") {
      if (result) {
        addRecord(result.status)
        addActivity("Voice check completed")
      }
      void mic.toggle()
    }
  }, [mic, result, addRecord, addActivity])

  const orbStatus = result ? result.status : null

  const ariaOrb =
    mic.state === "listening"
      ? result
        ? result.message
        : "Listening. Speak naturally into the microphone. Tap to stop."
      : mic.state === "requesting"
        ? "Requesting microphone access"
        : "Start voice check. Tap the orb to check your voice."

  const orbLabel =
    result && mic.state === "ready" ? "Voice check stopped" : undefined

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">
        Voice security
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
        Voice Check
      </h1>
      <p className="mt-2.5 max-w-md text-sm leading-relaxed text-muted">
        Check whether a voice sounds genuine or shows signs of being
        AI-generated.
      </p>

      <div className="mt-12">
        <VoiceOrb
          status={orbStatus}
          state={mic.state}
          samples={mic.frame.samples}
          onClick={handleMicClick}
          ariaLabel={ariaOrb}
        />
      </div>

      <div className="mt-12 min-h-16" aria-live="polite">
        {mic.state === "idle" && (
          <p className="text-sm text-muted">
            Tap the orb to check your voice
            <br />
            <span className="text-subtle">
              Speak clearly for a few seconds.
            </span>
          </p>
        )}

        {mic.state === "ready" && (
          <p className="text-sm text-muted">{orbLabel ?? "Tap the orb to start a voice check"}</p>
        )}

        {mic.state === "listening" && !result && (
          <p className="text-sm text-muted">
            Listening…
            <br />
            <span className="text-subtle">Speak naturally.</span>
          </p>
        )}

        {mic.state === "requesting" && (
          <p className="text-sm text-muted">Requesting microphone access…</p>
        )}

        {mic.state === "denied" && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-ink">
              Microphone access is blocked
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              Voice Check needs microphone access to hear you. Allow access in
              your browser settings and try again.
            </p>
            <Button variant="secondary" onClick={() => void mic.retry()}>
              Try Again
            </Button>
          </div>
        )}

        {mic.state === "unavailable" && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-ink">
              We couldn&apos;t access your microphone
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              Check that your microphone is connected and working.
            </p>
            <Button variant="secondary" onClick={() => void mic.retry()}>
              Try Again
            </Button>
          </div>
        )}

        {mic.state === "unsupported" && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-ink">
              Voice Check isn&apos;t supported here
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              Please use a modern browser with microphone support.
            </p>
          </div>
        )}

        {result && <VoiceResultView result={result} />}
      </div>
    </div>
  )
}