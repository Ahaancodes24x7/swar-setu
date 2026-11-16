// DSM-5 mathematics specifier subtest ("accurate or fluent calculation"): one minute of
// grade-appropriate number facts. Measures facts correct per minute, accuracy and the time
// to answer correctly (retrieval speed). On-screen keypad for touch devices; keyboard works too.
import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, Delete, SkipForward, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { generateFacts, scoreFacts, type FactFluencyResult } from "@/lib/dsm5Fluency";

const LIMIT_S = 60;

interface Props {
  grade: number;
  onComplete: (result: FactFluencyResult | null) => void;
}

export function FactFluency({ grade, onComplete }: Props) {
  const facts = useMemo(() => generateFacts(grade), [grade]);
  const [phase, setPhase] = useState<"ready" | "running" | "done">("ready");
  const [idx, setIdx] = useState(0);
  const [entry, setEntry] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<FactFluencyResult | null>(null);
  const responsesRef = useRef<FactFluencyResult["responses"]>([]);
  const startRef = useRef(0);
  const shownAtRef = useRef(0);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    const seconds = Math.min(LIMIT_S, (performance.now() - startRef.current) / 1000);
    setResult(scoreFacts(responsesRef.current, seconds, grade));
    setPhase("done");
  };

  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setInterval(() => {
      const s = (performance.now() - startRef.current) / 1000;
      setElapsed(s);
      if (s >= LIMIT_S) finish();
    }, 200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = () => {
    responsesRef.current = [];
    doneRef.current = false;
    setIdx(0); setEntry(""); setElapsed(0);
    startRef.current = shownAtRef.current = performance.now();
    setPhase("running");
  };

  const submit = () => {
    if (phase !== "running" || entry === "") return;
    const f = facts[idx];
    const now = performance.now();
    responsesRef.current.push({
      fact: `${f.a} ${f.op} ${f.b}`, given: entry, correct: Number(entry) === f.answer, ms: Math.round(now - shownAtRef.current),
    });
    shownAtRef.current = now;
    setEntry("");
    if (idx + 1 >= facts.length) finish(); else setIdx(idx + 1);
  };

  const press = (k: string) => {
    if (phase !== "running") return;
    if (k === "back") setEntry((e) => e.slice(0, -1));
    else if (k === "ok") submit();
    else setEntry((e) => (e.length < 3 ? e + k : e));
  };

  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("back");
      else if (e.key === "Enter") press("ok");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const f = facts[idx];
  return (
    <Card className="mx-auto max-w-md border-2 border-primary/20">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-xl"><Calculator className="h-5 w-5" />Number facts</CardTitle>
          <Badge variant="outline">DSM-5: fluent calculation</Badge>
        </div>
        <CardDescription>
          {phase === "ready" && "Answer as many sums as you can in one minute. Work quickly but carefully."}
          {phase === "running" && "Type the answer and press OK."}
          {phase === "done" && "Time's up!"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase === "ready" && (
          <div className="space-y-2">
            <Button size="lg" className="w-full" onClick={start}><Timer className="mr-2 h-4 w-4" />Start one minute</Button>
            <Button variant="ghost" className="w-full" onClick={() => onComplete(null)}><SkipForward className="mr-2 h-4 w-4" />Skip this subtest</Button>
          </div>
        )}

        {phase === "running" && f && (
          <>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.max(0, Math.ceil(LIMIT_S - elapsed))} s left</span>
                <span>{responsesRef.current.length} answered</span>
              </div>
              <Progress value={(elapsed / LIMIT_S) * 100} className="h-2" />
            </div>
            <div className="flex items-center justify-center gap-3 py-4 font-mono text-4xl font-bold sm:text-5xl" aria-live="polite">
              <span>{f.a} {f.op} {f.b} =</span>
              <span className="min-w-[3ch] rounded-lg border-2 border-primary/40 bg-muted/40 px-2 text-center">{entry || " "}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "ok"].map((k) => (
                <Button key={k} type="button" size="lg" className="h-14 text-xl"
                  variant={k === "ok" ? "default" : "outline"} onClick={() => press(k)}
                  aria-label={k === "back" ? "Delete" : k === "ok" ? "OK" : k} disabled={k === "ok" && entry === ""}>
                  {k === "back" ? <Delete className="h-5 w-5" /> : k === "ok" ? "OK" : k}
                </Button>
              ))}
            </div>
          </>
        )}

        {phase === "done" && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border bg-muted/40 p-3"><p className="text-2xl font-bold">{result.correct}</p><p className="text-xs text-muted-foreground">correct</p></div>
              <div className="rounded-lg border bg-muted/40 p-3"><p className="text-2xl font-bold">{Math.round(result.accuracy * 100)}%</p><p className="text-xs text-muted-foreground">accuracy</p></div>
              <div className="rounded-lg border bg-muted/40 p-3"><p className="text-2xl font-bold">{(result.avgCorrectMs / 1000).toFixed(1)} s</p><p className="text-xs text-muted-foreground">per correct fact</p></div>
            </div>
            <Button className="w-full" onClick={() => onComplete(result)}>Continue</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
