// The DSM-5 specifiers a test measured, with whether performance was below what is expected
// for the grade. Screening evidence only: a diagnosis also needs Criteria A-D (see the profile).
import { CheckCircle2, AlertTriangle, MinusCircle } from "lucide-react";

export interface Dsm5Specifier {
  name: string;
  status: "below" | "expected" | "not_measured";
  evidence: string;
}

const STYLE = {
  below: { icon: AlertTriangle, cls: "text-warning", label: "Below expected" },
  expected: { icon: CheckCircle2, cls: "text-success", label: "As expected" },
  not_measured: { icon: MinusCircle, cls: "text-muted-foreground", label: "Not measured" },
} as const;

export function Dsm5SpecifierList({ title, specifiers, note }: { title: string; specifiers: Dsm5Specifier[]; note?: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="mb-3 font-semibold">{title}</p>
      <ul className="space-y-2">
        {specifiers.map((s) => {
          const st = STYLE[s.status];
          const Icon = st.icon;
          return (
            <li key={s.name} className="flex items-start gap-3 rounded-md bg-background/70 p-2 text-sm">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${st.cls}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-medium">{s.name}</span>
                  <span className={`text-xs ${st.cls}`}>{st.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{s.evidence}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {note || "Screening evidence for DSM-5 Criterion B (skills below age expectations). A diagnosis also needs persistent symptoms despite support, school-age onset and other causes ruled out."}
      </p>
    </div>
  );
}
