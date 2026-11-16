// DSM-5 reading specifier subtest: the child reads a grade-level passage aloud for up to one
// minute. Speech is transcribed by the self-hosted Whisper model and aligned with the passage
// to give words correct per minute (WCPM) and word reading accuracy. Without a microphone the
// teacher scores it instead: tap each word read incorrectly, and the last word reached.
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Loader2, Mic, Square, Hand, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import {
  alignReading, passageFor, scoreReading, tokenize,
  type ReadingFluencyResult,
} from "@/lib/dsm5Fluency";

const LIMIT_S = 60;

interface Props {
  lang: string;
  grade: number;
  onComplete: (result: ReadingFluencyResult | null) => void;
}

type Phase = "ready" | "reading" | "scoring" | "mark_last" | "done";

export function OralReadingFluency({ lang, grade, onComplete }: Props) {
  const passage = useMemo(() => passageFor(lang, grade), [lang, grade]);
  const displayWords = useMemo(() => passage.text.split(/\s+/), [passage]);
  // tokenize() drops punctuation-only tokens; keep a display-word -> scored-word index map
  const scoredIndex = useMemo(() => {
    let k = 0;
    return displayWords.map((w) => (tokenize(w).length ? k++ : -1));
  }, [displayWords]);

  const [phase, setPhase] = useState<Phase>("ready");
  const [method, setMethod] = useState<"speech" | "teacher">("speech");
  const [elapsed, setElapsed] = useState(0);
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const [lastWord, setLastWord] = useState<number | null>(null);
  const [result, setResult] = useState<ReadingFluencyResult | null>(null);
  const [marks, setMarks] = useState<ReturnType<typeof alignReading>["marks"] | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const startRef = useRef(0);
  const stoppedRef = useRef(false);

  const stt = useSpeechToText({ language: lang === "hi" ? "hi" : "en", onError: (m) => setMicError(m) });

  useEffect(() => {
    if (phase !== "reading") return;
    const id = window.setInterval(() => {
      const s = (performance.now() - startRef.current) / 1000;
      setElapsed(s);
      if (s >= LIMIT_S) stop();
    }, 200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = async (m: "speech" | "teacher") => {
    setMethod(m); setErrors(new Set()); setLastWord(null); setMicError(null);
    stoppedRef.current = false;
    if (m === "speech") {
      try {
        await stt.connect();
      } catch {
        setMicError("Microphone not available. The teacher can score the reading instead.");
        return;
      }
    }
    startRef.current = performance.now();
    setElapsed(0);
    setPhase("reading");
  };

  const finish = (r: ReadingFluencyResult) => {
    setResult(r);
    setPhase("done");
  };

  const stop = async () => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    const seconds = Math.min(LIMIT_S, (performance.now() - startRef.current) / 1000);
    setElapsed(seconds);
    if (method === "speech") {
      setPhase("scoring");
      const transcript = await stt.disconnect();
      const a = alignReading(passage.text, transcript);
      setMarks(a.marks);
      finish(scoreReading(passage, grade, seconds, a.wordsAttempted, a.wordsCorrect, "speech", transcript));
    } else if (seconds >= LIMIT_S - 0.5) {
      setPhase("mark_last"); // time ran out: the teacher marks where the child got to
    } else {
      scoreTeacher(seconds, displayWords.length - 1);
    }
  };

  const scoreTeacher = (seconds: number, lastDisplayIdx: number) => {
    const attemptedScored = scoredIndex.slice(0, lastDisplayIdx + 1).filter((k) => k >= 0).length;
    const errCount = [...errors].filter((i) => i <= lastDisplayIdx && scoredIndex[i] >= 0).length;
    finish(scoreReading(passage, grade, seconds, attemptedScored, attemptedScored - errCount, "teacher"));
  };

  const onWordClick = (i: number) => {
    if (method !== "teacher") return;
    if (phase === "mark_last") {
      setLastWord(i);
      scoreTeacher(elapsed, i);
      return;
    }
    if (phase !== "reading") return;
    setErrors((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  };

  const wordClass = (i: number) => {
    const k = scoredIndex[i];
    if (phase === "done" && method === "speech" && marks && k >= 0) {
      return marks[k] === "correct" ? "text-foreground" : marks[k] === "error" ? "text-destructive underline decoration-dotted" : "text-muted-foreground/60";
    }
    if (errors.has(i)) return "text-destructive line-through";
    if (lastWord !== null && i > lastWord) return "text-muted-foreground/60";
    return "";
  };

  const teacherInteractive = method === "teacher" && (phase === "reading" || phase === "mark_last");

  return (
    <Card className="mx-auto max-w-2xl border-2 border-primary/20">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-xl"><BookOpen className="h-5 w-5" />Oral reading fluency</CardTitle>
          <Badge variant="outline">DSM-5: word reading accuracy · reading rate</Badge>
        </div>
        <CardDescription>
          {phase === "ready" && "Ask the child to read the passage aloud, as well as they can, for up to one minute. Don't help with words."}
          {phase === "reading" && method === "speech" && "Listening… Press Done when the child finishes the passage."}
          {phase === "reading" && method === "teacher" && "Tap every word read incorrectly or skipped (tap again to undo). Press Done when the child finishes."}
          {phase === "mark_last" && "Time is up. Tap the last word the child read."}
          {phase === "scoring" && "Scoring the reading…"}
          {phase === "done" && "Reading scored."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {(phase === "reading" || phase === "scoring") && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.floor(elapsed)} s</span><span>{LIMIT_S} s</span>
            </div>
            <Progress value={(elapsed / LIMIT_S) * 100} className="h-2" />
            {method === "speech" && phase === "reading" && (
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="h-full bg-success transition-[width]" style={{ width: `${stt.level}%` }} />
              </div>
            )}
          </div>
        )}

        <div
          lang={passage.lang}
          className={`rounded-xl border bg-card p-5 text-xl leading-loose sm:text-2xl ${phase === "ready" ? "select-none blur-sm" : ""}`}
          aria-label={passage.title}
        >
          {displayWords.map((w, i) => (
            teacherInteractive ? (
              <button key={i} type="button" onClick={() => onWordClick(i)}
                className={`mr-[0.35em] rounded px-0.5 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${wordClass(i)}`}>
                {w}
              </button>
            ) : (
              <span key={i} className={`mr-[0.35em] ${wordClass(i)}`}>{w}</span>
            )
          ))}
        </div>
        {phase === "ready" && <p className="-mt-3 text-center text-xs text-muted-foreground">The passage appears when you start.</p>}

        {micError && <p className="text-sm text-destructive" role="alert">{micError}</p>}

        {phase === "ready" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button size="lg" onClick={() => start("speech")}><Mic className="mr-2 h-4 w-4" />Start (listen with microphone)</Button>
            <Button size="lg" variant="outline" onClick={() => start("teacher")}><Hand className="mr-2 h-4 w-4" />Start (teacher scores)</Button>
            <Button variant="ghost" className="sm:col-span-2" onClick={() => onComplete(null)}>
              <SkipForward className="mr-2 h-4 w-4" />Skip this subtest
            </Button>
          </div>
        )}
        {phase === "reading" && (
          <Button size="lg" className="w-full" onClick={stop}><Square className="mr-2 h-4 w-4" />Done</Button>
        )}
        {phase === "scoring" && (
          <div className="flex items-center justify-center py-2 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Transcribing…</div>
        )}

        {phase === "done" && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-2xl font-bold">{result.wcpm}</p>
                <p className="text-xs text-muted-foreground">words correct / min</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-2xl font-bold">{Math.round(result.accuracy * 100)}%</p>
                <p className="text-xs text-muted-foreground">word accuracy</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-2xl font-bold">{result.wordsCorrect}/{result.wordsAttempted}</p>
                <p className="text-xs text-muted-foreground">words in {result.seconds} s</p>
              </div>
            </div>
            {passage.lang === "en" && (
              <p className="text-xs text-muted-foreground">
                Typical for Grade {Math.min(6, grade)} by year end: about {result.norm.p50} WCPM (25th percentile {result.norm.p25}).
              </p>
            )}
            {result.method === "speech" && result.wordsAttempted === 0 && (
              <p className="text-sm text-warning">No reading was heard. You can retry or let the teacher score it.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { setPhase("ready"); setResult(null); setMarks(null); }}>Retry</Button>
              <Button className="flex-1" onClick={() => onComplete(result)}>Continue</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
