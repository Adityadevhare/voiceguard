import { useMemo } from "react"
import { TONE_COLOR, type StatusTone } from "@/utils/statusColors"

export type WaveformTone = StatusTone

export { TONE_COLOR }

const HEIGHT = 120
const BAR_COUNT = 64
const BAR_W = 6
const GAP = 4

interface WaveformProps {
  samples: number[]
  tone: WaveformTone
  ariaLabel: string
  glow?: boolean
}

export function Waveform({ samples, tone, ariaLabel, glow = true }: WaveformProps) {
  const color = TONE_COLOR[tone]

  const bars = useMemo(() => {
    const list = new Array<number>(BAR_COUNT)
    for (let i = 0; i < BAR_COUNT; i++) {
      const value = samples[i] ?? 0
      // Raised-cosine smoothing makes bars feel organic and keeps
      // silence nearly flat.
      const h = Math.min(1, value) * HEIGHT * 0.8
      list[i] = Math.max(3, h)
    }
    return list
  }, [samples])

  const stride = BAR_W + GAP
  const totalWidth = BAR_COUNT * stride - GAP

  return (
    <div
      className="w-full transition-[filter] duration-700 ease-out"
      style={{
        ["--tone-color" as string]: color,
        filter: glow
          ? "drop-shadow(0 10px 26px color-mix(in srgb, var(--tone-color) 30%, transparent))"
          : undefined,
      }}
    >
      <svg
        viewBox={`0 0 ${totalWidth} ${HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className="block w-full"
      >
        <g style={{ transition: "fill 700ms ease" }}>
          {bars.map((h, i) => {
            const x = i * stride
            const y = (HEIGHT - h) / 2
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={BAR_W}
                height={h}
                rx={BAR_W / 2}
                style={{ fill: "var(--tone-color)" }}
              />
            )
          })}
        </g>
      </svg>
    </div>
  )
}