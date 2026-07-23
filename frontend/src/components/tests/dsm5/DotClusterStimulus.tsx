import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import type { DotClusterQuestion, ErrorPattern } from "@/lib/dsm5TestData";

interface DotClusterStimulusProps {
  question: DotClusterQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string, responseTime: number, isCorrect: boolean, errorPattern?: ErrorPattern) => void;
}

export function DotClusterStimulus({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
}: DotClusterStimulusProps) {
  const [phase, setPhase] = useState<'showing' | 'answering'>('showing');
  const [startTime, setStartTime] = useState(Date.now());

  // Generate random dot positions
  const leftDots = useMemo(() => generateRandomDots(question.leftDots), [question.leftDots, question.id]);
  const rightDots = useMemo(() => generateRandomDots(question.rightDots), [question.rightDots, question.id]);

  useEffect(() => {
    setPhase('showing');
    setStartTime(Date.now());
    
    const timer = setTimeout(() => {
      setPhase('answering');
      setStartTime(Date.now()); // Reset timer for answer phase
    }, question.displayTime);

    return () => clearTimeout(timer);
  }, [question.id, question.displayTime]);

  const handleAnswer = (answer: 'Left' | 'Right' | 'बाएं' | 'दाएं') => {
    const responseTime = (Date.now() - startTime) / 1000;
    const normalizedAnswer = answer === 'बाएं' ? 'Left' : answer === 'दाएं' ? 'Right' : answer;
    const isCorrect = normalizedAnswer === question.correctAnswer || answer === question.correctAnswer;
    
    let errorPattern: ErrorPattern | undefined;
    if (!isCorrect) {
      errorPattern = {
        type: 'magnitude',
        detail: `Chose ${question.leftDots > question.rightDots ? 'smaller' : 'larger'} quantity (${answer})`,
        questionId: question.id,
      };
    }

    onAnswer(answer, responseTime, isCorrect, errorPattern);
  };

  return (
    <Card className="max-w-3xl mx-auto border-2 border-accent/30">
      <CardContent className="pt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Badge variant="outline">
            Question {questionNumber} of {totalQuestions}
          </Badge>
          <Badge className={phase === 'showing' ? 'bg-warning' : 'bg-success'}>
            {phase === 'showing' ? 'Look carefully!' : 'Choose now!'}
          </Badge>
        </div>

        {/* Instruction */}
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">
            {question.instruction}
          </p>
        </div>

        {/* Dot clusters display */}
        {phase === 'showing' && (
          <div className="grid grid-cols-2 gap-8 py-8">
            <div className="relative w-full aspect-square bg-muted/30 rounded-xl border-2 border-primary/20 flex items-center justify-center">
              <div className="relative w-40 h-40">
                {leftDots.map((pos, idx) => (
                  <div
                    key={idx}
                    className="absolute w-4 h-4 bg-primary rounded-full"
                    style={{ left: pos.x, top: pos.y }}
                  />
                ))}
              </div>
              <p className="absolute bottom-2 text-sm text-muted-foreground">Left</p>
            </div>
            <div className="relative w-full aspect-square bg-muted/30 rounded-xl border-2 border-accent/20 flex items-center justify-center">
              <div className="relative w-40 h-40">
                {rightDots.map((pos, idx) => (
                  <div
                    key={idx}
                    className="absolute w-4 h-4 bg-accent rounded-full"
                    style={{ left: pos.x, top: pos.y }}
                  />
                ))}
              </div>
              <p className="absolute bottom-2 text-sm text-muted-foreground">Right</p>
            </div>
          </div>
        )}

        {/* Answer phase */}
        {phase === 'answering' && (
          <div className="py-8 space-y-6">
            <div className="text-center">
              <p className="text-xl font-semibold mb-2">Which group had MORE dots?</p>
              <p className="text-sm text-muted-foreground">Quick! Trust your first instinct.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                size="lg"
                className="h-24 text-xl border-2 hover:bg-primary/10 hover:border-primary"
                onClick={() => handleAnswer(question.options?.[0] as any || 'Left')}
              >
                {question.options?.[0] || 'Left'}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-24 text-xl border-2 hover:bg-accent/10 hover:border-accent"
                onClick={() => handleAnswer(question.options?.[1] as any || 'Right')}
              >
                {question.options?.[1] || 'Right'}
              </Button>
            </div>
          </div>
        )}

        {/* Timer indicator during showing phase */}
        {phase === 'showing' && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-warning/20 border border-warning/30">
              <Clock className="h-4 w-4 text-warning animate-pulse" />
              <span className="text-sm font-medium text-warning">
                Remember the dots!
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper to generate random dot positions
function generateRandomDots(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const minDistance = 20; // Minimum distance between dots
  
  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let x: number, y: number;
    
    do {
      x = Math.random() * 120; // Leave margin
      y = Math.random() * 120;
      attempts++;
    } while (
      attempts < 50 &&
      positions.some(
        (p) => Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < minDistance
      )
    );
    
    positions.push({ x, y });
  }
  
  return positions;
}
