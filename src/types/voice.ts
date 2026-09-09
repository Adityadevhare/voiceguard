export type VoiceStatus = "human" | "uncertain" | "suspicious" | "ai"

export type MicrophoneState =
  | "idle"
  | "requesting"
  | "ready"
  | "listening"
  | "denied"
  | "unavailable"
  | "unsupported"

export interface VoiceCheckRecord {
  id: string
  status: VoiceStatus
  timestamp: number
}

export interface VoiceResult {
  status: VoiceStatus
  message: string
  detail: string
}
