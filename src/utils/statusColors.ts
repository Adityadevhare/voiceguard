import type { VoiceStatus } from "@/types/voice"

export type StatusTone = "default" | VoiceStatus

export const STATUS_COLORS: Record<VoiceStatus, string> = {
  human: "var(--status-human)",
  uncertain: "var(--status-uncertain)",
  suspicious: "var(--status-suspicious)",
  ai: "var(--status-ai)",
}

export const TONE_COLOR: Record<StatusTone, string> = {
  default: "var(--wave-default)",
  ...STATUS_COLORS,
}