const DAY = 86400000

export function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export type DayGroup = "today" | "yesterday" | "earlier"

export function dayGroupOf(timestamp: number, now = Date.now()): DayGroup {
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const startOfYesterday = startOfToday.getTime() - DAY

  if (timestamp >= startOfToday.getTime()) return "today"
  if (timestamp >= startOfYesterday) return "yesterday"
  return "earlier"
}

export function dayLabel(group: DayGroup): string {
  switch (group) {
    case "today":
      return "Today"
    case "yesterday":
      return "Yesterday"
    case "earlier":
      return "Earlier"
  }
}