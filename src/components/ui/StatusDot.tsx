import type { VoiceStatus } from "@/types/voice"
import { STATUS_COLORS } from "@/utils/statusColors"
import { cn } from "@/utils/cn"

interface StatusDotProps {
  status: VoiceStatus
  className?: string
}

export function StatusDot({ status, className }: StatusDotProps) {
  const color = STATUS_COLORS[status]
  return (
    <span
      className={cn("h-2 w-2 shrink-0 rounded-full", className)}
      style={{
        backgroundColor: color,
        boxShadow: `0 0 10px color-mix(in srgb, ${color} 45%, transparent)`,
      }}
      aria-hidden="true"
    />
  )
}