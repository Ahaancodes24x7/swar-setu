import { useState, useCallback, useEffect, useRef } from "react";
import { useScribe } from "@elevenlabs/react";
import { getAIPrediction } from "@/api/ai";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTestPrompts } from "@/lib/testPrompts";
import { useTestSessions } from "@/hooks/useTestSessions";
import { generatePdfReport } from "@/lib/generatePdfReport";
import type { Tables } from "@/integrations/supabase/types";
import {
  Mic,
  Play,
  Square,
  Volume2,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Globe,
  Download,
  Save,
} from "lucide-react";

interface VoiceTestProps {
  studentName: string;
  studentGrade: string;
  studentId?: string;
  onComplete?: (results: TestResults) => void;
}

export interface TestResults {
  overallScore: number;
  phonemeErrorRate: number;
  pronunciationConsistency: number;
  prosodicScore: number;
  temporalScore: number;
  errorPatternDensity: number;
  flaggedConditions: string[];
  riskLevel: string;
  summary: string;
  recommendations: string[];
  transcription: string;
}

export function VoiceTest({ studentName, studentGrade, studentId, onComplete }: VoiceTestProps) {
  const { language } = useLanguage();
  const testPrompts = getTestPrompts(language.code);
  const { saveTestResults, loading: savingResults } = useTestSessions();
  
  const [testPhase, setTestPhase] = useState<"intro" | "testing" | "analyzing" | "results">("intro");
  const [currentTestType, setCurrentTestType] = useState<"reading" | "number" | "phoneme">("reading");
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [transcription, setTranscription] = useState("");
  const [fullTranscription, setFullTranscription] = useState("");
  const [results, setResults] = useState<TestResults | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    onPartialTranscript: (data) => {
      setTranscription(data.text);
    },
    onCommittedTranscript: (data) => {
      setFullTranscription((prev) => prev + " " + data.text);
      setTranscription("");
    },
  });

  const currentPrompts = testPrompts[currentTestType];
  const currentPrompt = currentPrompts[currentPromptIndex];

  const startRecording = useCallback(async () => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      
      if (error || !data?.token) {
        throw new Error(error?.message || "Failed to get transcription token");
      }

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setTestPhase("testing");
      setRecordingSeconds(0);
      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
      toast.success("Recording started! Read the text aloud clearly.");
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Failed to start recording. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  }, [scribe]);

  const stopRecording = useCallback(async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    await scribe.disconnect();
  }, [scribe]);

  const minRecordingTime = currentPrompt?.difficulty === 3 ? 8 : currentPrompt?.difficulty === 2 ? 5 : 3;
  const canAdvance = recordingSeconds >= minRecordingTime;

  const nextPrompt = useCallback(() => {
    if (!canAdvance) {
      toast.info(`Please record for at least ${minRecordingTime} seconds before moving on.`);
      return;
    }
    setRecordingSeconds(0);
    if (currentPromptIndex < currentPrompts.length - 1) {
      setCurrentPromptIndex((prev) => prev + 1);
      setTranscription("");
    } else {
      // Move to next test type or analyze
      if (currentTestType === "reading") {
        setCurrentTestType("number");
        setCurrentPromptIndex(0);
      } else if (currentTestType === "number") {
        setCurrentTestType("phoneme");
        setCurrentPromptIndex(0);
      } else {
        analyzeResults();
      }
    }
  }, [currentPromptIndex, currentPrompts.length, currentTestType]);

  const analyzeResults = async () => {
    setTestPhase("analyzing");
    await scribe.disconnect();

    try {
      const expectedTexts = [
        ...testPrompts.reading.map((p) => p.text),
        ...testPrompts.number.map((p) => p.text),
        ...testPrompts.phoneme.map((p) => p.text),
      ].join(" ");

      const { data, error } = await supabase.functions.invoke("analyze-voice", {
        body: {
          transcription: fullTranscription,
          expectedText: expectedTexts,
          testType: "reading",
          grade: studentGrade,
          language: language.elevenLabsCode,
        },
      });

      if (error) throw error;

      const analysisResults: TestResults = {
        ...data,
        transcription: fullTranscription,
      };

      setResults(analysisResults);
      setTestPhase("results");
      onComplete?.(analysisResults);

      // Call AI prediction API (non-blocking)
      const finalScore = analysisResults.overallScore;
      const percentage = analysisResults.overallScore;
      const answersArray = [];
      getAIPrediction({
        disorder_type: "dyslexia",
        score: finalScore,
        percentage: percentage,
        answers: answersArray || []
      }).then((aiResult) => {
        console.log("AI RESULT:", aiResult);
      }).catch((err) => {
        console.error("AI prediction error:", err);
      });
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error("Failed to analyze results. Please try again.");
      setTestPhase("testing");
    }
  };

  const resetTest = () => {
    setTestPhase("intro");
    setCurrentTestType("reading");
    setCurrentPromptIndex(0);
    setTranscription("");
    setFullTranscription("");
    setResults(null);
    setSavedSessionId(null);
  };

  const handleSaveResults = async () => {
    if (!results || !studentId) {
      toast.error("Missing student ID. Please try starting a new test from the dashboard.");
      return;
    }

    const { sessionId, error } = await saveTestResults(studentId, results, "voice");
    if (!error && sessionId) {
      setSavedSessionId(sessionId);
    }
  };

  const handleExportPdf = async () => {
    if (!results || !studentId) return;

    // Create student object for the report
    const student = {
      id: studentId,
      name: studentName,
      grade: studentGrade,
      status: "normal",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      teacher_id: null,
      parent_id: null,
      parent_email: null,
      total_points: 0,
      streak_days: 0,
    } as Tables<"students">;

    // Create session object for the report
    const session = {
      id: savedSessionId || "temp",
      student_id: studentId,
      conducted_by: null,
      test_type: "voice",
      status: "completed",
      overall_score: results.overallScore,
      reading_score: results.pronunciationConsistency,
      number_score: results.temporalScore,
      phoneme_score: 100 - results.phonemeErrorRate,
      flagged_conditions: results.flaggedConditions,
      analysis_report: {
        riskLevel: results.riskLevel,
        summary: results.summary,
        recommendations: results.recommendations,
      },
      audio_url: null,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    } as Tables<"test_sessions">;

    const analysis = {
      id: "temp",
      session_id: session.id,
      phoneme_error_rate: results.phonemeErrorRate,
      pronunciation_consistency: results.pronunciationConsistency,
      prosodic_score: results.prosodicScore,
      temporal_score: results.temporalScore,
      error_pattern_density: results.errorPatternDensity,
      transcription: results.transcription,
      phoneme_errors: null,
      detailed_metrics: null,
      created_at: new Date().toISOString(),
    } as Tables<"voice_analysis">;

    generatePdfReport({
      student,
      session,
      analysis,
      conductedBy: "Teacher",
    });
  };

  // Update audio level visualization
  useEffect(() => {
    if (scribe.isConnected) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 60 + 20);
      }, 200);
      return () => clearInterval(interval);
    } else {
      setAudioLevel(0);
    }
  }, [scribe.isConnected]);

  if (testPhase === "intro") {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-primary/20">
        <CardHeader className="text-center">
          <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
            <Mic className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Voice-Based Assessment</CardTitle>
          <CardDescription>
            Testing {studentName} • {studentGrade}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language indicator */}
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <Globe className="h-5 w-5 text-primary" />
            <span className="font-medium">Test Language: {language.native} ({language.name})</span>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">How it works:</h3>
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
                <span>Read the displayed text aloud clearly in {language.name}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
                <span>Complete reading, number, and phoneme exercises</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
                <span>AI analyzes speech patterns for SLD indicators</span>
              </li>
            </ol>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-secondary/10 border border-secondary/30">
              <p className="text-2xl font-bold text-secondary">{testPrompts.reading.length}</p>
              <p className="text-xs text-muted-foreground">Reading Tasks</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-accent/10 border border-accent/30">
              <p className="text-2xl font-bold text-accent">{testPrompts.number.length}</p>
              <p className="text-xs text-muted-foreground">Number Tasks</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-2xl font-bold text-primary">{testPrompts.phoneme.length}</p>
              <p className="text-xs text-muted-foreground">Phoneme Tasks</p>
            </div>
          </div>

          <Button 
            variant="hero" 
            size="xl" 
            className="w-full"
            onClick={startRecording}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Start Assessment
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (testPhase === "testing") {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {currentTestType === "reading" ? "📖 Reading" : currentTestType === "number" ? "🔢 Numbers" : "🔤 Phonemes"}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                {language.native}
              </Badge>
            </div>
            <span className="text-sm text-muted-foreground">
              {currentPromptIndex + 1} / {currentPrompts.length}
            </span>
          </div>
          <Progress 
            value={((currentPromptIndex + 1) / currentPrompts.length) * 100} 
            className="h-2 mt-2"
          />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Audio Level & Timer */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className={`h-4 w-4 rounded-full ${scribe.isConnected ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
            <div className="flex-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full gradient-primary transition-all duration-100"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
            </div>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Badge variant={canAdvance ? "default" : "outline"} className="ml-2 tabular-nums">
              🎙️ {recordingSeconds}s
            </Badge>
          </div>

          {/* Min time warning */}
          {!canAdvance && (
            <div className="text-center text-xs text-muted-foreground bg-muted/30 rounded p-2">
              ⏱️ Please speak for at least {minRecordingTime}s before moving to next prompt
            </div>
          )}

          {/* Prompt Display */}
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-2">Read aloud in {language.name}:</p>
            <p className="text-2xl font-medium leading-relaxed">
              "{currentPrompt.text}"
            </p>
            <div className="flex justify-center gap-1 mt-3">
              {Array.from({ length: currentPrompt.difficulty }).map((_, i) => (
                <span key={i} className="text-accent">⭐</span>
              ))}
            </div>
          </div>

          {/* Live Transcription */}
          <div className="bg-muted/30 rounded-lg p-4 min-h-[80px]">
            <p className="text-xs text-muted-foreground mb-1">What we hear:</p>
            <p className="text-lg">
              {fullTranscription.split(" ").slice(-10).join(" ")}
              <span className="text-primary">{transcription}</span>
              <span className="animate-pulse">|</span>
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={stopRecording}
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
            <Button 
              variant="hero" 
              className="flex-1"
              onClick={nextPrompt}
              disabled={!canAdvance}
            >
              {currentPromptIndex < currentPrompts.length - 1 || currentTestType !== "phoneme" ? "Next →" : "Finish & Analyze"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (testPhase === "analyzing") {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-primary/20">
        <CardContent className="py-16 text-center">
          <Loader2 className="h-16 w-16 mx-auto mb-6 text-primary animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Analyzing Speech Patterns</h2>
          <p className="text-muted-foreground">
            Our AI is analyzing phoneme accuracy, prosody, and temporal patterns in {language.name}...
          </p>
          <div className="flex justify-center gap-2 mt-6">
            <Badge variant="outline" className="animate-pulse">Phoneme Analysis</Badge>
            <Badge variant="outline" className="animate-pulse">Prosodic Features</Badge>
            <Badge variant="outline" className="animate-pulse">Error Patterns</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (testPhase === "results" && results) {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-primary/20">
        <CardHeader className="text-center">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            results.riskLevel === "low" ? "bg-success/20" : 
            results.riskLevel === "moderate" ? "bg-warning/20" : "bg-destructive/20"
          }`}>
            {results.riskLevel === "low" ? (
              <CheckCircle className="h-8 w-8 text-success" />
            ) : (
              <AlertTriangle className={`h-8 w-8 ${results.riskLevel === "moderate" ? "text-warning" : "text-destructive"}`} />
            )}
          </div>
          <CardTitle className="text-2xl">Assessment Complete</CardTitle>
          <CardDescription>{studentName} • {studentGrade} • {language.native}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Score */}
          <div className="text-center p-6 rounded-xl bg-muted/50">
            <p className="text-6xl font-bold text-gradient-primary">{results.overallScore}%</p>
            <p className="text-muted-foreground mt-2">Overall Score</p>
            <Badge 
              className={`mt-3 ${
                results.riskLevel === "low" ? "bg-success" : 
                results.riskLevel === "moderate" ? "bg-warning" : "bg-destructive"
              }`}
            >
              {results.riskLevel.toUpperCase()} RISK
            </Badge>
          </div>

          {/* Detailed Scores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
              <p className="text-sm text-muted-foreground">Phoneme Error Rate</p>
              <p className="text-2xl font-bold text-secondary">{results.phonemeErrorRate}%</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-sm text-muted-foreground">Pronunciation</p>
              <p className="text-2xl font-bold text-primary">{results.pronunciationConsistency}%</p>
            </div>
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
              <p className="text-sm text-muted-foreground">Prosodic Score</p>
              <p className="text-2xl font-bold text-accent">{results.prosodicScore}%</p>
            </div>
            <div className="p-4 rounded-lg bg-success/10 border border-success/30">
              <p className="text-sm text-muted-foreground">Temporal Score</p>
              <p className="text-2xl font-bold text-success">{results.temporalScore}%</p>
            </div>
          </div>

          {/* Flagged Conditions */}
          {results.flaggedConditions.length > 0 && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="font-semibold text-destructive mb-2">Flagged Indicators:</p>
              <div className="flex gap-2">
                {results.flaggedConditions.map((condition) => (
                  <Badge key={condition} variant="destructive">{condition}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These are indicators only, not diagnoses. Please consult a specialist.
              </p>
            </div>
          )}

          {/* Summary */}
          <div className="p-4 rounded-lg bg-muted/30">
            <p className="font-semibold mb-2">Analysis Summary:</p>
            <p className="text-sm text-muted-foreground">{results.summary}</p>
          </div>

          {/* Recommendations */}
          {results.recommendations.length > 0 && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="font-semibold mb-2">Recommendations:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {results.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={resetTest}>
                <RefreshCw className="h-4 w-4 mr-2" />
                New Test
              </Button>
              {studentId && (
                <Button 
                  variant="hero" 
                  className="flex-1"
                  onClick={handleSaveResults}
                  disabled={savingResults || !!savedSessionId}
                >
                  {savingResults ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : savedSessionId ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Results
                    </>
                  )}
                </Button>
              )}
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleExportPdf}
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF Report
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
