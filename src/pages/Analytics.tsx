import { useMemo } from "react"
import { useStore } from "@/lib/store"
import type { Route } from "@/lib/router"
import type { VoiceStatus } from "@/types/voice"
import { voiceStatusContent, VOICE_STATUSES } from "@/utils/voiceStatus"
import { STATUS_COLORS } from "@/utils/statusColors"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"
import { StatusDot } from "@/components/ui/StatusDot"

interface AnalyticsPageProps {
  onNavigate: (route: Route) => void
}

export function AnalyticsPage({ onNavigate }: AnalyticsPageProps) {
  const { records } = useStore()

  const counts = useMemo(() => {
    const map = new Map<VoiceStatus, number>()
    for (const status of VOICE_STATUSES) map.set(status, 0)
    for (const record of records) {
      map.set(record.status, (map.get(record.status) ?? 0) + 1)
    }
    return map
  }, [records])

  const total = records.length

  if (total === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader
          title="Analytics"
          subtitle="A simple look at your voice checks."
        />
        <div className="flex flex-col items-center gap-3 border-t border-border pt-10 text-center">
          <p className="text-sm text-muted">No checks to analyze yet.</p>
          <Button onClick={() => onNavigate("/voice-check")}>
            Start a voice check
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Analytics"
        subtitle="A simple look at your voice checks over time."
      />

      <p className="text-[13px] font-medium uppercase tracking-wide text-subtle">
        Total checks
      </p>
      <p className="mt-1 text-4xl font-semibold tracking-tight text-ink">
        {total}
      </p>

      <div
        className="mt-6 flex h-1.5 w-full gap-px overflow-hidden rounded-full"
        aria-hidden="true"
      >
        {VOICE_STATUSES.map((status) => {
          const count = counts.get(status) ?? 0
          if (count === 0) return null
          return (
            <div
              key={status}
              className="h-full"
              style={{
                flexGrow: count,
                backgroundColor: STATUS_COLORS[status],
              }}
            />
          )
        })}
      </div>

      <ul className="mt-6 border-t border-border">
        {VOICE_STATUSES.map((status) => {
          const count = counts.get(status) ?? 0
          if (count === 0) return null
          const content = voiceStatusContent(status)
          return (
            <li
              key={status}
              className="flex items-center justify-between gap-4 border-b border-border py-3.5 text-sm"
            >
<span className="flex items-center gap-2.5 text-ink">
                <StatusDot status={status} />
                {content.message}
              </span>
              <span className="font-medium tabular-nums text-ink">{count}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}