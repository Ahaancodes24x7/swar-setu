// DSM-5 criteria A-D for each learning domain, combining the teacher questionnaire (stored
// student profile) with the screening result. Shown under the AI screening result.
import { AlertTriangle, CheckCircle2, CircleDashed, ClipboardCheck, XCircle } from "lucide-react";
import type { Dsm5DomainSummary, Dsm5Summary } from "@/api/students";

const STATUS: Record<Dsm5DomainSummary["status"], { label: string; cls: string }> = {
  consistent: { label: "Consistent with DSM-5 criteria: refer", cls: "border-destructive/40 bg-destructive/10 text-destructive" },
  exclusion_review: { label: "Check other causes first", cls: "border-warning/50 bg-warning/10 text-warning-foreground" },
  partial: { label: "Some indicators: monitor", cls: "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200" },
  not_indicated: { label: "Not indicated", cls: "border-success/40 bg-success/10 text-success" },
};

const SPECIFIER: Record<string, string> = { Dyslexia: "reading", Dyscalculia: "mathematics", Dysgraphia: "written expression" };

function Mark({ ok, label }: { ok: boolean | null; label: string }) {
  const Icon = ok === null ? CircleDashed : ok ? CheckCircle2 : XCircle;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${ok === null ? "text-muted-foreground" : ok ? "text-success" : "text-muted-foreground"}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}
      <span className="sr-only">{ok === null ? "unknown" : ok ? "met" : "not met"}</span>
    </span>
  );
}

export function Dsm5CriteriaPanel({ summary, focus, profileMissing }: {
  summary?: Dsm5Summary | null;
  focus?: string;
  profileMissing?: boolean;
}) {
  if (!summary) {
    if (!profileMissing) return null;
    return (
      <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Fill in this student's profile and DSM-5 questionnaire (Students → Profile &amp; questionnaire) to check the
          other DSM-5 criteria: persistence despite help (A), school-age onset (C) and other explanations such as vision,
          hearing or language (D).
        </p>
      </div>
    );
  }
  const order = ["Dyslexia", "Dyscalculia", "Dysgraphia"].sort((a, b) =>
    (a.toLowerCase() === focus?.toLowerCase() ? -1 : 0) - (b.toLowerCase() === focus?.toLowerCase() ? -1 : 0));
  return (
    <div className="space-y-3 rounded-lg border bg-white p-3 dark:bg-card">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <ClipboardCheck className="h-3.5 w-3.5 text-primary" /> DSM-5 criteria check (profile + screening)
      </h4>
      {order.map((name) => {
        const d = summary.domains[name];
        if (!d) return null;
        const st = STATUS[d.status];
        return (
          <div key={name} className={`space-y-1.5 rounded-md border p-2.5 ${name.toLowerCase() === focus?.toLowerCase() ? "" : "opacity-80"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{name} <span className="text-xs font-normal text-muted-foreground">(impairment in {SPECIFIER[name]})</span></p>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <Mark ok={d.criterion_a.met} label="A: persistent symptoms" />
              <Mark ok={d.criterion_b.teacher_reported_below || d.criterion_b.screen_flagged} label="B: below age level" />
              <Mark ok={d.criterion_c.answer === undefined || d.criterion_c.answer === null ? null : d.criterion_c.met} label="C: school-age onset" />
              <Mark ok={d.criterion_d.clear} label="D: other causes ruled out" />
            </div>
            <p className="text-xs text-muted-foreground">{d.summary}</p>
          </div>
        );
      })}
      {summary.exclusion_flags.length > 0 && (
        <div className="space-y-1 rounded-md border border-warning/40 bg-warning/10 p-2.5 text-xs">
          <p className="flex items-center gap-1.5 font-medium"><AlertTriangle className="h-3.5 w-3.5 text-warning" />Criterion D: check first</p>
          <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
            {summary.exclusion_flags.map((f) => <li key={f.key}>{f.message}</li>)}
          </ul>
        </div>
      )}
      {!summary.completeness.complete && (
        <p className="text-[11px] text-muted-foreground">Questionnaire incomplete ({summary.completeness.missing.length} required answers missing); some criteria may show as not met.</p>
      )}
      <p className="text-[11px] italic text-muted-foreground">{summary.disclaimer}</p>
    </div>
  );
}
