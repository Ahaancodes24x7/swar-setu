import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { getAIPrediction } from "@/api/ai";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getTestData,
  getQuestionsByGrade,
  type TestMetrics,
  type ErrorPattern,
  type TestQuestion,
  type DotClusterQuestion,
} from "@/lib/dsm5TestData";
import { TestQuestion as TestQuestionComponent } from "./dsm5/TestQuestion";
import { DotClusterStimulus } from "./dsm5/DotClusterStimulus";
import {
  Calculator,
  Play,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Hash,
  Circle,
  Brain,
  Link2,
  ListOrdered,
  Globe,
} from "lucide-react";

interface DSM5DyscalculiaTestProps {
  studentName: string;
  studentGrade: string;
  studentId?: string;
  onComplete?: (results: any) => void;
}

type TestPhase = "intro" | "testing" | "analyzing" | "results";

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

export function DSM5DyscalculiaTest({
  studentName,
  studentGrade,
  studentId,
  onComplete,
}: DSM5DyscalculiaTestProps) {
  const { language } = useLanguage();
  const gradeNum = parseInt(studentGrade.replace(/\D/g, '')) || 3;
  
  const testData = getTestData(language.code);
  
  const subTests: SubTest[] = [
    {
      id: 'magnitude',
      name: 'Number Sense & Magnitude',
      icon: <Hash className="h-5 w-5" />,
      description: 'Comparing and placing numbers',
      questions: getQuestionsByGrade(testData.dyscalculia.magnitudeComparison, gradeNum),
    },
    {
      id: 'estimation',
      name: 'Quantity Estimation',
      icon: <Circle className="h-5 w-5" />,
      description: 'Dot cluster comparison (no counting)',
      questions: getQuestionsByGrade(testData.dyscalculia.quantityEstimation, gradeNum),
    },
    {
      id: 'arithmetic',
      name: 'Arithmetic Reasoning',
      icon: <Brain className="h-5 w-5" />,
      description: 'Word problems with daily contexts',
      questions: getQuestionsByGrade(testData.dyscalculia.arithmeticReasoning, gradeNum),
    },
    {
      id: 'mapping',
      name: 'Symbol-Quantity Mapping',
      icon: <Link2 className="h-5 w-5" />,
      description: 'Connecting numbers to quantities',
      questions: getQuestionsByGrade(testData.dyscalculia.symbolMapping, gradeNum),
    },
    {
      id: 'sequence',
      name: 'Sequential Logic',
      icon: <ListOrdered className="h-5 w-5" />,
      description: 'Number patterns and sequences',
      questions: getQuestionsByGrade(testData.dyscalculia.sequentialLogic, gradeNum),
    },
  ];

  const [testPhase, setTestPhase] = useState<TestPhase>("intro");
  const [currentSubTestIndex, setCurrentSubTestIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [results, setResults] = useState<any>(null);
  
  // Use REFS for metrics (avoids stale closure in analyzeResults)
  const metricsRef = useRef<Record<string, TestMetrics>>({});
  const errorPatternsRef = useRef<ErrorPattern[]>([]);
  const answeredQuestionsRef = useRef<AnsweredQuestion[]>([]);

  const currentSubTest = subTests[currentSubTestIndex];
  const currentQuestion = currentSubTest?.questions[currentQuestionIndex];
  
  const totalQuestions = subTests.reduce((sum, st) => sum + st.questions.length, 0);
  const completedQuestions = subTests
    .slice(0, currentSubTestIndex)
    .reduce((sum, st) => sum + st.questions.length, 0) + currentQuestionIndex;
  const overallProgress = (completedQuestions / totalQuestions) * 100;

  const handleAnswer = useCallback((
    answer: string,
    responseTime: number,
    isCorrect: boolean,
    errorPattern?: ErrorPattern
  ) => {
    const subtestId = currentSubTest.id;
    
    // Track answered question
    answeredQuestionsRef.current.push({
      question: currentQuestion?.instruction || currentQuestion?.stimulus?.toString() || '',
      answer,
      correct: isCorrect,
      subtest: currentSubTest.name,
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
    const newHesitation = existing.hesitationCount + (responseTime > (currentQuestion?.timeLimit || 30) * 0.8 ? 1 : 0);
    
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

    setTimeout(() => {
      if (currentQuestionIndex < currentSubTest.questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else if (currentSubTestIndex < subTests.length - 1) {
        setCurrentSubTestIndex((prev) => prev + 1);
        setCurrentQuestionIndex(0);
      } else {
        analyzeResults();
      }
    }, 500);
  }, [currentSubTest, currentQuestionIndex, currentSubTestIndex, subTests.length]);

  const analyzeResults = async () => {
    setTestPhase("analyzing");
    
    const currentMetrics = metricsRef.current;
    const allErrors = errorPatternsRef.current;
    const allAnswers = answeredQuestionsRef.current;

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
      
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      const flaggedConditions: string[] = [];
      
      if ((currentMetrics.magnitude?.accuracy ?? 100) < 70) {
        riskLevel = 'moderate';
        flaggedConditions.push('Number Sense Deficit');
      }
      
      if ((currentMetrics.estimation?.accuracy ?? 100) < 60) {
        if (riskLevel === 'moderate') riskLevel = 'high';
        else riskLevel = 'moderate';
        flaggedConditions.push('Quantity Estimation Difficulty');
      }
      
      if ((currentMetrics.arithmetic?.accuracy ?? 100) < 60) {
        if (riskLevel !== 'low') riskLevel = 'high';
        else riskLevel = 'moderate';
        flaggedConditions.push('Mathematical Reasoning Deficit');
      }
      
      if ((currentMetrics.mapping?.accuracy ?? 100) < 70) {
        flaggedConditions.push('Symbol-Quantity Mapping Issues');
        if (riskLevel === 'low') riskLevel = 'moderate';
      }
      
      if ((currentMetrics.sequence?.accuracy ?? 100) < 60) {
        flaggedConditions.push('Sequential Processing Difficulty');
      }
      
      if ((errorTypeCounts.magnitude || 0) >= 2) {
        flaggedConditions.push('Magnitude Comparison Errors');
        if (riskLevel === 'low') riskLevel = 'moderate';
      }

      const analysisResult = {
        testType: 'dyscalculia',
        overallScore: Math.round(isNaN(overallAccuracy) ? 0 : overallAccuracy),
        riskLevel,
        flaggedConditions,
        subtestScores,
        errorPatterns: allErrors,
        errorTypeCounts,
        numberSenseScore: currentMetrics.magnitude?.accuracy || 0,
        calculationScore: currentMetrics.arithmetic?.accuracy || 0,
        answeredQuestions: allAnswers,
        summary: generateSummary(overallAccuracy, riskLevel, flaggedConditions),
        recommendations: generateRecommendations(riskLevel, flaggedConditions, errorTypeCounts),
      };

      setResults(analysisResult);
      setTestPhase("results");
      onComplete?.(analysisResult);

      // Call AI prediction API (non-blocking)
      const finalScore = analysisResult.overallScore;
      const percentage = analysisResult.overallScore;
      const answersArray = analysisResult.answeredQuestions;
      getAIPrediction({
        disorder_type: "dyscalculia",
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
      setTestPhase("intro");
    }
  };

  const generateSummary = (accuracy: number, risk: string, conditions: string[]): string => {
    const safeAccuracy = isNaN(accuracy) ? 0 : accuracy;
    if (risk === 'low') {
      return `${studentName} performed well across all math screening domains with ${Math.round(safeAccuracy)}% overall accuracy. No significant indicators of mathematical learning difficulties were detected.`;
    } else if (risk === 'moderate') {
      return `${studentName} showed some difficulty in math-related tasks (${Math.round(safeAccuracy)}% accuracy). ${conditions.slice(0, 2).join(' and ')} were noted. Additional support in mathematics may be beneficial.`;
    } else {
      return `${studentName} displayed significant challenges in multiple mathematical domains (${Math.round(safeAccuracy)}% accuracy). Indicators include ${conditions.join(', ')}. A comprehensive evaluation by a specialist is strongly recommended.`;
    }
  };

  const generateRecommendations = (
    risk: string,
    conditions: string[],
    errorTypes: Record<string, number>
  ): string[] => {
    const recs: string[] = [];
    
    if (conditions.includes('Number Sense Deficit')) {
      recs.push('Practice number magnitude comparisons with concrete objects');
      recs.push('Use number lines and visual representations regularly');
    }
    if (conditions.includes('Quantity Estimation Difficulty')) {
      recs.push('Practice subitizing (quick recognition of small quantities)');
      recs.push('Play estimation games with everyday objects');
    }
    if (conditions.includes('Mathematical Reasoning Deficit')) {
      recs.push('Use real-world word problems with familiar contexts');
      recs.push('Break complex problems into smaller steps');
    }
    if (conditions.includes('Symbol-Quantity Mapping Issues')) {
      recs.push('Connect numbers to physical objects (count manipulatives)');
      recs.push('Practice matching written numbers to quantities');
    }
    if (conditions.includes('Sequential Processing Difficulty')) {
      recs.push('Practice skip counting and number sequences daily');
      recs.push('Use patterns and visual sequences');
    }
    if (risk === 'high') {
      recs.push('Consult with a learning disability specialist for comprehensive assessment');
      recs.push('Consider educational accommodations such as calculator use and extended time');
    }
    
    return recs.length > 0 ? recs : ['Continue regular math practice', 'Monitor progress over time'];
  };

  // Render intro screen
  if (testPhase === "intro") {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-accent/30">
        <CardHeader className="text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center mx-auto mb-4">
            <Calculator className="h-8 w-8 text-accent-foreground" />
          </div>
          <CardTitle className="text-2xl">DSM-5 Dyscalculia Screening</CardTitle>
          <CardDescription>
            {studentName} • {studentGrade}
          </CardDescription>
          <Badge variant="outline" className="mx-auto mt-2">DSM-5 Compliant • Cognitive Assessment</Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/30">
            <Globe className="h-5 w-5 text-accent" />
            <span className="font-medium">Language: {language.native} ({language.name})</span>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">This assessment includes:</h3>
            <div className="space-y-2">
              {subTests.map((st, idx) => (
                <div key={st.id} className="flex items-center gap-3 text-sm">
                  <span className="bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">
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

          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
            <p className="text-sm text-warning-foreground">
              <strong>Note:</strong> No calculators allowed. Answer based on understanding, not memorization.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-lg bg-secondary/10 border border-secondary/30">
              <p className="text-2xl font-bold text-secondary">{subTests.length}</p>
              <p className="text-xs text-muted-foreground">Subtests</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-accent/10 border border-accent/30">
              <p className="text-2xl font-bold text-accent">{totalQuestions}</p>
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
    if (currentSubTest.id === 'estimation') {
      const dotQuestion = currentQuestion as DotClusterQuestion;
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
          
          <DotClusterStimulus
            question={dotQuestion}
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

  // Render analyzing phase
  if (testPhase === "analyzing") {
    return (
      <Card className="max-w-2xl mx-auto border-2 border-accent/30">
        <CardContent className="py-16 text-center">
          <Loader2 className="h-16 w-16 mx-auto mb-6 text-accent animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Analyzing Responses</h2>
          <p className="text-muted-foreground">
            Evaluating mathematical processing patterns...
          </p>
          <div className="flex justify-center gap-2 mt-6">
            <Badge variant="outline" className="animate-pulse">Number Sense</Badge>
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
      <Card className="max-w-3xl mx-auto border-2 border-accent/30">
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
          <CardTitle className="text-2xl">Dyscalculia Screening Complete</CardTitle>
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
                <span className="capitalize">{s.id}</span>
                <span className={`font-medium ${s.accuracy >= 70 ? 'text-success' : s.accuracy >= 50 ? 'text-warning' : 'text-destructive'}`}>
                  {Math.round(s.accuracy)}%
                </span>
              </div>
            ))}
          </div>

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
          <div className="p-4 rounded-lg border-2 border-accent/20 bg-accent/5">
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Brain className="h-5 w-5 text-accent" />
              Detailed Analysis Report
            </h4>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-sm mb-1">Assessment Summary:</p>
                <p className="text-sm text-muted-foreground">{results.summary}</p>
              </div>
              
              <div>
                <p className="font-medium text-sm mb-2">Testing Criteria & DSM-5 Alignment:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Number sense & magnitude: Comparing quantities and number values</li>
                  <li>Quantity estimation: Approximate number system (subitizing)</li>
                  <li>Arithmetic reasoning: Word problems with daily contexts</li>
                  <li>Symbol-quantity mapping: Connecting numerals to amounts</li>
                  <li>Sequential logic: Number patterns and series</li>
                </ul>
              </div>

              {results.answeredQuestions?.length > 0 && (
                <div>
                  <p className="font-medium text-sm mb-2">Question-by-Question Results:</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.answeredQuestions.map((q: AnsweredQuestion, i: number) => (
                      <div key={i} className={`p-2 rounded text-xs border ${q.correct ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-[10px]">{q.subtest}</Badge>
                          <span className={q.correct ? 'text-success' : 'text-destructive'}>
                            {q.correct ? '✓ Correct' : '✗ Incorrect'} ({q.responseTime.toFixed(1)}s)
                          </span>
                        </div>
                        <p className="text-muted-foreground"><strong>Q:</strong> {q.question}</p>
                        <p className="text-foreground"><strong>A:</strong> {q.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/30">
            <p className="font-semibold mb-2">Summary:</p>
            <p className="text-sm text-muted-foreground">{results.summary}</p>
          </div>

          {results.recommendations?.length > 0 && (
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
              <p className="font-semibold mb-2">Recommendations:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
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
