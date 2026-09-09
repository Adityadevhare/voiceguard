import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAudioAnalyzer, type AudioFrame } from "@/hooks/useAudioAnalyzer"
import { DemoDetectionEngine } from "@/services/detection/DemoDetectionEngine"
import type { DetectionEngine } from "@/services/detection/DetectionEngine"
import type { MicrophoneState, VoiceStatus } from "@/types/voice"

function classifyError(err: unknown): MicrophoneState {
  if (
    err &&
    typeof err === "object" &&
    "name" in err &&
    (err as { name: string }).name === "UnsupportedAudioError"
  ) {
    return "unsupported"
  }
  const name =
    err && typeof err === "object" && "name" in err
      ? String((err as { name: string }).name)
      : ""

  if (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    name === "SecurityError"
  ) {
    return "denied"
  }
  return "unavailable"
}

export function useMicrophone(onStatus?: (status: VoiceStatus) => void) {
  const engineRef = useRef<DetectionEngine | null>(null)
  const [state, setState] = useState<MicrophoneState>("idle")

  const onFrame = useCallback((frame: AudioFrame) => {
    engineRef.current?.onFrame(frame)
  }, [])

  const { frame, start, stop } = useAudioAnalyzer(onFrame)
  const engine = useMemo(() => new DemoDetectionEngine(), [])

  useEffect(() => {
    engineRef.current = engine
    engine.setStatusListener((next) => {
      onStatus?.(next)
    })
    return () => {
      engine.setStatusListener(() => {})
      engineRef.current = null
    }
  }, [engine, onStatus])

  const resetStatus = useCallback(() => {
    engine.reset()
  }, [engine])

  const begin = useCallback(async (): Promise<void> => {
    if (state === "listening" || state === "requesting") return
    setState("requesting")
    resetStatus()
    try {
      await start()
      stop()
      setState("ready")
    } catch (err) {
      setState(classifyError(err))
    }
  }, [state, start, stop, resetStatus])

  const toggle = useCallback(async (): Promise<void> => {
    if (state === "ready") {
      resetStatus()
      try {
        await start()
        setState("listening")
      } catch (err) {
        setState(classifyError(err))
      }
      return
    }
    if (state === "listening") {
      stop()
      engine.reset()
      setState("ready")
    }
  }, [state, start, stop, engine, resetStatus])

  const stopListening = useCallback(() => {
    if (state !== "listening") return
    stop()
    engine.reset()
    setState("ready")
  }, [state, stop, engine])

  const retry = useCallback(() => {
    void begin()
  }, [begin])

  return {
    state,
    frame,
    begin,
    toggle,
    stop: stopListening,
    retry,
  }
}