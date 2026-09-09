import { useMemo } from "react"
import { useStore } from "@/lib/store"
import { formatTime, dayLabel, dayGroupOf, type DayGroup } from "@/utils/format"
import { PageHeader } from "@/components/ui/PageHeader"

export function ActivityPage() {
  const { activities } = useStore()

  const groups = useMemo(() => {
    const order: DayGroup[] = ["today", "yesterday", "earlier"]
    const map = new Map<DayGroup, typeof activities>()
    for (const group of order) map.set(group, [])
    for (const entry of activities) {
      const group = dayGroupOf(entry.timestamp)
      map.get(group)?.push(entry)
    }
    return order
      .map((group) => ({ group, items: map.get(group) ?? [] }))
      .filter((g) => g.items.length > 0)
  }, [activities])

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Activity"
        subtitle="Recent events around your voice checks."
      />

      {activities.length === 0 && (
        <p className="border-t border-border pt-6 text-sm text-muted">
          No activity yet. Run a voice check to see events here.
        </p>
      )}

      {activities.length > 0 && (
        <div className="border-t border-border">
          {groups.map(({ group, items }) => (
            <section key={group} className="border-b border-border py-5">
              <h2 className="mb-4 text-[13px] font-medium uppercase tracking-wide text-subtle">
                {dayLabel(group)}
              </h2>
              <ul className="relative">
                <span
                  className="absolute bottom-3 left-[4px] top-3 w-px bg-border"
                  aria-hidden="true"
                />
                {items.map((entry) => (
                  <li
                    key={entry.id}
                    className="relative flex items-center justify-between gap-4 py-2.5 text-sm"
                  >
                    <span className="flex items-center gap-3 text-ink">
                      <span
                        className="h-[9px] w-[9px] shrink-0 rounded-full border-2 border-primary/70 bg-bg"
                        aria-hidden="true"
                      />
                      {entry.text}
                    </span>
                    <time className="shrink-0 text-muted">
                      {formatTime(entry.timestamp)}
                    </time>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}