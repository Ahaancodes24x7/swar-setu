// Student profile + DSM-5 questionnaire, filled in by the teacher or operator after the
// student's grade is entered. The questions come from the backend (single source of truth:
// backend/screening/dsm5.py) and answers are stored per student with full history.
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import {
  getQuestionnaire, getStudentProfile, saveStudentProfile,
  type ExclusionFlag, type ProfileAnswers, type Question, type QuestionnaireSchema,
} from "@/api/students";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: { id: string; name: string; grade: string } | null;
  onSaved?: () => void;
}

function ageFromDob(dob: string | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
}

function QuestionField({ q, value, onChange, invalid }: {
  q: Question; value: string | number | undefined; onChange: (v: string | number | undefined) => void; invalid: boolean;
}) {
  const id = `q-${q.key}`;
  const labelEl = (
    <Label htmlFor={id} className="text-sm font-medium leading-snug">
      {q.label}{q.required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
      {q.dsm5 && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">DSM-5 {q.dsm5}</span>}
    </Label>
  );
  const ring = invalid ? "ring-2 ring-destructive/60" : "";

  if (q.type === "frequency") {
    return (
      <fieldset className="space-y-2">
        <legend className="mb-1">{labelEl}</legend>
        <div className={`grid grid-cols-2 gap-2 rounded-lg sm:grid-cols-4 ${ring}`} role="radiogroup" aria-labelledby={id}>
          {q.options?.map((o) => {
            const selected = value === o.value;
            return (
              <button
                key={String(o.value)}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(o.value)}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-muted"}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }
  return (
    <div className="space-y-2">
      {labelEl}
      {q.type === "select" && (
        <Select value={value !== undefined ? String(value) : undefined} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={id} className={ring}><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            {q.options?.map((o) => <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {q.type === "date" && (
        <Input id={id} type="date" className={ring} value={value !== undefined ? String(value) : ""}
          max={new Date().toISOString().slice(0, 10)} onChange={(e) => onChange(e.target.value || undefined)} />
      )}
      {q.type === "number" && (
        <Input id={id} type="number" inputMode="numeric" className={ring} min={q.min} max={q.max}
          value={value !== undefined ? String(value) : ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
      )}
      {q.type === "text" && (
        <Textarea id={id} rows={2} value={value !== undefined ? String(value) : ""} onChange={(e) => onChange(e.target.value || undefined)} />
      )}
      {q.help && <p className="text-xs text-muted-foreground">{q.help}</p>}
    </div>
  );
}

export function StudentProfileDialog({ open, onOpenChange, student, onSaved }: Props) {
  const { user } = useAuth();
  const [schema, setSchema] = useState<QuestionnaireSchema | null>(null);
  const [answers, setAnswers] = useState<ProfileAnswers>({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [flags, setFlags] = useState<ExclusionFlag[] | null>(null);

  useEffect(() => {
    if (!open || !student) return;
    let cancelled = false;
    setLoading(true); setStep(0); setShowErrors(false); setFlags(null); setAnswers({});
    Promise.all([getQuestionnaire(), getStudentProfile(student.id)])
      .then(([s, p]) => {
        if (cancelled) return;
        setSchema(s);
        setAnswers(p.profile?.answers || {});
      })
      .catch((e) => toast.error(`Could not load the questionnaire: ${e instanceof Error ? e.message : e}`))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [open, student]);

  const sections = schema?.sections || [];
  const section = sections[step];
  const isLast = step === sections.length - 1;
  const missingInStep = useMemo(
    () => (section?.questions || []).filter((q) => q.required && (answers[q.key] === undefined || answers[q.key] === "")),
    [section, answers],
  );

  const age = ageFromDob(answers.date_of_birth as string | undefined);
  const gradeNum = parseInt(String(student?.grade || "").replace(/\D/g, ""), 10);
  const ageGradeWarning = age !== null && Number.isFinite(gradeNum) && (age < gradeNum + 4.5 || age > gradeNum + 7.5)
    ? `Age ${age.toFixed(1)} is unusual for Grade ${gradeNum} (typically ${gradeNum + 5}–${gradeNum + 6}). Please check the date of birth.`
    : null;

  const save = async (finish: boolean) => {
    if (!student) return;
    setSaving(true);
    try {
      const res = await saveStudentProfile(student.id, answers, user?.email || undefined);
      setFlags(res.exclusion_flags);
      onSaved?.();
      if (finish) {
        toast.success(res.completeness.complete ? "Profile saved" : `Profile saved (${res.completeness.missing.length} required answers still missing)`);
        if (!res.exclusion_flags.length) onOpenChange(false);
      } else {
        toast.success("Draft saved");
      }
    } catch (e) {
      toast.error(`Could not save the profile: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (missingInStep.length) { setShowErrors(true); return; }
    setShowErrors(false);
    if (isLast) save(true); else setStep((s) => s + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="space-y-1 border-b px-6 py-4 text-left">
          <DialogTitle>Student profile{student ? `: ${student.name}` : ""}</DialogTitle>
          <DialogDescription>
            {student ? `Grade ${student.grade}. ` : ""}Filled in by the teacher or operator. Answers stay with the student's record and make screening age- and language-appropriate.
          </DialogDescription>
          {sections.length > 0 && (
            <div className="pt-2" aria-label={`Step ${step + 1} of ${sections.length}`}>
              <div className="flex gap-1">
                {sections.map((s, i) => (
                  <button key={s.id} type="button" onClick={() => setStep(i)} title={s.title}
                    className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Step {step + 1} of {sections.length}</p>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading || !section ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading questionnaire…
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold">{section.title}</h3>
                {section.description && <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>}
              </div>
              {section.questions.map((q) => (
                <QuestionField key={q.key} q={q} value={answers[q.key]}
                  invalid={showErrors && missingInStep.some((m) => m.key === q.key)}
                  onChange={(v) => setAnswers((a) => {
                    const n = { ...a };
                    if (v === undefined) delete n[q.key]; else n[q.key] = v;
                    return n;
                  })} />
              ))}
              {section.id === "details" && age !== null && (
                <p className="text-sm text-muted-foreground">Age: <span className="font-medium text-foreground">{age.toFixed(1)} years</span></p>
              )}
              {section.id === "details" && ageGradeWarning && (
                <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{ageGradeWarning}
                </p>
              )}
              {showErrors && missingInStep.length > 0 && (
                <p className="text-sm text-destructive" role="alert">Please answer the {missingInStep.length} required question{missingInStep.length > 1 ? "s" : ""} marked *.</p>
              )}
              {flags && flags.length > 0 && isLast && (
                <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm" role="status">
                  <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4 text-warning" />Check these first (DSM-5 Criterion D)</p>
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">{flags.map((f) => <li key={f.key}>{f.message}</li>)}</ul>
                </div>
              )}
              {flags && flags.length === 0 && isLast && (
                <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" />No other explanations flagged.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-6 py-3">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}>
            <ChevronLeft className="mr-1 h-4 w-4" />Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => save(false)} disabled={saving || loading}>
              <Save className="mr-1 h-4 w-4" />Save draft
            </Button>
            <Button onClick={next} disabled={saving || loading}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {isLast ? "Save profile" : <>Next<ChevronRight className="ml-1 h-4 w-4" /></>}
            </Button>
          </div>
        </div>
        {schema && <p className="px-6 pb-3 text-[11px] text-muted-foreground">{schema.disclaimer}</p>}
      </DialogContent>
    </Dialog>
  );
}
