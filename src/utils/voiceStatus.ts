import type { VoiceStatus } from "@/types/voice"

export interface VoiceStatusContent {
  label: string
  message: string
  detail: string
}

const CONTENT: Record<VoiceStatus, VoiceStatusContent> = {
  human: {
    label: "Looks like a human voice",
    message: "Looks like a human voice",
    detail: "The voice currently sounds natural.",
  },
  uncertain: {
    label: "We're not completely sure",
    message: "We're not completely sure",
    detail: "Some characteristics of the voice are unusual.",
  },
  suspicious: {
    label: "This voice seems suspicious",
    message: "This voice seems suspicious",
    detail: "We noticed characteristics that may indicate an AI-generated voice.",
  },
  ai: {
    label: "This voice is very likely AI-generated",
    message: "This voice is very likely AI-generated",
    detail: "Be careful before trusting the person behind this voice.",
  },
}

export function voiceStatusContent(status: VoiceStatus): VoiceStatusContent {
  return CONTENT[status]
}

export const VOICE_STATUSES: VoiceStatus[] = [
  "human",
  "uncertain",
  "suspicious",
  "ai",
]
