import { useCallback, useEffect, useRef, useState } from "react"

export interface AudioFrame {
  samples: number[]
  level: number
  active: boolean
}

export class UnsupportedAudioError extends Error {
  constructor() {
    super("Audio capture is not supported")
    this.name = "UnsupportedAudioError"
  }
}

const SAMPLE_COUNT = 64
const TARGET_FPS = 30
const SILENCE_THRESHOLD = 0.015
const FRAME_MS = 1000 / TARGET_FPS

function emptyFrame(): AudioFrame {
  return { samples: Array(SAMPLE_COUNT).fill(0), level: 0, active: false }
}

export function useAudioAnalyzer(onFrame?: (frame: AudioFrame) => void) {
  const contextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const onFrameRef = useRef(onFrame)

  const [running, setRunning] = useState(false)
  const [frame, setFrame] = useState<AudioFrame>(emptyFrame)

  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  useEffect(() => {
    if (!running) return

    const id = window.setInterval(() => {
      const analyser = analyserRef.current
      if (!analyser) return

      const buffer = new Uint8Array(analyser.fftSize)
      analyser.getByteTimeDomainData(buffer)

      const step = Math.floor(buffer.length / SAMPLE_COUNT)
      let sum = 0
      const samples: number[] = new Array(SAMPLE_COUNT)
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        const raw = buffer[i * step] - 128
        const normalized = Math.max(-1, Math.min(1, raw / 128))
        samples[i] = Math.abs(normalized)
        sum += Math.abs(normalized)
      }
      const level = Math.min(1, sum / SAMPLE_COUNT)
      const active = level > SILENCE_THRESHOLD

      const next: AudioFrame = { samples, level, active }
      setFrame(next)
      onFrameRef.current?.(next)
    }, FRAME_MS)

    return () => window.clearInterval(id)
  }, [running])

  const start = useCallback(async (): Promise<boolean> => {
    if (running) return true

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new UnsupportedAudioError()
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream

    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!AudioCtx) {
      stream.getTracks().forEach((t) => t.stop())
      throw new UnsupportedAudioError()
    }

    const context = new AudioCtx()
    contextRef.current = context
    if (context.state === "suspended") {
      await context.resume()
    }

    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.8
    source.connect(analyser)

    sourceRef.current = source
    analyserRef.current = analyser
    setFrame(emptyFrame())
    setRunning(true)

    return true
  }, [running])

  const stop = useCallback(() => {
    setRunning(false)
    sourceRef.current?.disconnect()
    sourceRef.current = null
    analyserRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    contextRef.current?.close().catch(() => {})
    contextRef.current = null
    setFrame(emptyFrame())
  }, [])

  useEffect(() => {
    return () => {
      sourceRef.current?.disconnect()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      contextRef.current?.close().catch(() => {})
    }
  }, [])

  return { frame, running, start, stop }
}