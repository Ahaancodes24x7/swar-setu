import { useState, useEffect, useRef, useCallback } from "react";
import { useScribe } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Mic, MicOff, Volume2, Play, Square, ArrowRight } from "lucide-react";
import type { WorkingMemoryQuestion, ErrorPattern } from "@/lib/dsm5TestData";

interface WorkingMemoryTestProps {
  question: WorkingMemoryQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string, responseTime: number, isCorrect: boolean, errorPattern?: ErrorPattern) => void;
}

export function WorkingMemoryTest({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
}: WorkingMemoryTestProps) {
  const [phase, setPhase] = useState<'presenting' | 'recording' | 'done'>('presenting');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transcription, setTranscription] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const startTime = useRef(Date.now());
  const presentationTimer = useRef<NodeJS.Timeout | null>(null);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    onPartialTranscript: (data) => {
      setTranscription(data.text);
    },
    onCommittedTranscript: (data) => {
      setTranscription((prev) => prev + " " + data.text);
    },
  });

  // Present sequence one item at a time
  useEffect(() => {
    setPhase('presenting');
    setCurrentIndex(0);
    setTranscription("");

    // Show each item for 1 second
    const showNextItem = () => {
      setCurrentIndex((prev) => {
        if (prev < question.sequence.length - 1) {
          return prev + 1;
        } else {
          // Done presenting, move to recording
          setTimeout(() => setPhase('recording'), 1000);
          return prev;
        }
      });
    };

    presentationTimer.current = setInterval(showNextItem, 1200);

    return () => {
      if (presentationTimer.current) clearInterval(presentationTimer.current);
    };
  }, [question.id, question.sequence.length]);

  // Start recording when phase changes
  useEffect(() => {
    if (phase === 'recording') {
      startRecording();
    }
  }, [phase]);

  // Audio level visualization
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

  const startRecording = async () => {
    startTime.current = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      
      if (error || !data?.token) {
        throw new Error(error?.message || "Failed to get token");
      }

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Microphone access failed. Please try again.");
    }
  };

  const stopRecording = async () => {
    await scribe.disconnect();
    setPhase('done');

    const responseTime = (Date.now() - startTime.current) / 1000;
    const expectedAnswer = Array.isArray(question.correctAnswer)
      ? question.correctAnswer.join(' ')
      : String(question.correctAnswer);
    
    // Normalize transcription for comparison
    const normalizedTranscription = transcription.toLowerCase().trim();
    const normalizedExpected = expectedAnswer.toLowerCase();
    
    // Check if the response matches (allowing for some variation)
    const isCorrect = checkSequenceMatch(normalizedTranscription, question.correctAnswer as string[]);

    let errorPattern: ErrorPattern | undefined;
    if (!isCorrect) {
      errorPattern = detectWorkingMemoryError(transcription, question);
    }

    // Small delay before submitting to show result
    setTimeout(() => {
      onAnswer(transcription, responseTime, isCorrect, errorPattern);
    }, 500);
  };

  const checkSequenceMatch = (response: string, expected: string[]): boolean => {
    // Extract numbers/words from response
    const responseItems = response.split(/[\s,]+/).filter(Boolean);
    
    // Check if all items match in order
    if (responseItems.length !== expected.length) return false;
    
    for (let i = 0; i < expected.length; i++) {
      const expectedItem = expected[i].toLowerCase();
      const responseItem = responseItems[i]?.toLowerCase() || '';
      
      // Allow number words (e.g., "three" matches "3")
      if (!itemsMatch(responseItem, expectedItem)) {
        return false;
      }
    }
    
    return true;
  };

  const itemsMatch = (a: string, b: string): boolean => {
    if (a === b) return true;
    
    // Number word mappings
    const numberWords: Record<string, string> = {
      'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
      'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
    };
    
    const aNum = numberWords[a] || a;
    const bNum = numberWords[b] || b;
    
    return aNum === bNum;
  };

  const detectWorkingMemoryError = (response: string, q: WorkingMemoryQuestion): ErrorPattern => {
    const responseItems = response.split(/[\s,]+/).filter(Boolean);
    const expected = q.correctAnswer as string[];
    
    // Check for sequence reversal
    if (q.direction === 'forward') {
      const reversed = [...expected].reverse();
      if (checkSequenceMatch(response, reversed)) {
        return { type: 'reversal', detail: 'Recalled sequence in reverse order', questionId: q.id };
      }
    }
    
    // Check for omission
    if (responseItems.length < expected.length) {
      return { type: 'omission', detail: `Omitted ${expected.length - responseItems.length} items`, questionId: q.id };
    }
    
    // Check for transposition (items swapped)
    return { type: 'sequence', detail: 'Sequence order error', questionId: q.id };
  };

  const progressPercent = (questionNumber / totalQuestions) * 100;

  return (
    <Card className="max-w-2xl mx-auto border-2 border-secondary/30">
      <CardContent className="pt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Badge variant="outline">
            Question {questionNumber} of {totalQuestions}
          </Badge>
          <Badge className={
            phase === 'presenting' ? 'bg-warning' :
            phase === 'recording' ? 'bg-success' : 'bg-primary'
          }>
            {phase === 'presenting' ? 'Listen...' :
             phase === 'recording' ? 'Your turn!' : 'Done!'}
          </Badge>
        </div>

        <Progress value={progressPercent} className="h-2" />

        {/* Instruction */}
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">
            {question.instruction}
          </p>
          {question.direction === 'backward' && (
            <Badge variant="destructive" className="mt-2">REVERSE ORDER</Badge>
          )}
        </div>

        {/* Presentation phase */}
        {phase === 'presenting' && (
          <div className="py-12 text-center">
            <div className="h-32 w-32 rounded-full bg-primary/20 flex items-center justify-center mx-auto animate-pulse">
              <span className="text-5xl font-bold text-primary">
                {question.sequence[currentIndex]}
              </span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Item {currentIndex + 1} of {question.sequence.length}
            </p>
          </div>
        )}

        {/* Recording phase */}
        {phase === 'recording' && (
          <div className="py-8 space-y-6">
            <div className="text-center">
              <p className="text-xl font-semibold mb-2">
                {question.direction === 'backward' 
                  ? 'Now say them in REVERSE order' 
                  : 'Now repeat them in the same order'}
              </p>
            </div>

            {/* Audio level indicator */}
            {scribe.isConnected && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/30">
                <div className="h-4 w-4 rounded-full bg-success animate-pulse" />
                <div className="flex-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success transition-all duration-100"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                </div>
                <Mic className="h-4 w-4 text-success" />
              </div>
            )}

            {/* Transcription */}
            <div className="bg-muted/30 rounded-lg p-4 min-h-[60px]">
              <p className="text-xs text-muted-foreground mb-1">Your response:</p>
              <p className="text-lg">
                {transcription || <span className="text-muted-foreground italic">Listening...</span>}
                {scribe.isConnected && <span className="animate-pulse text-success">|</span>}
              </p>
            </div>

            <Button 
              variant="hero" 
              className="w-full"
              onClick={stopRecording}
              disabled={!scribe.isConnected}
            >
              <Square className="h-4 w-4 mr-2" />
              Done Speaking
            </Button>
          </div>
        )}

        {/* Done phase */}
        {phase === 'done' && (
          <div className="py-8 text-center">
            <p className="text-lg text-muted-foreground">Response recorded!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
