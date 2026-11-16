import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { getAIPrediction, type AssessmentPayload } from "@/api/ai";
import { computeStrokeFeatures } from "@/lib/strokeFeatures";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getWrittenExpressionPrompts, scoreWrittenExpression, spelledCorrectly, WRITTEN_CUTOFFS,
  type WrittenPrompt, type WritingReview,
} from "@/lib/writtenExpression";
import { ITEM_BANK_VERSION } from "@/lib/ncertItemBank";
import { speakText, stopSpeaking } from "@/lib/voice";
import { Dsm5SpecifierList, type Dsm5Specifier } from "./dsm5/Dsm5SpecifierList";
import { analyzeDysgraphia, type StrokeData, type StrokePoint, type DysgraphiaAnalysisResult, type InputDevice, type DrawingInput } from "@/lib/dysgraphiaAnalysis";
import { assessLegibility } from "@/api/ai";
import {
  Pencil,
  Play,
  RotateCcw,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Eraser,
  Volume2,
} from "lucide-react";

interface DysgraphiaCanvasProps {
  studentName: string;
  studentGrade: string;
  studentId?: string;
  onComplete?: (results: any) => void;
}

interface DrawingResult {
  prompt: WrittenPrompt;
  strokes: StrokeData[];
  imageData: string;
  canvasWidth: number;
  canvasHeight: number;
  totalTime: number;
}

export function DysgraphiaCanvas({ studentName, studentGrade, studentId, onComplete }: DysgraphiaCanvasProps) {
  const { language } = useLanguage();
  const gradeNum = parseInt(studentGrade.replace(/\D/g, '')) || 3;
  // DSM-5 written expression tasks (copying, dictation, sentence, composition) plus a shape
  const prompts = useMemo(() => getWrittenExpressionPrompts(language.code, gradeNum), [language.code, gradeNum]);

  const [phase, setPhase] = useState<"intro" | "drawing" | "reviewing" | "analyzing" | "teacher_review" | "results">("intro");
  // teacher's check of spelling / grammar / clarity (the handwriting model pre-fills spelling)
  const [review, setReview] = useState<WritingReview>({ spelling: {} });
  const [recognisedText, setRecognisedText] = useState<Record<number, string | undefined>>({});
  const [dsm5Specifiers, setDsm5Specifiers] = useState<Dsm5Specifier[] | null>(null);
  const [finalRisk, setFinalRisk] = useState<{ level: "low" | "moderate" | "high"; flags: string[]; motorOnly: boolean } | null>(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [strokes, setStrokes] = useState<StrokeData[]>([]);
  const [currentStroke, setCurrentStroke] = useState<StrokeData | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingResults, setDrawingResults] = useState<DrawingResult[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  // Input device of the last stroke (pen = stylus, touch = finger); the screening model adjusts for it
  const pointerTypeRef = useRef<string>("");
  const [analysisResult, setAnalysisResult] = useState<DysgraphiaAnalysisResult | null>(null);

  const drawingResultsRef = useRef<DrawingResult[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvasDimensions = useRef({ width: 0, height: 0 });

  const currentPrompt = prompts[currentPromptIndex];
  const progressPercent = ((currentPromptIndex + 1) / prompts.length) * 100;

  // dictation: the word / sentence is spoken (not shown) so the task measures spelling, not copying
  useEffect(() => {
    if (phase !== "drawing" || !currentPrompt?.speak) return;
    speakText(currentPrompt.speak, language.code).catch(() => undefined);
    return () => stopSpeaking();
  }, [phase, currentPromptIndex, currentPrompt, language.code]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    canvasDimensions.current = { width: rect.width, height: rect.height };

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#1a1a2e";

    ctxRef.current = ctx;
    clearCanvas();
  }, [phase]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setStrokes([]);
    setCurrentStroke(null);
  }, []);

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const pos: { x: number; y: number; pressure?: number } = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    // only a stylus reports real pressure (mouse is fixed at 0.5, touch is device-dependent)
    if (e.pointerType === "pen") pos.pressure = e.pressure;
    return pos;
  };

  // Points are collected in a ref: several pointer events can arrive within one React render,
  // and copying from state dropped samples. Timestamps come from the event (high resolution),
  // and coalesced events recover the full sampling rate of pens and touch screens.
  const strokePointsRef = useRef<StrokePoint[] | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "drawing") return;
    pointerTypeRef.current = e.pointerType;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const pos = getPointerPos(e);
    setIsDrawing(true);
    strokePointsRef.current = [{ ...pos, time: e.timeStamp }];
    setCurrentStroke({ points: strokePointsRef.current, width: 3 });
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || phase !== "drawing" || !strokePointsRef.current) return;
    const ctx = ctxRef.current;
    const native = e.nativeEvent as PointerEvent;
    const events = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    const samples = events.length ? events : [native];
    for (const ev of samples) {
      const pos = getPointerPos(ev as unknown as React.PointerEvent<HTMLCanvasElement>);
      strokePointsRef.current.push({ ...pos, time: ev.timeStamp });
      ctx?.lineTo(pos.x, pos.y);
    }
    ctx?.stroke();
  };

  const handlePointerUp = () => {
    const points = strokePointsRef.current;
    if (points && points.length > 1) {
      setStrokes((prev) => [...prev, { points: [...points], width: 3 }]);
    }
    strokePointsRef.current = null;
    setIsDrawing(false);
    setCurrentStroke(null);
  };

  const startDrawing = () => {
    setPhase("drawing");
    setStartTime(Date.now());
    clearCanvas();
  };

  const submitDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = canvas.toDataURL("image/png");
    const result: DrawingResult = {
      prompt: currentPrompt,
      strokes: [...strokes],
      imageData,
      canvasWidth: canvasDimensions.current.width,
      canvasHeight: canvasDimensions.current.height,
      totalTime: Date.now() - startTime,
    };

    drawingResultsRef.current.push(result);
    setDrawingResults([...drawingResultsRef.current]);
    setPhase("reviewing");
  };

  const nextPrompt = () => {
    if (currentPromptIndex < prompts.length - 1) {
      setCurrentPromptIndex((prev) => prev + 1);
      clearCanvas();
      setPhase("drawing");
      setStartTime(Date.now());
    } else {
      runAnalysis();
    }
  };

  // finalize() runs from the review screen so it sees the teacher's latest answers
  const pendingRef = useRef<{ result: DysgraphiaAnalysisResult; allResults: DrawingResult[]; strokeCount: number; totalTimeMs: number; device: InputDevice } | null>(null);

  const runAnalysis = async () => {
    const allResults = drawingResultsRef.current.length > 0 ? drawingResultsRef.current : drawingResults;
    const allStrokes = allResults.flatMap(r => r.strokes);
    const totalTimeMs = allResults.reduce((s, r) => s + r.totalTime, 0);
    setPhase("analyzing");

    const drawings: DrawingInput[] = allResults.map((r) => ({
      strokes: r.strokes, canvasWidth: r.canvasWidth, canvasHeight: r.canvasHeight, totalTime: r.totalTime,
      type: r.prompt.type, reference: r.prompt.reference, prompt: r.prompt.prompt,
    }));
    const pt = pointerTypeRef.current;
    const device: InputDevice = pt === "pen" || pt === "touch" || pt === "mouse" ? pt : "unknown";
    // the backend handwriting model reads single letters and words: copied items (legibility)
    // and dictated words (spelling). Sentences and compositions are checked by the teacher.
    const readable = allResults.map((r) => r.prompt.task === "copy" || r.prompt.task === "dictation");
    const readIdx = allResults.map((_, i) => i).filter((i) => readable[i]);
    const read = await assessLegibility(readIdx.map((i) => ({
      image: allResults[i].imageData, reference: allResults[i].prompt.reference || "", type: allResults[i].prompt.type,
    })));
    const byIndex: Record<number, (typeof read)[number]> = {};
    readIdx.forEach((i, k) => { byIndex[i] = read[k]; });
    // legibility only from copied items: a misspelt but neat dictated word is not illegible
    const legibility = allResults.map((r, i) => (r.prompt.task === "copy" ? byIndex[i] : undefined));

    const result = analyzeDysgraphia(drawings, { studentName, gradeNum, device, legibility });
    setAnalysisResult(result);

    // pre-fill the teacher review with what the model read
    const rec: Record<number, string | undefined> = {};
    const spelling: Record<number, boolean> = {};
    allResults.forEach((r, i) => {
      if (r.prompt.task !== "dictation") return;
      const b = byIndex[i];
      rec[i] = b?.assessed ? b.recognised : undefined;
      spelling[i] = spelledCorrectly(rec[i], r.prompt.reference || "") ?? false;
    });
    setRecognisedText(rec);
    const hasSentence = allResults.some((r) => r.prompt.task === "sentence");
    const hasComposition = allResults.some((r) => r.prompt.task === "composition");
    setReview({
      spelling,
      sentence: hasSentence ? { capital: true, endPunctuation: true, allWords: true, spelling: true } : undefined,
      composition: hasComposition ? { clarity: 2, grammar: 2 } : undefined,
    });

    pendingRef.current = { result, allResults, strokeCount: allStrokes.length, totalTimeMs, device };
    setPhase("teacher_review");
  };

  const finalize = (
    result: DysgraphiaAnalysisResult, allResults: DrawingResult[], strokeCount: number, totalTimeMs: number, device: InputDevice,
  ) => {
    const we = scoreWrittenExpression(review, language.code);
    const below = (v: number | null, cut: number) => v !== null && v < cut;
    const pct = (v: number | null) => (v === null ? "" : `${Math.round(v * 100)}%`);
    const nDict = Object.keys(review.spelling).length;
    const specifiers: Dsm5Specifier[] = [
      we.spellingAccuracy === null
        ? { name: "Spelling accuracy", status: "not_measured", evidence: "No dictation items" }
        : { name: "Spelling accuracy", status: below(we.spellingAccuracy, WRITTEN_CUTOFFS.spelling) ? "below" : "expected",
            evidence: `${pct(we.spellingAccuracy)} of ${nDict} dictated word${nDict === 1 ? "" : "s"}${review.sentence ? " and the dictated sentence" : ""} spelled correctly` },
      we.grammarPunctuation === null
        ? { name: "Grammar and punctuation accuracy", status: "not_measured", evidence: "Sentence task is from Grade 2" }
        : { name: "Grammar and punctuation accuracy", status: below(we.grammarPunctuation, WRITTEN_CUTOFFS.grammar) ? "below" : "expected",
            evidence: `${pct(we.grammarPunctuation)} of capitalisation, punctuation and grammar checks met` },
      we.clarityOrganisation === null
        ? { name: "Clarity or organization of written expression", status: "not_measured", evidence: "Composition task is from Grade 3" }
        : { name: "Clarity or organization of written expression", status: below(we.clarityOrganisation, WRITTEN_CUTOFFS.clarity) ? "below" : "expected",
            evidence: `Teacher rating: ${["unclear", "partly clear", "clear"][Math.round(we.clarityOrganisation * 2)]}` },
    ];
    const handwritingWeak = result.riskLevel !== "low";
    specifiers.push({
      name: "Handwriting (supporting)",
      status: handwritingWeak ? "below" : "expected",
      evidence: `Handwriting score ${result.overallScore}/100 (legibility, pen control, fluency, layout)`,
    });
    const weBelow = specifiers.slice(0, 3).filter((x) => x.status === "below").length;
    const flags = [...result.flaggedConditions];
    if (below(we.spellingAccuracy, WRITTEN_CUTOFFS.spelling)) flags.push("Spelling below expected");
    if (below(we.grammarPunctuation, WRITTEN_CUTOFFS.grammar)) flags.push("Grammar or punctuation difficulty");
    if (below(we.clarityOrganisation, WRITTEN_CUTOFFS.clarity)) flags.push("Unclear written expression");
    const rank = { low: 0, moderate: 1, high: 2 } as const;
    const weLevel = weBelow >= 2 ? "high" : weBelow === 1 ? "moderate" : "low";
    const level = (rank[weLevel] >= rank[result.riskLevel] ? weLevel : result.riskLevel) as "low" | "moderate" | "high";
    // handwriting difficulty without spelling/grammar/clarity difficulty fits DCD better than an SLD
    const motorOnly = handwritingWeak && weBelow === 0;
    setDsm5Specifiers(specifiers);
    setFinalRisk({ level, flags, motorOnly });

    const recommendations = [...result.recommendations];
    if (below(we.spellingAccuracy, WRITTEN_CUTOFFS.spelling)) recommendations.unshift("Daily structured spelling practice with sound-letter patterns (say it, write it, check it).");
    if (motorOnly) recommendations.push("Difficulty looks motor-only: consider an occupational therapy / motor-coordination (DCD) check rather than a learning-disorder referral.");

    const completePayload = {
      testType: "dysgraphia",
      overallScore: result.overallScore,
      riskLevel: level,
      flaggedConditions: flags,
      summary: result.summary + (motorOnly ? " Spelling, grammar and clarity were as expected, so the difficulty appears to be with handwriting movements rather than written expression." : ""),
      recommendations,
      domainScores: result.domainScores,
      metrics: result.metrics,
      writtenExpression: we,
      writingReview: review,
      dsm5Specifiers: specifiers,
      motorOnly,
      subtestScores: [
        ...(we.spellingAccuracy !== null ? [{ id: "spelling", accuracy: Math.round(we.spellingAccuracy * 100), avgResponseTime: 0, errorCount: 0, hesitationCount: 0 }] : []),
        ...(we.grammarPunctuation !== null ? [{ id: "grammarPunctuation", accuracy: Math.round(we.grammarPunctuation * 100), avgResponseTime: 0, errorCount: 0, hesitationCount: 0 }] : []),
        ...(we.clarityOrganisation !== null ? [{ id: "clarity", accuracy: Math.round(we.clarityOrganisation * 100), avgResponseTime: 0, errorCount: 0, hesitationCount: 0 }] : []),
        ...(result.domainScores.legibility !== null ? [{ id: "legibility", accuracy: result.domainScores.legibility, avgResponseTime: 0, errorCount: 0, hesitationCount: 0 }] : []),
        { id: "motorControl", accuracy: result.domainScores.motorControl, avgResponseTime: 0, errorCount: 0, hesitationCount: 0 },
        { id: "writingFluency", accuracy: result.domainScores.writingFluency, avgResponseTime: 0, errorCount: 0, hesitationCount: result.metrics.longPauseCount },
        ...(result.domainScores.spatialAwareness !== null ? [{ id: "spatialAwareness", accuracy: result.domainScores.spatialAwareness, avgResponseTime: 0, errorCount: 0, hesitationCount: 0 }] : []),
      ],
      answeredQuestions: allResults.map((dr, i) => ({
        question: dr.prompt.task === "dictation" ? `Dictation: ${dr.prompt.reference}` : dr.prompt.prompt,
        answer: dr.prompt.task === "dictation"
          ? `Read as “${recognisedText[i] ?? "?"}”`
          : `Drawing ${i + 1} (${dr.strokes.length} strokes)`,
        correct: dr.prompt.task === "dictation" ? !!review.spelling[i] : true,
        subtest: dr.prompt.task,
        responseTime: dr.totalTime / 1000,
      })),
    };

    // AI games payload: per-stroke measurements computed from the recorded pointer samples
    // (no placeholder values; anything not measurable is omitted and treated as missing)
    const gamesPayload = {
      handwriting: {
        strokes: computeStrokeFeatures(allResults),
        stroke_count: strokeCount,
        drawing_count: allResults.length,
        // client-side summary scores, kept for the report only (not model inputs)
        summary_scores: {
          legibility: result.domainScores.legibility,
          motor_control: result.domainScores.motorControl,
          writing_fluency: result.domainScores.writingFluency,
          spatial_awareness: result.domainScores.spatialAwareness,
          jitter_index: result.metrics.jitterIndex,
          halt_rate: result.metrics.haltRate,
          median_pause_ms: result.metrics.medianPauseMs,
          overall_score: Number((result.overallScore / 100).toFixed(4)),
        },
      },
      written_expression: {
        spelling_accuracy: we.spellingAccuracy,
        grammar_punctuation: we.grammarPunctuation,
        clarity_organisation: we.clarityOrganisation,
      },
    };

    const aiPayload: AssessmentPayload = {
      disorder_type: "dysgraphia",
      student_id: studentId || "guest_student",
      grade: gradeNum,
      item_bank: ITEM_BANK_VERSION,
      input_device: device === "pen" ? "stylus" : device === "touch" ? "finger" : device === "mouse" ? "mouse" : undefined,
      score: result.overallScore,
      percentage: result.overallScore,
      games: gamesPayload,
      timing_data: {
        start_time: new Date(Date.now() - totalTimeMs).toISOString(),
        end_time: new Date().toISOString(),
        total_duration_seconds: Math.round(totalTimeMs / 1000)
      }
    };

    setPhase("results");
    if (onComplete) {
      onComplete({ ...completePayload, aiPayload });
    } else {
      getAIPrediction(aiPayload).catch((err) => console.error("AI prediction error:", err));
    }
  };

  // ---- RENDER PHASES ----

  if (phase === "intro") {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-secondary/30">
        <CardHeader className="text-center">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Pencil className="h-8 w-8 text-secondary-foreground" />
          </div>
          <CardTitle className="text-2xl">Written Expression &amp; Handwriting</CardTitle>
          <CardDescription>{studentName} • {studentGrade}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Copy letters and a word, then write words and a sentence you hear (turn the sound on)</li>
              <li>• From Grade 3, write two sentences of your own</li>
              <li>• Use your finger, stylus, or mouse, and write naturally</li>
              <li>• Tap "Clear" to start over if needed</li>
            </ul>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-sm">What we measure (DSM-5 written expression)</h3>
            <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <span>✓ Spelling accuracy (dictation)</span>
              <span>✓ Grammar &amp; punctuation (sentence)</span>
              <span>✓ Clarity &amp; organisation (composition)</span>
              <span>✓ Handwriting: legibility, pen control, fluency, layout</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold">{prompts.filter(p => p.task === "copy").length}</p>
              <p className="text-xs text-muted-foreground">Copy</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold">{prompts.filter(p => p.task === "dictation").length}</p>
              <p className="text-xs text-muted-foreground">Dictation</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold">{prompts.filter(p => p.task === "sentence").length}</p>
              <p className="text-xs text-muted-foreground">Sentence</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xl font-bold">{prompts.filter(p => p.task === "composition").length}</p>
              <p className="text-xs text-muted-foreground">Composition</p>
            </div>
          </div>

          <Button variant="hero" size="xl" className="w-full" onClick={startDrawing}>
            <Play className="h-5 w-5 mr-2" />
            Start
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === "drawing") {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-secondary/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="outline">{({ copy: "COPY", dictation: "SPELLING", sentence: "SENTENCE", composition: "COMPOSITION", shape: "SHAPE" } as const)[currentPrompt.task]}</Badge>
            <span className="text-sm text-muted-foreground">
              {currentPromptIndex + 1} / {prompts.length}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <p className="text-lg font-medium">{currentPrompt.prompt}</p>
            {currentPrompt.speak ? (
              <Button variant="outline" className="mt-3" onClick={() => speakText(currentPrompt.speak!, language.code).catch(() => undefined)}>
                <Volume2 className="mr-2 h-4 w-4" />Listen again
              </Button>
            ) : currentPrompt.reference && currentPrompt.task !== "composition" ? (
              <p className="text-3xl font-bold mt-2 text-primary">{currentPrompt.reference}</p>
            ) : null}
          </div>

          <div className="relative border-2 border-border rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              className={`w-full touch-none cursor-crosshair ${currentPrompt.task === "sentence" || currentPrompt.task === "composition" ? "aspect-[3/2]" : "aspect-square"}`}
              style={{ touchAction: "none" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={clearCanvas}>
              <Eraser className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button variant="hero" className="flex-1" onClick={submitDrawing} disabled={strokes.length === 0}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "reviewing") {
    const lastResult = drawingResults[drawingResults.length - 1];
    return (
      <Card className="max-w-2xl mx-auto border-2 border-primary/20">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-success mx-auto mb-2" />
          <CardTitle>Saved</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <img src={lastResult.imageData} alt="Your drawing" className="w-full" />
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="p-2 rounded bg-muted/50">
              <p className="font-bold">{lastResult.strokes.length}</p>
              <p className="text-xs text-muted-foreground">Strokes</p>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <p className="font-bold">{Math.round(lastResult.totalTime / 1000)}s</p>
              <p className="text-xs text-muted-foreground">Time</p>
            </div>
            <div className="p-2 rounded bg-muted/50">
              <p className="font-bold capitalize">{lastResult.prompt.task}</p>
              <p className="text-xs text-muted-foreground">Type</p>
            </div>
          </div>

          <Button variant="hero" className="w-full" onClick={nextPrompt}>
            {currentPromptIndex < prompts.length - 1 ? (
              <>Next <ArrowRight className="h-4 w-4 ml-2" /></>
            ) : (
              <>Finish & Analyze <CheckCircle className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === "analyzing") {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" aria-hidden="true" />
          <p className="font-semibold">Analyzing handwriting…</p>
          <p className="max-w-sm text-sm text-muted-foreground">Reading each word and measuring pen control, fluency and layout.</p>
        </CardContent>
      </Card>
    );
  }

  if (phase === "teacher_review") {
    const all = drawingResultsRef.current;
    const sentenceIdx = all.findIndex((d) => d.prompt.task === "sentence");
    const compIdx = all.findIndex((d) => d.prompt.task === "composition");
    const Toggle = ({ on, onChange, yes, no }: { on: boolean; onChange: (v: boolean) => void; yes: string; no: string }) => (
      <div className="inline-flex overflow-hidden rounded-md border text-xs" role="radiogroup">
        <button type="button" role="radio" aria-checked={on} onClick={() => onChange(true)}
          className={`px-2.5 py-1.5 ${on ? "bg-success text-success-foreground" : "bg-background hover:bg-muted"}`}>{yes}</button>
        <button type="button" role="radio" aria-checked={!on} onClick={() => onChange(false)}
          className={`border-l px-2.5 py-1.5 ${!on ? "bg-destructive text-destructive-foreground" : "bg-background hover:bg-muted"}`}>{no}</button>
      </div>
    );
    const Rating = ({ value, onChange, labels }: { value: number; onChange: (v: 0 | 1 | 2) => void; labels: string[] }) => (
      <div className="grid grid-cols-3 gap-1 text-xs" role="radiogroup">
        {labels.map((l, v) => (
          <button key={l} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v as 0 | 1 | 2)}
            className={`rounded-md border px-2 py-1.5 ${value === v ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>{l}</button>
        ))}
      </div>
    );
    return (
      <Card className="mx-auto w-full max-w-2xl border-2 border-secondary/30">
        <CardHeader>
          <CardTitle className="text-xl">Teacher check: written expression</CardTitle>
          <CardDescription>
            The handwriting model has pre-marked the spelling where it could read the word. Please confirm or correct each item; this takes about a minute.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.keys(review.spelling).length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Spelling (dictated words)</h3>
              <div className="divide-y rounded-lg border">
                {all.map((d, i) => d.prompt.task !== "dictation" ? null : (
                  <div key={i} className="flex flex-wrap items-center gap-3 p-2">
                    <img src={d.imageData} alt={`Written word ${i + 1}`} className="h-16 w-16 rounded border bg-white object-contain" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium" lang={language.code}>{d.prompt.reference}</p>
                      <p className="text-xs text-muted-foreground">
                        {recognisedText[i] !== undefined ? `Model read: “${recognisedText[i] || "—"}”` : "Model could not read this script; please mark"}
                      </p>
                    </div>
                    <Toggle on={!!review.spelling[i]} yes="Correct" no="Misspelt"
                      onChange={(v) => setReview((r) => ({ ...r, spelling: { ...r.spelling, [i]: v } }))} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {review.sentence && sentenceIdx >= 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Dictated sentence</h3>
              <p className="text-xs text-muted-foreground" lang={language.code}>Expected: “{all[sentenceIdx].prompt.reference}”</p>
              <img src={all[sentenceIdx].imageData} alt="Written sentence" className="w-full rounded border bg-white" />
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  ...(language.code === "hi" ? [] : [["capital", "Starts with a capital letter"] as const]),
                  ["endPunctuation", language.code === "hi" ? "Ends with ।" : "Ends with a full stop"] as const,
                  ["allWords", "No words missing or added"] as const,
                  ["spelling", "All words spelled correctly"] as const,
                ]).map(([k, label]) => (
                  <div key={k} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2 text-sm">
                    <span>{label}</span>
                    <Toggle on={review.sentence![k]} yes="Yes" no="No"
                      onChange={(v) => setReview((r) => ({ ...r, sentence: { ...r.sentence!, [k]: v } }))} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {review.composition && compIdx >= 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Composition</h3>
              <p className="text-xs text-muted-foreground" lang={language.code}>Prompt: {all[compIdx].prompt.prompt}</p>
              <img src={all[compIdx].imageData} alt="Written composition" className="w-full rounded border bg-white" />
              <div className="space-y-1">
                <p className="text-sm">Clarity and organisation: can a reader follow the ideas?</p>
                <Rating value={review.composition.clarity} labels={["Unclear", "Partly clear", "Clear"]}
                  onChange={(v) => setReview((r) => ({ ...r, composition: { ...r.composition!, clarity: v } }))} />
              </div>
              <div className="space-y-1">
                <p className="text-sm">Grammar and punctuation for the grade</p>
                <Rating value={review.composition.grammar} labels={["Many errors", "Some errors", "Few or none"]}
                  onChange={(v) => setReview((r) => ({ ...r, composition: { ...r.composition!, grammar: v } }))} />
              </div>
            </section>
          )}

          <Button variant="hero" className="w-full" onClick={() => { const q = pendingRef.current; if (q) finalize(q.result, q.allResults, q.strokeCount, q.totalTimeMs, q.device); }}>
            <CheckCircle className="mr-2 h-4 w-4" />Confirm and see results
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === "results" && analysisResult) {
    const r = analysisResult;
    const level = finalRisk?.level ?? r.riskLevel;
    const riskStyles = {
      low: { ring: "bg-success/15", icon: "text-success", badge: "bg-success text-success-foreground" },
      moderate: { ring: "bg-warning/15", icon: "text-warning", badge: "bg-warning text-warning-foreground" },
      high: { ring: "bg-destructive/15", icon: "text-destructive", badge: "bg-destructive text-destructive-foreground" },
    }[level];
    const domains: { key: string; label: string; value: number | null; hint: string }[] = [
      { key: "legibility", label: "Legibility", value: r.domainScores.legibility, hint: "How readable and correct the writing is" },
      { key: "motor", label: "Pen control", value: r.domainScores.motorControl, hint: "Smooth, steady strokes" },
      { key: "fluency", label: "Writing fluency", value: r.domainScores.writingFluency, hint: "Speed, pauses and stop-start writing" },
      { key: "spatial", label: "Size & alignment", value: r.domainScores.spatialAwareness, hint: "Letters on the line, even size" },
    ];

    return (
      <Card className="mx-auto w-full max-w-2xl border-2 border-secondary/30">
        <CardHeader className="items-center text-center">
          <div className={`mb-2 flex h-16 w-16 items-center justify-center rounded-full ${riskStyles.ring}`}>
            {level === "low"
              ? <CheckCircle className={`h-8 w-8 ${riskStyles.icon}`} />
              : <AlertTriangle className={`h-8 w-8 ${riskStyles.icon}`} />}
          </div>
          <CardTitle className="text-2xl">Written Expression Screening Complete</CardTitle>
          <CardDescription>{studentName} • {studentGrade}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-6 text-center">
            <p className="text-5xl font-bold leading-none text-gradient-primary sm:text-6xl">{r.overallScore}</p>
            <p className="text-sm text-muted-foreground">Handwriting score (out of 100)</p>
            <Badge className={`mt-1 ${riskStyles.badge}`}>{level.toUpperCase()} RISK</Badge>
          </div>

          {dsm5Specifiers && (
            <Dsm5SpecifierList title="DSM-5: specific learning disorder with impairment in written expression" specifiers={dsm5Specifiers} />
          )}
          {finalRisk?.motorOnly && (
            <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              Handwriting was difficult but spelling, grammar and clarity were as expected. In DSM-5 terms a motor-only
              difficulty fits developmental coordination disorder better than a learning disorder; an occupational therapy check is the right next step.
            </p>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Handwriting domain scores</h3>
            {domains.map((d) => (
              <div key={d.key} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{d.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{d.hint}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums">{d.value === null ? "Not assessed" : `${d.value}%`}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={d.value ?? undefined} aria-label={d.label}>
                  {d.value !== null && (
                    <div
                      className={`h-full rounded-full ${d.value >= 75 ? "bg-success" : d.value >= 50 ? "bg-warning" : "bg-destructive"}`}
                      style={{ width: `${Math.max(2, d.value)}%` }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {r.drawings.some((d) => d.legibility !== undefined || d.legibilityNote) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">What was written</h3>
              <div className="divide-y rounded-lg border">
                {r.drawings.map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{d.type === "letter" || d.type === "word" ? d.reference : d.prompt || d.reference || d.type}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.recognised !== undefined ? `Read as: “${d.recognised || "—"}”` : d.legibilityNote || (d.type === "shape" ? "Shape accuracy" : "Not assessed")}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">{d.legibility !== undefined ? `${d.legibility}%` : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {r.notes.length > 0 && (
            <div className="space-y-1 rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-muted-foreground">
              {r.notes.map((n, i) => <p key={i}>{n}</p>)}
            </div>
          )}

          {(finalRisk?.flags ?? r.flaggedConditions).length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="mb-2 text-sm font-semibold">Areas to watch</p>
              <div className="flex flex-wrap gap-2">
                {(finalRisk?.flags ?? r.flaggedConditions).map((c, i) => (
                  <Badge key={i} variant="outline" className="border-destructive/50 text-xs text-destructive">{c}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-muted/30 p-4">
            <p className="mb-1 font-semibold">Summary</p>
            <p className="text-sm text-muted-foreground">{r.summary}</p>
          </div>

          {r.recommendations.length > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="mb-2 font-semibold">Recommendations</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {r.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
              </ul>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">This is a screening result, not a diagnosis.</p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
