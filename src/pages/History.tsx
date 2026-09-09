import { useMemo } from "react"
import { useStore } from "@/lib/store"
import type { Route } from "@/lib/router"
import { voiceStatusContent } from "@/utils/voiceStatus"
import { dayGroupOf, dayLabel, formatTime, type DayGroup } from "@/utils/format"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"
import { StatusDot } from "@/components/ui/StatusDot"

interface HistoryPageProps {
  onNavigate: (route: Route) => void
}

export function HistoryPage({ onNavigate }: HistoryPageProps) {
  const { records, clearHistory } = useStore()

  const groups = useMemo(() => {
    const order: DayGroup[] = ["today", "yesterday", "earlier"]
    const map = new Map<DayGroup, typeof records>()
    for (const group of order) map.set(group, [])
    for (const record of records) {
      const group = dayGroupOf(record.timestamp)
      map.get(group)?.push(record)
    }
    return order
      .map((group) => ({ group, items: map.get(group) ?? [] }))
      .filter((g) => g.items.length > 0)
  }, [records])

  if (records.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader
          title="History"
          subtitle="Your previous voice checks."
        />
        <div className="flex flex-col items-center gap-3 border-t border-border pt-10 text-center">
          <p className="text-sm text-muted">No voice checks yet.</p>
          <Button onClick={() => onNavigate("/voice-check")}>
            Start a voice check
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center justify-between">
        <PageHeader
          title="History"
          subtitle="Your previous voice checks."
        />
        <button
          type="button"
          onClick={clearHistory}
          className="mb-10 -translate-y-1 text-xs text-subtle underline-offset-2 transition-colors hover:text-ink hover:underline"
        >
          Clear history
        </button>
      </div>

      <div className="border-t border-border">
        {groups.map(({ group, items }) => (
          <section key={group} className="border-b border-border py-5">
            <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-subtle">
              {dayLabel(group)}
            </h2>
            <ul>
              {items.map((record) => {
                const content = voiceStatusContent(record.status)
                return (
                  <li
                    key={record.id}
                    className="flex items-center justify-between gap-4 border-t border-border/60 py-3 text-sm first:border-t-0"
                  >
                    <span className="flex items-center gap-2.5 text-ink">
                      <StatusDot status={record.status} />
                      {content.message}
                    </span>
                    <time className="shrink-0 text-muted">
                      {formatTime(record.timestamp)}
                    </time>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}