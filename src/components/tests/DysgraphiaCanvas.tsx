import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { getAIPrediction } from "@/api/ai";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { getDysgraphiaPrompts, type DysgraphiaPrompt } from "@/lib/ncertTestPrompts";
import { analyzeDysgraphia, type StrokeData, type DysgraphiaAnalysisResult } from "@/lib/dysgraphiaAnalysis";
import {
  Pencil,
  Play,
  RotateCcw,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Eraser,
} from "lucide-react";

interface DysgraphiaCanvasProps {
  studentName: string;
  studentGrade: string;
  studentId?: string;
  onComplete?: (results: any) => void;
}

interface DrawingResult {
  prompt: DysgraphiaPrompt;
  strokes: StrokeData[];
  imageData: string;
  canvasWidth: number;
  canvasHeight: number;
  totalTime: number;
}

export function DysgraphiaCanvas({ studentName, studentGrade, studentId, onComplete }: DysgraphiaCanvasProps) {
  const { language } = useLanguage();
  const gradeNum = parseInt(studentGrade.replace(/\D/g, '')) || 3;
  const prompts = getDysgraphiaPrompts(language.code, gradeNum);

  const [phase, setPhase] = useState<"intro" | "drawing" | "reviewing" | "results">("intro");
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [strokes, setStrokes] = useState<StrokeData[]>([]);
  const [currentStroke, setCurrentStroke] = useState<StrokeData | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingResults, setDrawingResults] = useState<DrawingResult[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<DysgraphiaAnalysisResult | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvasDimensions = useRef({ width: 0, height: 0 });

  const currentPrompt = prompts[currentPromptIndex];
  const progressPercent = ((currentPromptIndex + 1) / prompts.length) * 100;

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
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "drawing") return;
    const pos = getPointerPos(e);
    setIsDrawing(true);
    setCurrentStroke({ points: [{ ...pos, time: Date.now() }], width: 3 });
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || phase !== "drawing") return;
    const pos = getPointerPos(e);
    const ctx = ctxRef.current;
    if (ctx && currentStroke) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setCurrentStroke({
        ...currentStroke,
        points: [...currentStroke.points, { ...pos, time: Date.now() }],
      });
    }
  };

  const handlePointerUp = () => {
    if (currentStroke && currentStroke.points.length > 1) {
      setStrokes((prev) => [...prev, currentStroke]);
    }
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

    setDrawingResults((prev) => [...prev, result]);
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

  const runAnalysis = async () => {
    // Combine all strokes from all drawings
    const allStrokes = drawingResults.flatMap(r => r.strokes);
    const totalTimeMs = drawingResults.reduce((s, r) => s + r.totalTime, 0);
    const lastResult = drawingResults[drawingResults.length - 1];
    const cw = lastResult?.canvasWidth || 300;
    const ch = lastResult?.canvasHeight || 300;

    const result = analyzeDysgraphia(
      allStrokes,
      totalTimeMs,
      cw,
      ch,
      currentPrompt?.type || "letter",
      studentName,
      gradeNum
    );

    setAnalysisResult(result);
    setPhase("results");

    // Call AI prediction API (non-blocking)
    const finalScore = result.overallScore;
    const percentage = result.overallScore;
    const answersArray = [];
    getAIPrediction({
      disorder_type: "dysgraphia",
      score: finalScore,
      percentage: percentage,
      answers: answersArray || []
    }).then((aiResult) => {
      console.log("AI RESULT:", aiResult);
    }).catch((err) => {
      console.error("AI prediction error:", err);
    });

    // Pass full analysis to parent including per-drawing data
    onComplete?.({
      testType: "dysgraphia",
      overallScore: result.overallScore,
      riskLevel: result.riskLevel,
      flaggedConditions: result.flaggedConditions,
      summary: result.summary,
      recommendations: result.recommendations,
      domainScores: result.domainScores,
      metrics: result.metrics,
      subtestScores: [
        { id: "motorControl", accuracy: result.domainScores.motorControl, avgResponseTime: 0, errorCount: 0, hesitationCount: result.metrics.microTremorCount },
        { id: "writingFluency", accuracy: result.domainScores.writingFluency, avgResponseTime: 0, errorCount: 0, hesitationCount: result.metrics.hesitationCount },
        { id: "spatialAwareness", accuracy: result.domainScores.spatialAwareness, avgResponseTime: 0, errorCount: 0, hesitationCount: 0 },
        { id: "consistency", accuracy: result.domainScores.consistency, avgResponseTime: 0, errorCount: 0, hesitationCount: 0 },
      ],
      answeredQuestions: drawingResults.map((dr, i) => ({
        question: dr.prompt.prompt,
        answer: `Drawing ${i + 1} (${dr.strokes.length} strokes)`,
        correct: true,
        subtest: dr.prompt.type,
        responseTime: dr.totalTime / 1000,
      })),
    });
  };

  // ---- RENDER PHASES ----

  if (phase === "intro") {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-secondary/30">
        <CardHeader className="text-center">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Pencil className="h-8 w-8 text-secondary-foreground" />
          </div>
          <CardTitle className="text-2xl">Dysgraphia Drawing Test</CardTitle>
          <CardDescription>{studentName} • {studentGrade}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Draw the prompted letters, words, or shapes</li>
              <li>• Use your finger, stylus, or mouse</li>
              <li>• Write naturally — we analyze motor patterns</li>
              <li>• Tap "Clear" to start over if needed</li>
            </ul>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-sm">🧠 What We Measure:</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>✓ Stroke smoothness & tremor</span>
              <span>✓ Writing speed consistency</span>
              <span>✓ Spatial organization</span>
              <span>✓ Stroke precision</span>
              <span>✓ Hesitation patterns</span>
              <span>✓ Letter size consistency</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-3 rounded-lg bg-primary/10">
              <p className="text-xl font-bold">{prompts.filter(p => p.type === "letter").length}</p>
              <p className="text-xs text-muted-foreground">Letters</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/10">
              <p className="text-xl font-bold">{prompts.filter(p => p.type === "word").length}</p>
              <p className="text-xs text-muted-foreground">Words</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-accent/10">
              <p className="text-xl font-bold">{prompts.filter(p => p.type === "shape").length}</p>
              <p className="text-xs text-muted-foreground">Shapes</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-success/10">
              <p className="text-xl font-bold">{prompts.filter(p => p.type === "figure").length}</p>
              <p className="text-xs text-muted-foreground">Figures</p>
            </div>
          </div>

          <Button variant="hero" size="xl" className="w-full" onClick={startDrawing}>
            <Play className="h-5 w-5 mr-2" />
            Start Drawing Test
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
            <Badge variant="outline">{currentPrompt.type.toUpperCase()}</Badge>
            <span className="text-sm text-muted-foreground">
              {currentPromptIndex + 1} / {prompts.length}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <p className="text-lg font-medium">{currentPrompt.prompt}</p>
            {currentPrompt.reference && (
              <p className="text-3xl font-bold mt-2 text-primary">{currentPrompt.reference}</p>
            )}
          </div>

          <div className="relative border-2 border-border rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              className="w-full aspect-square touch-none cursor-crosshair"
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
          <CardTitle>Drawing Saved</CardTitle>
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
              <p className="font-bold">{lastResult.prompt.type}</p>
              <p className="text-xs text-muted-foreground">Type</p>
            </div>
          </div>

          <Button variant="hero" className="w-full" onClick={nextPrompt}>
            {currentPromptIndex < prompts.length - 1 ? (
              <>Next Drawing <ArrowRight className="h-4 w-4 ml-2" /></>
            ) : (
              <>Finish & Analyze <CheckCircle className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === "results" && analysisResult) {
    const r = analysisResult;

    return (
      <Card className="max-w-2xl mx-auto border-2 border-secondary/30">
        <CardHeader className="text-center">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            r.riskLevel === "low" ? "bg-success/20" : 
            r.riskLevel === "moderate" ? "bg-warning/20" : "bg-destructive/20"
          }`}>
            {r.riskLevel === "low" ? (
              <CheckCircle className="h-8 w-8 text-success" />
            ) : (
              <AlertTriangle className={`h-8 w-8 ${r.riskLevel === "moderate" ? "text-warning" : "text-destructive"}`} />
            )}
          </div>
          <CardTitle className="text-2xl">Dysgraphia Screening Complete</CardTitle>
          <CardDescription>{studentName} • {studentGrade}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-6 rounded-xl bg-muted/50">
            <p className="text-6xl font-bold text-gradient-primary">{r.overallScore}%</p>
            <p className="text-muted-foreground mt-2">Writing Fluency Score</p>
            <Badge className={`mt-3 ${
              r.riskLevel === "low" ? "bg-success" : 
              r.riskLevel === "moderate" ? "bg-warning" : "bg-destructive"
            }`}>
              {r.riskLevel.toUpperCase()} RISK
            </Badge>
          </div>

          {/* Domain Scores */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Domain Analysis</h3>
            {Object.entries(r.domainScores).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                  <span className="text-sm font-bold">{value}%</span>
                </div>
                <Progress value={value} className="h-2" />
              </div>
            ))}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-primary/10 text-center">
              <p className="text-xl font-bold">{r.metrics.strokeSmoothness}%</p>
              <p className="text-xs text-muted-foreground">Smoothness</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/10 text-center">
              <p className="text-xl font-bold">{r.metrics.microTremorCount}</p>
              <p className="text-xs text-muted-foreground">Micro-Tremors</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/10 text-center">
              <p className="text-xl font-bold">{r.metrics.hesitationCount}</p>
              <p className="text-xs text-muted-foreground">Hesitations</p>
            </div>
          </div>

          {/* Flagged Conditions */}
          {r.flaggedConditions.length > 0 && (
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <p className="font-semibold mb-2 text-sm">⚠ Flagged Conditions</p>
              <div className="flex flex-wrap gap-2">
                {r.flaggedConditions.map((c, i) => (
                  <Badge key={i} variant="outline" className="border-destructive/50 text-destructive text-xs">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="p-4 rounded-lg bg-muted/30">
            <p className="font-semibold mb-2">Summary:</p>
            <p className="text-sm text-muted-foreground">{r.summary}</p>
          </div>

          {/* Recommendations */}
          {r.recommendations.length > 0 && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="font-semibold mb-2">📋 Recommendations:</p>
              <ul className="space-y-1">
                {r.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
