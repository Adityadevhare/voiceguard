import { useEffect, useState } from "react"
import { Mic, MonitorSmartphone } from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { useTheme } from "@/lib/theme"
import { cn } from "@/utils/cn"

type MicDeviceStatus = "checking" | "found" | "none" | "unsupported"

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [micStatus, setMicStatus] = useState<MicDeviceStatus>("checking")

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) {
        setMicStatus("unsupported")
        return
      }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        if (cancelled) return
        const hasMic = devices.some((d) => d.kind === "audioinput")
        setMicStatus(hasMic ? "found" : "none")
      } catch {
        if (!cancelled) setMicStatus("none")
      }
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [])

  const micLabel: Record<MicDeviceStatus, string> = {
    checking: "Checking…",
    found: "Microphone detected",
    none: "No microphone found",
    unsupported: "Microphone not supported by this browser",
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Settings" subtitle="Appearance and device status." />

      <div className="border-t border-border">
        <section className="border-b border-border py-6">
          <h2 className="text-sm font-medium text-ink">Appearance</h2>
          <p className="mt-1 text-sm text-muted">Choose how Voice Check looks.</p>

          <div
            role="radiogroup"
            aria-label="Theme"
            className="mt-4 inline-flex rounded-xl border border-glass-border bg-glass p-1 backdrop-blur-lg"
          >
            {(["light", "dark"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={theme === option}
                onClick={() => setTheme(option)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm capitalize transition-all",
                  theme === option
                    ? "bg-gradient-to-b from-primary to-primary/85 text-primary-fg shadow-[0_10px_24px_-10px_var(--primary)]"
                    : "text-muted hover:text-ink",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        <section className="border-b border-border py-6">
          <h2 className="text-sm font-medium text-ink">Microphone</h2>
          <p className="mt-1 text-sm text-muted">Your current input device.</p>
          <p className="mt-4 flex items-center gap-2.5 text-sm text-ink">
            <Mic className="h-4 w-4 text-muted" aria-hidden="true" />
            {micLabel[micStatus]}
          </p>
        </section>

        <section className="border-b border-border py-6">
          <h2 className="text-sm font-medium text-ink">About</h2>
          <p className="mt-1 text-sm text-muted">
            A demo prototype for Smart India Hackathon 2026.
          </p>
          <p className="mt-4 flex items-center gap-2.5 text-sm text-ink">
            <MonitorSmartphone className="h-4 w-4 text-muted" aria-hidden="true" />
            Voice Check — Amplitude demo engine
          </p>
        </section>
      </div>
    </div>
  )
}