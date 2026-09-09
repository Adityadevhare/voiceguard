import { motion } from "framer-motion"
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react"
import type { VoiceResult } from "@/types/voice"
import { STATUS_COLORS } from "@/utils/statusColors"

const ICONS = {
  human: CheckCircle2,
  uncertain: HelpCircle,
  suspicious: AlertTriangle,
  ai: AlertTriangle,
}

interface VoiceResultProps {
  result: VoiceResult
}

export function VoiceResult({ result }: VoiceResultProps) {
  const Icon = ICONS[result.status]
  const dotColor = STATUS_COLORS[result.status]

  return (
    <motion.div
      key={result.status}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="glass flex w-full max-w-md flex-col items-center gap-1.5 rounded-2xl px-6 py-5 text-center"
    >
      <span
        className="relative grid h-9 w-9 place-items-center rounded-full"
        style={{ backgroundColor: `color-mix(in srgb, ${dotColor} 14%, transparent)` }}
        aria-hidden="true"
      >
        <Icon className="h-[18px] w-[18px]" style={{ color: dotColor }} />
      </span>
      <p className="text-[15px] font-medium text-ink">{result.message}</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        {result.detail}
      </p>
    </motion.div>
  )
}