import { useEffect, useRef } from "react"

const VB = 400
const CENTER_Y = 200
const MARGIN_X = 62
const NUM_POINTS = 42
const MAX_AMP = 84

interface Strand {
  scale: number
  offset: number
  opacity: number
  width: number
  blur: "none" | "soft" | "wide"
}

const STRANDS: Strand[] = [
  { scale: 1, offset: 0, opacity: 0.95, width: 2.6, blur: "none" },
  { scale: 0.66, offset: -20, opacity: 0.42, width: 1.5, blur: "soft" },
  { scale: 0.66, offset: 20, opacity: 0.42, width: 1.5, blur: "soft" },
  { scale: 0.4, offset: 0, opacity: 0.28, width: 1.1, blur: "wide" },
]

function restingSample(i: number): number {
  const t = i / (NUM_POINTS - 1)
  return 0.018 + 0.016 * Math.sin(t * Math.PI * 2.2)
}

function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length === 0) return ""
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    const mx = (x0 + x1) / 2
    d += ` C ${mx.toFixed(1)} ${y0.toFixed(1)}, ${mx.toFixed(1)} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`
  }
  return d
}

interface VoiceOrbWaveProps {
  samples: number[]
  enabled: boolean
  reduced: boolean
}

export function VoiceOrbWave({ samples, enabled, reduced }: VoiceOrbWaveProps) {
  const samplesRef = useRef(samples)
  const enabledRef = useRef(enabled)
  const reducedRef = useRef(reduced)
  const groupRef = useRef<SVGGElement | null>(null)

  useEffect(() => {
    samplesRef.current = samples
    enabledRef.current = enabled
    reducedRef.current = reduced
  }, [samples, enabled, reduced])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    const paths = Array.from(group.children) as SVGPathElement[]

    const smooth = new Float32Array(NUM_POINTS)
    for (let i = 0; i < NUM_POINTS; i++) smooth[i] = restingSample(i)

    let raf = 0

    const frame = () => {
      const src = samplesRef.current
      const enabledNow = enabledRef.current
      const reducedNow = reducedRef.current
      const k = reducedNow ? 0.07 : 0.16
      const amp = MAX_AMP * (reducedNow ? 0.6 : 1)

      for (let i = 0; i < NUM_POINTS; i++) {
        const v = i < src.length ? src[i] : 0
        let target = enabledNow ? (v ?? 0) : restingSample(i)
        if (reducedNow) target *= 0.7
        smooth[i] += (target - smooth[i]) * k
      }

      for (let s = 0; s < STRANDS.length; s++) {
        const strand = STRANDS[s]
        const pts: Array<[number, number]> = new Array(NUM_POINTS)
        for (let i = 0; i < NUM_POINTS; i++) {
          const t = i / (NUM_POINTS - 1)
          const x = MARGIN_X + t * (VB - MARGIN_X * 2)
          const env = Math.sin(Math.PI * t)
          const sign = i % 2 === 0 ? 1 : -1
          const y =
            CENTER_Y +
            strand.offset +
            sign * amp * strand.scale * smooth[i] * env
          pts[i] = [x, y]
        }
        paths[s]?.setAttribute("d", smoothPath(pts))
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      className="block h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <filter id="orb-blur-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id="orb-blur-wide" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <g ref={groupRef}>
        {STRANDS.map((s, i) => (
          <path
            key={i}
            fill="none"
            stroke="var(--tone-color)"
            strokeWidth={s.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={s.opacity}
            filter={
              s.blur === "soft"
                ? "url(#orb-blur-soft)"
                : s.blur === "wide"
                  ? "url(#orb-blur-wide)"
                  : undefined
            }
            style={{ transition: "stroke 900ms ease" }}
          />
        ))}
      </g>
    </svg>
  )
}