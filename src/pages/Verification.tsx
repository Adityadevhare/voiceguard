import { ShieldCheck } from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"

export function VerificationPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Verification"
        subtitle="Confirming a voice against another trusted method."
      />

      <div className="border-t border-border pt-6">
        <p className="text-sm leading-relaxed text-muted">
          If a voice seems suspicious, you may want to confirm the person&apos;s
          identity through another trusted method.
        </p>

        <h2 className="mt-8 text-sm font-medium text-ink">
          Future options could include
        </h2>
        <ul className="mt-3 space-y-3">
          {[
            "Trusted contact",
            "Second communication channel",
            "Personal verification phrase",
          ].map((option) => (
            <li
              key={option}
              className="flex items-center gap-2.5 text-sm text-muted"
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/10">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              {option}
            </li>
          ))}
        </ul>

        <p className="glass mt-8 rounded-2xl px-4 py-3 text-sm leading-relaxed text-muted">
          These verification steps are a future capability. They aren&apos;t
          available yet.
        </p>

        <div className="mt-8 flex items-start gap-3 border-t border-border pt-6">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <p className="text-sm leading-relaxed text-muted">
            In a full deployment, suspicious voices could be paired with an
            optional verification step before you act on the conversation.
          </p>
        </div>
      </div>
    </div>
  )
}