export type VoiceStatus = "human" | "uncertain" | "suspicious" | "ai";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export const VOICE_STATUSES = [
  "human",
  "uncertain",
  "suspicious",
  "ai",
] as const satisfies readonly VoiceStatus[];

export interface VerdictProfile {
  riskLevel: RiskLevel;
  message: string;
}

export const VERDICT_PROFILES: Record<VoiceStatus, VerdictProfile> = {
  human: {
    riskLevel: "low",
    message: "The voice currently sounds natural.",
  },
  uncertain: {
    riskLevel: "medium",
    message: "Some characteristics of the voice are unusual.",
  },
  suspicious: {
    riskLevel: "high",
    message: "The voice seems suspicious and may be AI-generated.",
  },
  ai: {
    riskLevel: "critical",
    message: "Be careful before trusting the person behind this voice.",
  },
};

export interface DetectionInput {
  audio: string;
}

export interface DetectionResult {
  result: VoiceStatus;
  riskLevel: RiskLevel;
  message: string;
  modelVersion?: string;
  processingTimeMs?: number;
}