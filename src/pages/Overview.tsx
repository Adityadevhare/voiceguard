import { ArrowRight, Mic } from "lucide-react"
import type { Route } from "@/lib/router"

interface OverviewPageProps {
  onNavigate: (route: Route) => void
}

const STEPS = [
  {
    title: "Speak",
    body: "Voices are recorded for a few seconds through your microphone.",
  },
  {
    title: "Analyze",
    body: "We examine live acoustic patterns for signs of synthesis or tampering.",
  },
  {
    title: "Understand",
    body: "A clear, human-readable result tells you what to do next.",
  },
]

export function OverviewPage({ onNavigate }: OverviewPageProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">
        Voice security
      </p>
      <h1 className="mt-4 max-w-md text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Protect yourself from voice impersonation.
      </h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
        Check whether a voice sounds genuine or shows signs of being
        AI-generated.
      </p>

      <div className="mt-9">
        <button
          type="button"
          onClick={() => onNavigate("/voice-check")}
          className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-[15px] font-medium text-primary-fg shadow-[0_18px_40px_-14px_var(--primary)] transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          <Mic className="h-5 w-5" aria-hidden="true" />
          Start Voice Check
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="mt-16 w-full">
        <div className="border-t border-border pt-7">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-subtle">
            How it works
          </h2>
          <ul className="mt-5 grid gap-6 sm:grid-cols-3 sm:gap-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="text-center">
                <span className="text-xs font-semibold tabular-nums text-primary">
                  0{i + 1}
                </span>
                <p className="mt-1.5 text-sm font-medium text-ink">
                  {step.title}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}