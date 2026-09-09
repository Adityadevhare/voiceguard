import { useCallback, useEffect, useRef, useState } from "react"
import { Mic } from "lucide-react"
import { useMicrophone } from "@/hooks/useMicrophone"
import { useStore } from "@/lib/store"
import { voiceStatusContent } from "@/utils/voiceStatus"
import { TONE_COLOR } from "@/utils/statusColors"
import type { VoiceResult } from "@/types/voice"
import { MicControl } from "@/components/voice/MicControl"
import { VoiceResult as VoiceResultView } from "@/components/status/VoiceResult"
import { Waveform } from "@/components/waveform/Waveform"
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

  const waveformTone = result ? result.status : "default"
  const ariaWaveform = result
    ? result.message
    : mic.state === "listening"
      ? "Listening. Speak naturally."
      : "Waveform is idle."
  const micLabel =
    result && mic.state === "ready" ? "Voice check stopped" : undefined
  const haloColor = TONE_COLOR[waveformTone]

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

      <div className="glass relative mt-11 w-full overflow-hidden rounded-3xl px-6 pb-9 pt-12 sm:px-8">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl transition-colors duration-700"
          style={{ backgroundColor: haloColor, opacity: "0.16" }}
        />

        <Waveform
          samples={mic.frame.samples}
          tone={waveformTone}
          ariaLabel={ariaWaveform}
        />

        <div className="mt-11">
          {mic.state === "idle" && (
            <button
              type="button"
              onClick={() => void mic.begin()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-[15px] font-medium text-primary-fg shadow-[0_18px_40px_-14px_var(--primary)] transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              <Mic className="h-5 w-5" aria-hidden="true" />
              Allow microphone
            </button>
          )}

          {(mic.state === "ready" ||
            mic.state === "requesting" ||
            mic.state === "listening") && (
            <MicControl
              state={mic.state}
              tone={waveformTone}
              onClick={handleMicClick}
              label={micLabel}
            />
          )}
        </div>
      </div>

      <div className="mt-2 min-h-16" aria-live="polite">
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