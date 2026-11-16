import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { getAIPrediction, type AssessmentPayload } from "@/api/ai";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getTestData,
  getQuestionsByGrade,
  ITEM_BANK_VERSION,
  type TestMetrics,
  type ErrorPattern,
  type TestQuestion,
  type WorkingMemoryQuestion,
} from "@/lib/dsm5TestData";
import { TestQuestion as TestQuestionComponent } from "./dsm5/TestQuestion";
import { WorkingMemoryTest } from "./dsm5/WorkingMemoryTest";
import { OralReadingFluency } from "./dsm5/OralReadingFluency";
import { Dsm5SpecifierList, type Dsm5Specifier } from "./dsm5/Dsm5SpecifierList";
import type { ReadingFluencyResult } from "@/lib/dsm5Fluency";
import {
  Brain,
  Play,
  CheckCircle,
  AlertTriangle,
  Loader2,
  BookOpen,
  Eye,
  Ear,
  MessageSquare,
  Globe,
} from "lucide-react";

interface DSM5DyslexiaTestProps {
  studentName: string;
  studentGrade: string;
  studentId?: string;
  onComplete?: (results: any) => void;
}

type TestPhase = "intro" | "testing" | "fluency" | "analyzing" | "results";

interface SubTest {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  questions: TestQuestion[];
}

interface AnsweredQuestion {
  question: string;
  answer: string;
  correct: boolean;
  subtest: string;
  responseTime: number;
}

export function DSM5DyslexiaTest({
  studentName,
  studentGrade,
  studentId,
  onComplete,
}: DSM5DyslexiaTestProps) {
  const { language } = useLanguage();
  const gradeNum = parseInt(studentGrade.replace(/\D/g, '')) || 3;
  
  const testData = getTestData(language.code);
  
  const subTests: SubTest[] = [
    {
      id: 'phonological',
      name: 'Phonological Awareness',
      icon: <Ear className="h-5 w-5" />,
      description: 'Sound manipulation and recognition',
      questions: getQuestionsByGrade(testData.dyslexia.phonologicalAwareness, gradeNum),
    },
    {
      id: 'pseudoword',
      name: 'Pseudoword Decoding',
      icon: <BookOpen className="h-5 w-5" />,
      description: 'Reading non-real words',
      questions: getQuestionsByGrade(testData.dyslexia.pseudowordDecoding, gradeNum),
    },
    {
      id: 'visual',
      name: 'Visual Word Confusion',
      icon: <Eye className="h-5 w-5" />,
      description: 'Letter reversal detection',
      questions: getQuestionsByGrade(testData.dyslexia.visualConfusion, gradeNum),
    },
    {
      id: 'comprehension',
      name: 'Reading Comprehension',
      icon: <MessageSquare className="h-5 w-5" />,
      description: 'Understanding short passages',
      questions: getQuestionsByGrade(testData.dyslexia.readingComprehension, gradeNum),
    },
    {
      id: 'memory',
      name: 'Verbal Working Memory',
      icon: <Brain className="h-5 w-5" />,
      description: 'Sequence recall tasks',
      questions: getQuestionsByGrade(testData.dyslexia.verbalWorkingMemory, gradeNum),
    },
  ];

  const [testPhase, setTestPhase] = useState<TestPhase>("intro");
  const [currentSubTestIndex, setCurrentSubTestIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [results, setResults] = useState<any>(null);
  
  // Use REFS for index & metrics tracking so progression & analyzeResults never hit stale closure bugs
  const currentSubTestIndexRef = useRef(0);
  const currentQuestionIndexRef = useRef(0);
  currentSubTestIndexRef.current = currentSubTestIndex;
  currentQuestionIndexRef.current = currentQuestionIndex;

  const metricsRef = useRef<Record<string, TestMetrics>>({});
  const errorPatternsRef = useRef<ErrorPattern[]>([]);
  const answeredQuestionsRef = useRef<AnsweredQuestion[]>([]);

  const currentSubTest = subTests[currentSubTestIndex] || subTests[0];
  const currentQuestion = currentSubTest?.questions?.[currentQuestionIndex] || currentSubTest?.questions?.[0];

  const totalQuestions = subTests.reduce((sum, st) => sum + (st.questions?.length || 0), 0);
  const completedQuestions = subTests
    .slice(0, currentSubTestIndex)
    .reduce((sum, st) => sum + (st.questions?.length || 0), 0) + currentQuestionIndex;
  const overallProgress = totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0;

  // handleAnswer is declared before analyzeResults; call it through a ref to avoid a
  // use-before-declaration error in the dependency array (it threw on every render)
  const analyzeResultsRef = useRef<() => void>(() => {});

  const handleAnswer = useCallback((
    answer: string,
    responseTime: number,
    isCorrect: boolean,
    errorPattern?: ErrorPattern
  ) => {
    const activeSubTestIdx = currentSubTestIndexRef.current;
    const activeQIdx = currentQuestionIndexRef.current;
    const activeSubTest = subTests[activeSubTestIdx] || subTests[0];
    const activeQuestion = activeSubTest?.questions?.[activeQIdx];

    const subtestId = activeSubTest.id;

    // Track the answered question
    answeredQuestionsRef.current.push({
      question: activeQuestion?.instruction || activeQuestion?.stimulus?.toString() || '',
      answer,
      correct: isCorrect,
      subtest: activeSubTest.name,
      responseTime,
    });

    // Update metrics ref synchronously
    const existing = metricsRef.current[subtestId] || {
      accuracy: 0,
      responseTime: 0,
      errorPatterns: [],
      hesitationCount: 0,
      correctCount: 0,
      totalQuestions: 0,
    };

    const newTotal = existing.totalQuestions + 1;
    const newCorrect = existing.correctCount + (isCorrect ? 1 : 0);
    const newHesitation = existing.hesitationCount + (responseTime > (activeQuestion?.timeLimit || 30) * 0.8 ? 1 : 0);

    metricsRef.current[subtestId] = {
      accuracy: (newCorrect / newTotal) * 100,
      responseTime: (existing.responseTime * existing.totalQuestions + responseTime) / newTotal,
      errorPatterns: errorPattern ? [...existing.errorPatterns, errorPattern] : existing.errorPatterns,
      hesitationCount: newHesitation,
      correctCount: newCorrect,
      totalQuestions: newTotal,
    };

    if (errorPattern) {
      errorPatternsRef.current.push(errorPattern);
    }

    // Move to next question or subtest with exact ref values
    setTimeout(() => {
      const curSubIdx = currentSubTestIndexRef.current;
      const curQIdx = currentQuestionIndexRef.current;
      const curSub = subTests[curSubIdx];
      const questionsCount = curSub?.questions?.length || 0;

      console.log(`Answer submitted. QIdx: ${curQIdx}/${questionsCount}, SubTest: ${curSubIdx + 1}/${subTests.length}`);

      if (curQIdx < questionsCount - 1) {
        console.log("Advancing to next question");
        setCurrentQuestionIndex(curQIdx + 1);
      } else if (curSubIdx < subTests.length - 1) {
        console.log("Advancing to next subtest");
        setCurrentSubTestIndex(curSubIdx + 1);
        setCurrentQuestionIndex(0);
      } else {
        // last DSM-5 specifier subtest: oral reading fluency (word reading accuracy, reading rate)
        setTestPhase("fluency");
      }
    }, 400);
  }, [subTests]);

  const taskStartTimeRef = useRef<number>(Date.now());
  const fluencyRef = useRef<ReadingFluencyResult | null>(null);
  const selfCorrectionCountRef = useRef<number>(0);

  const computeAttentionScore = (responseTimes: number[]): number => {
    if (responseTimes.length < 3) return 0.5;
    const mean = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    if (mean <= 0) return 0.5;
    const variance = responseTimes.reduce((acc, t) => acc + Math.pow(t - mean, 2), 0) / responseTimes.length;
    const cv = Math.sqrt(variance) / mean;
    return Math.max(0.0, Math.min(1.0, 1.0 - cv));
  };

  const computeErrorRecovery = (answered: AnsweredQuestion[]): number => {
    let errorIndices: number[] = [];
    answered.forEach((item, idx) => {
      if (!item.correct) errorIndices.push(idx);
    });
    if (errorIndices.length === 0) return 1.0;
    let recoveries = 0;
    for (const errIdx of errorIndices) {
      if (errIdx + 1 < answered.length && answered[errIdx + 1].correct) {
        recoveries++;
      }
    }
    return recoveries / errorIndices.length;
  };

  const analyzeResults = useCallback(() => {
    console.log("analyzeResults called");
    setTestPhase("analyzing");
    
    // Use a small delay to ensure state updates
    setTimeout(async () => {
      // Read from REFS (always current, no stale closure)
      const currentMetrics = metricsRef.current;
      const allErrors = errorPatternsRef.current;
      const allAnswers = answeredQuestionsRef.current;
      const taskEndTime = Date.now();
      const elapsedSeconds = Math.max(1, (taskEndTime - taskStartTimeRef.current) / 1000);

      console.log("Metrics:", currentMetrics);
      console.log("Errors count:", allErrors.length);
      console.log("Answers count:", allAnswers.length);

      try {
        const subtestScores = Object.entries(currentMetrics).map(([id, m]) => ({
          id,
          accuracy: m.accuracy,
          avgResponseTime: m.responseTime,
          errorCount: m.errorPatterns.length,
          hesitationCount: m.hesitationCount,
        }));
        
        const overallAccuracy = subtestScores.length > 0
          ? subtestScores.reduce((sum, s) => sum + s.accuracy, 0) / subtestScores.length
          : 0;
      
      const errorTypeCounts: Record<string, number> = {};
      allErrors.forEach((e) => {
        errorTypeCounts[e.type] = (errorTypeCounts[e.type] || 0) + 1;
      });

      // Reading rate comes from the timed oral reading passage (words correct per minute);
      // if that subtest was skipped the rate is left out and treated as missing by the model.
      const fluency = fluencyRef.current;

      const phonemeQs = allAnswers.filter(a => a.subtest.toLowerCase().includes('phonol'));
      const phonemeErrorCount = phonemeQs.filter(a => !a.correct).length;
      const totalPhonemeItems = Math.max(1, phonemeQs.length);

      const letterConfQs = allAnswers.filter(a => a.subtest.toLowerCase().includes('visual'));
      const letterConfusionCount = letterConfQs.filter(a => !a.correct).length;
      const totalLetterItems = Math.max(1, letterConfQs.length);

      const responseTimeArray = allAnswers.map(a => a.responseTime * 1000); // convert seconds to ms
      const correctCount = allAnswers.filter(a => a.correct).length;
      const totalErrors = allAnswers.length - correctCount;
      
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      const flaggedConditions: string[] = [];
      
      if ((currentMetrics.phonological?.accuracy ?? 100) < 70 || (currentMetrics.pseudoword?.accuracy ?? 100) < 70) {
        riskLevel = 'moderate';
        flaggedConditions.push('Word Reading Accuracy Deficit');
      }
      
      if ((currentMetrics.visual?.accuracy ?? 100) < 60) {
        if (riskLevel === 'moderate') riskLevel = 'high';
        else riskLevel = 'moderate';
        flaggedConditions.push('Visual Processing Difficulty');
      }
      
      if ((errorTypeCounts.reversal || 0) >= 2) {
        flaggedConditions.push('Letter/Word Reversals');
        riskLevel = riskLevel === 'low' ? 'moderate' : 'high';
      }
      
      if ((currentMetrics.memory?.accuracy ?? 100) < 60) {
        flaggedConditions.push('Verbal Working Memory Deficit');
      }
      
      if ((currentMetrics.comprehension?.accuracy ?? 100) < 70) {
        flaggedConditions.push('Reading Comprehension Difficulty');
      }

      if (fluency?.belowExpected) {
        flaggedConditions.push(fluency.accuracy < 0.9 ? 'Inaccurate Oral Reading' : 'Slow Reading Rate');
        riskLevel = riskLevel === 'low' ? 'moderate' : 'high';
      }

      // DSM-5 specifiers for "with impairment in reading"
      const decodingAcc = Math.min(currentMetrics.phonological?.accuracy ?? 100, currentMetrics.pseudoword?.accuracy ?? 100);
      const dsm5Specifiers: Dsm5Specifier[] = [
        {
          name: 'Word reading accuracy',
          status: decodingAcc < 70 || (fluency ? fluency.accuracy < 0.9 : false) ? 'below' : 'expected',
          evidence: `Decoding ${Math.round(decodingAcc)}%` + (fluency ? `, passage word accuracy ${Math.round(fluency.accuracy * 100)}%` : ''),
        },
        fluency
          ? {
              name: 'Reading rate or fluency',
              status: fluency.wcpm < fluency.norm.p25 && fluency.passageId.includes('-en-') ? 'below' : 'expected',
              evidence: `${fluency.wcpm} words correct per minute` + (fluency.passageId.includes('-en-') ? ` (25th percentile ${fluency.norm.p25})` : ' (no Hindi norm; judged by the age-normed model)'),
            }
          : { name: 'Reading rate or fluency', status: 'not_measured', evidence: 'Oral reading subtest skipped' },
        {
          name: 'Reading comprehension',
          status: (currentMetrics.comprehension?.accuracy ?? 100) < 70 ? 'below' : 'expected',
          evidence: `${Math.round(currentMetrics.comprehension?.accuracy ?? 0)}% of comprehension questions`,
        },
      ];

      const analysisResult = {
        testType: 'dyslexia',
        overallScore: Math.round(isNaN(overallAccuracy) ? 0 : overallAccuracy),
        riskLevel,
        flaggedConditions,
        subtestScores,
        errorPatterns: allErrors,
        errorTypeCounts,
        phonemeErrorRate: 100 - (currentMetrics.phonological?.accuracy || 0),
        pronunciationConsistency: currentMetrics.pseudoword?.accuracy || 0,
        answeredQuestions: allAnswers,
        readingFluency: fluency,
        dsm5Specifiers,
        summary: generateSummary(overallAccuracy, riskLevel, flaggedConditions),
        recommendations: generateRecommendations(riskLevel, flaggedConditions, errorTypeCounts),
      };

      // Construct standard AI games payload
      const gamesPayload: Record<string, Record<string, unknown>> = {};
      if (fluency) {
        // first game carrying `wpm` is the one the feature extractor reads
        gamesPayload.oral_reading = {
          wpm: fluency.wcpm,
          words_read: fluency.wordsAttempted,
          words_correct: fluency.wordsCorrect,
          time_seconds: fluency.seconds,
          accuracy: Number(fluency.accuracy.toFixed(4)),
          method: fluency.method,
        };
      }
      gamesPayload.reading_fluency = {
          accuracy: Number((overallAccuracy / 100).toFixed(4)),
          phoneme_errors: phonemeErrorCount,
          total_phonemes: totalPhonemeItems,
          letter_confusions: letterConfusionCount,
          letter_items: totalLetterItems,
          pseudoword_accuracy: Number(((currentMetrics.pseudoword?.accuracy ?? 70) / 100).toFixed(4)),
          response_times: responseTimeArray,
          first_response_ms: responseTimeArray[0] || 1200,
          self_corrections: selfCorrectionCountRef.current,
          total_errors: totalErrors,
          phonological_score: Number(((currentMetrics.phonological?.accuracy ?? 70) / 100).toFixed(4)),
          memory_score: Number(((currentMetrics.memory?.accuracy ?? 70) / 100).toFixed(4)),
          attention_score: Number(computeAttentionScore(responseTimeArray).toFixed(4)),
          error_recovery: Number(computeErrorRecovery(allAnswers).toFixed(4)),
          comprehension_score: Number(((currentMetrics.comprehension?.accuracy ?? 70) / 100).toFixed(4))
      };

      const aiPayload: AssessmentPayload = {
        disorder_type: "dyslexia",
        student_id: studentId || "guest_student",
        grade: gradeNum,
        item_bank: ITEM_BANK_VERSION,
        score: analysisResult.overallScore,
        percentage: analysisResult.overallScore,
        games: gamesPayload,
        timing_data: {
          start_time: new Date(taskStartTimeRef.current).toISOString(),
          end_time: new Date(taskEndTime).toISOString(),
          total_duration_seconds: elapsedSeconds
        }
      };
      const completed = { ...analysisResult, aiPayload };
      setResults(completed);
      setTestPhase("results");
      if (onComplete) {
        // the host (teacher dashboard) runs the screening model once and shows its result
        onComplete(completed);
      } else {
        getAIPrediction(aiPayload).catch((err) => console.error("AI prediction error:", err));
      }
      } catch (error) {
        console.error("Analysis failed with error:", error);
        console.error("Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        toast.error(`Failed to analyze results: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setTestPhase("intro");
      }
    }, 0);
  }, [onComplete]);
  analyzeResultsRef.current = analyzeResults;

  const generateSummary = (accuracy: number, risk: string, conditions: string[]): string => {
    const safeAccuracy = isNaN(accuracy) ? 0 : accuracy;
    if (risk === 'low') {
      return `${studentName} performed well across all dyslexia screening domains with ${Math.round(safeAccuracy)}% overall accuracy. No significant indicators of reading difficulties were detected.`;
    } else if (risk === 'moderate') {
      return `${studentName} showed some difficulty in reading-related tasks (${Math.round(safeAccuracy)}% accuracy). ${conditions.slice(0, 2).join(' and ')} were noted. Further monitoring is recommended.`;
    } else {
      return `${studentName} displayed significant challenges in multiple reading domains (${Math.round(safeAccuracy)}% accuracy). Indicators include ${conditions.join(', ')}. A comprehensive evaluation by a specialist is strongly recommended.`;
    }
  };

  const generateRecommendations = (
    risk: string,
    conditions: string[],
    errorTypes: Record<string, number>
  ): string[] => {
    const recs: string[] = [];
    
    if (conditions.includes('Word Reading Accuracy Deficit')) {
      recs.push('Practice phonics-based reading activities daily');
      recs.push('Use multi-sensory learning approaches (visual, auditory, kinesthetic)');
    }
    
    if (conditions.includes('Visual Processing Difficulty') || (errorTypes.reversal || 0) > 0) {
      recs.push('Practice letter discrimination exercises (b/d, p/q differentiation)');
      recs.push('Use colored overlays or larger fonts for reading materials');
    }
    
    if (conditions.includes('Verbal Working Memory Deficit')) {
      recs.push('Break instructions into smaller steps');
      recs.push('Practice memory games with sequences');
    }
    
    if (risk === 'high') {
      recs.push('Consult with a learning disability specialist for comprehensive assessment');
      recs.push('Consider educational accommodations such as extended time');
    }
    
    return recs.length > 0 ? recs : ['Continue regular reading practice', 'Monitor progress over time'];
  };

  // Render intro screen
  if (testPhase === "intro") {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-primary/20">
        <CardHeader className="text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">DSM-5 Dyslexia Screening</CardTitle>
          <CardDescription>
            {studentName} • {studentGrade}
          </CardDescription>
          <Badge variant="outline" className="mx-auto mt-2">Aligned with DSM-5 reading specifiers • Screening</Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <Globe className="h-5 w-5 text-primary" />
            <span className="font-medium">Language: {language.native} ({language.name})</span>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">This assessment includes:</h3>
            <div className="space-y-2">
              {[...subTests, { id: 'fluency', name: 'Oral Reading Fluency', icon: <BookOpen className="h-5 w-5" />, description: 'One minute of reading aloud (words correct per minute)' }].map((st, idx) => (
                <div key={st.id} className="flex items-center gap-3 text-sm">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="flex items-center gap-2">
                    {st.icon}
                    <strong>{st.name}</strong> - {st.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-lg bg-secondary/10 border border-secondary/30">
              <p className="text-2xl font-bold text-secondary">{subTests.length + 1}</p>
              <p className="text-xs text-muted-foreground">Subtests</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-2xl font-bold text-primary">{totalQuestions}</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </div>
          </div>

          <Button 
            variant="hero" 
            size="xl" 
            className="w-full"
            onClick={() => setTestPhase("testing")}
          >
            <Play className="h-5 w-5 mr-2" />
            Start Assessment
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Render testing phase
  if (testPhase === "testing" && currentQuestion) {
    if (currentSubTest.id === 'memory') {
      return (
        <div className="space-y-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="flex items-center gap-2">
                {currentSubTest.icon}
                {currentSubTest.name}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Subtest {currentSubTestIndex + 1} of {subTests.length}
              </span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
          
          <WorkingMemoryTest
            question={currentQuestion as WorkingMemoryQuestion}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={currentSubTest.questions.length}
            onAnswer={handleAnswer}
          />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="flex items-center gap-2">
              {currentSubTest.icon}
              {currentSubTest.name}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Subtest {currentSubTestIndex + 1} of {subTests.length}
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
        
        <TestQuestionComponent
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={currentSubTest.questions.length}
          onAnswer={handleAnswer}
        />
      </div>
    );
  }

  if (testPhase === "fluency") {
    return (
      <div className="space-y-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="flex items-center gap-2"><BookOpen className="h-4 w-4" />Oral Reading Fluency</Badge>
            <span className="text-sm text-muted-foreground">Final subtest</span>
          </div>
          <Progress value={100} className="h-2" />
        </div>
        <OralReadingFluency
          lang={language.code}
          grade={gradeNum}
          onComplete={(r) => { fluencyRef.current = r; analyzeResultsRef.current(); }}
        />
      </div>
    );
  }

  // Render analyzing phase
  if (testPhase === "analyzing") {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-primary/20">
        <CardContent className="py-16 text-center">
          <Loader2 className="h-16 w-16 mx-auto mb-6 text-primary animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Analyzing Responses</h2>
          <p className="text-muted-foreground">
            Evaluating reading and language processing patterns...
          </p>
          <div className="flex justify-center gap-2 mt-6">
            <Badge variant="outline" className="animate-pulse">Phonological Analysis</Badge>
            <Badge variant="outline" className="animate-pulse">Error Patterns</Badge>
            <Badge variant="outline" className="animate-pulse">DSM-5 Criteria</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render results
  if (testPhase === "results" && results) {
    return (
      <Card className="max-w-3xl mx-auto border-2 border-primary/20">
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
          <CardTitle className="text-2xl">Dyslexia Screening Complete</CardTitle>
          <CardDescription>{studentName} • {studentGrade}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-6 rounded-xl bg-muted/50">
            <p className="text-6xl font-bold text-gradient-primary">{results.overallScore}%</p>
            <p className="text-muted-foreground mt-2">Overall Accuracy</p>
            <Badge className={`mt-3 ${
              results.riskLevel === "low" ? "bg-success" : 
              results.riskLevel === "moderate" ? "bg-warning" : "bg-destructive"
            }`}>
              {results.riskLevel.toUpperCase()} RISK
            </Badge>
          </div>

          {/* Subtest breakdown */}
          <div className="space-y-2">
            <h4 className="font-semibold">Subtest Scores:</h4>
            {results.subtestScores.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                <span className="capitalize">{s.id.replace(/([A-Z])/g, ' $1')}</span>
                <span className={`font-medium ${s.accuracy >= 70 ? 'text-success' : s.accuracy >= 50 ? 'text-warning' : 'text-destructive'}`}>
                  {Math.round(s.accuracy)}%
                </span>
              </div>
            ))}
          </div>

          {results.dsm5Specifiers && (
            <Dsm5SpecifierList title="DSM-5: specific learning disorder with impairment in reading" specifiers={results.dsm5Specifiers} />
          )}

          {results.flaggedConditions?.length > 0 && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="font-semibold text-destructive mb-2">Flagged Indicators:</p>
              <div className="flex gap-2 flex-wrap">
                {results.flaggedConditions.map((c: string) => (
                  <Badge key={c} variant="destructive">{c}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Detailed AI Analysis Section */}
          <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Detailed Analysis Report
            </h4>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-sm mb-1">Assessment Summary:</p>
                <p className="text-sm text-muted-foreground">{results.summary}</p>
              </div>
              
              <div>
                <p className="font-medium text-sm mb-2">Testing Criteria & DSM-5 Alignment:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                  <li>Phonological awareness: Ability to identify and manipulate sounds in language</li>
                  <li>Pseudoword decoding: Reading non-real words to test pure decoding skill</li>
                  <li>Visual processing: Letter/word reversal detection (b/d, p/q confusion)</li>
                  <li>Reading comprehension: Understanding meaning from short passages</li>
                  <li>Working memory: Verbal sequence recall (digit/letter spans)</li>
                  <li>Oral reading fluency: Words read correctly per minute from a grade-level passage (DSM-5 reading rate and accuracy)</li>
                </ul>
              </div>

              {/* Question-by-Question Breakdown */}
              {results.answeredQuestions?.length > 0 && (
                <div>
                  <details className="group rounded-lg border bg-background/60">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium">
                    <span>Question-by-Question Results</span>
                    <span className="shrink-0 whitespace-nowrap text-xs font-normal text-muted-foreground">
                      {results.answeredQuestions.filter((q: AnsweredQuestion) => q.correct).length} of {results.answeredQuestions.length} correct
                      <span className="ml-2 inline-block transition-transform group-open:rotate-180" aria-hidden="true">▾</span>
                    </span>
                  </summary>
                  <div className="space-y-2 border-t p-3">
                    {results.answeredQuestions.map((q: AnsweredQuestion, i: number) => (
                      <div key={i} className={`p-2 rounded text-xs border ${q.correct ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                          <Badge variant="outline" className="text-[10px]">{q.subtest}</Badge>
                          <span className={`shrink-0 ${q.correct ? 'text-success' : 'text-destructive'}`}>
                            {q.correct ? '✓ Correct' : '✗ Incorrect'} ({q.responseTime.toFixed(1)}s)
                          </span>
                        </div>
                        <p className="text-muted-foreground"><strong>Q:</strong> {q.question}</p>
                        <p className="text-foreground"><strong>A:</strong> {q.answer}</p>
                      </div>
                    ))}
                  </div>
                  </details>
                </div>
              )}
            </div>
          </div>


          {results.recommendations?.length > 0 && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <p className="font-semibold mb-2">Recommendations:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                {results.recommendations.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
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
