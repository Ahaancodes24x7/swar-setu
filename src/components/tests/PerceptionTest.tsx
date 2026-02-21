import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, ChevronRight, AlertCircle, CheckCircle, Loader2, ImageIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getPerceptionQuestionsByGrade,
  type PerceptionQuestion,
  type PerceptionResponse,
  type PerceptionAnalysis 
} from "@/lib/perceptionTestData";

interface PerceptionTestProps {
  studentName: string;
  studentGrade: string;
  studentId: string;
  onComplete: (results: any) => void;
}

// Load pre-generated image or generate from prompt (fallback)
async function generatePerceptionImage(prompt: string, imageUrl?: string, retryCount = 0): Promise<string> {
  // First, try to use pre-generated image URL if available
  if (imageUrl) {
    return imageUrl;
  }
  
  // Fallback to Gemini generation if no pre-generated image (for backwards compatibility)
  const MAX_RETRIES = 2;

  try {
    const { data, error } = await supabase.functions.invoke("generate-perception-image", {
      body: { prompt },
    });

    if (error) throw error;
    const generatedImageUrl = (data as any)?.imageUrl as string | undefined;
    if (!generatedImageUrl) throw new Error("No image returned");
    return generatedImageUrl;
  } catch (error) {
    console.error("Error generating image:", error);

    if (retryCount < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      return generatePerceptionImage(prompt, undefined, retryCount + 1);
    }

    return "";
  }
}

export function PerceptionTest({ studentName, studentGrade, studentId, onComplete }: PerceptionTestProps) {
  const { user } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<PerceptionResponse[]>([]);
  const [questions, setQuestions] = useState<PerceptionQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [imageError, setImageError] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const startTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const imageGenerationAttempts = useRef(0);

  // Parse grade number from string like "Grade 3"
  const gradeNum = parseInt(studentGrade.replace(/\D/g, '')) || 3;

  // Initialize questions on mount
  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      const gradeQuestions = getPerceptionQuestionsByGrade(gradeNum, 'en');
      // Shuffle and limit to 5 questions per session
      const shuffled = gradeQuestions.sort(() => Math.random() - 0.5).slice(0, 5);
      setQuestions(shuffled);
      setLoading(false);
    };
    loadQuestions();
  }, [gradeNum]);

  // Generate image for current question - MANDATORY before showing question
  const generateImageForQuestion = useCallback(async () => {
    if (questions.length === 0 || currentQuestionIndex >= questions.length) return;
    
    setGeneratingImage(true);
    setImageError(false);
    setCurrentImage('');
    imageGenerationAttempts.current++;
    
    const question = questions[currentQuestionIndex];
    // Pass both the imagePrompt and the imageUrl (if available)
    const imageUrl = await generatePerceptionImage(question.imagePrompt, question.imageUrl);
    
    if (imageUrl) {
      setCurrentImage(imageUrl);
      setImageError(false);
      startTimeRef.current = Date.now();
    } else {
      setImageError(true);
      toast.error("Failed to load image. Click retry to try again.");
    }
    
    setGeneratingImage(false);
  }, [questions, currentQuestionIndex]);

  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      generateImageForQuestion();
    }
  }, [questions, currentQuestionIndex, generateImageForQuestion]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex) / questions.length) * 100 : 0;

  // Check if we can proceed - image must be loaded
  const canProceed = currentImage && !generatingImage && !imageError;

  const handleAnswer = async (answer: string) => {
    if (!canProceed) {
      toast.error("Please wait for the image to load before answering.");
      return;
    }

    const responseTime = (Date.now() - startTimeRef.current) / 1000;
    
    const response: PerceptionResponse = {
      questionId: currentQuestion.id,
      responseType: currentQuestion.responseType,
      response: answer,
      responseTime,
      timestamp: new Date().toISOString()
    };
    
    const newResponses = [...responses, response];
    setResponses(newResponses);
    setTranscribedText('');
    
    // Move to next question or complete
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      await completeTest(newResponses);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Transcribe audio
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("🎤 Recording... Speak now!");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone. Please check permissions or use text input.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      
      const { data, error } = await supabase.functions.invoke('elevenlabs-transcribe', {
        body: formData,
      });
      
      if (error) {
        console.error("Transcription error:", error);
        setTranscribedText("Voice recorded - click Submit to continue");
      } else if (data?.text) {
        setTranscribedText(data.text);
        toast.success("Voice captured! Review and submit.");
      } else {
        setTranscribedText("Voice recorded - click Submit to continue");
      }
    } catch (error) {
      console.error("Transcription error:", error);
      setTranscribedText("Voice recorded - click Submit to continue");
    }
  };

  const completeTest = async (allResponses: PerceptionResponse[]) => {
    setAnalyzing(true);
    
    try {
      // Get AI-powered analysis
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-perception', {
        body: { 
          responses: allResponses.map(r => ({
            questionId: r.questionId,
            questionType: questions.find(q => q.id === r.questionId)?.type || 'unknown',
            response: r.response,
            responseTime: r.responseTime
          })),
          gradeLevel: gradeNum 
        }
      });
      
      let analysis: PerceptionAnalysis;
      if (analysisError || !analysisData) {
        console.error("Analysis error:", analysisError);
        // Fallback to local analysis
        analysis = analyzeResponsesLocally(allResponses);
      } else {
        analysis = analysisData;
      }
      
      // Save to database
       const teacherParentSummary = (analysis as any).summary ||
         "Shows mixed emotional interpretation across scenes, with age-appropriate perspective-taking.";

       const analysisReport = {
        type: 'perception-test',
        responses: allResponses.map(r => ({
          questionId: r.questionId,
          responseType: r.responseType,
          response: r.response,
          responseTime: r.responseTime,
          timestamp: r.timestamp
        })),
         analysis: {
          emotionalPolarity: analysis.emotionalPolarity,
          detailLevel: analysis.detailLevel,
          perspectiveType: analysis.perspectiveType,
          consistency: analysis.consistency,
          trends: analysis.trends,
           summary: teacherParentSummary,
        },
        gradeLevel: gradeNum,
         completedAt: new Date().toISOString(),

         // Backward-compatible fields used by dashboards
         summary: teacherParentSummary,
         recommendations: [
           "Encourage the student to explain what details helped them decide.",
           "Try a short reflection: 'What else could be happening in this scene?'",
         ],
      };
      
      const { error } = await supabase.from('test_sessions').insert([{
        student_id: studentId,
        conducted_by: user?.id,
        test_type: 'perception',
        status: 'completed',
        completed_at: new Date().toISOString(),
        overall_score: null,
        analysis_report: analysisReport
      }]);

      if (error) throw error;

      toast.success("Perception test completed!");
      onComplete({ responses: allResponses, analysis });
    } catch (error) {
      console.error("Error saving perception test:", error);
      toast.error("Failed to save results");
    } finally {
      setAnalyzing(false);
    }
  };

  // Local fallback analysis
  const analyzeResponsesLocally = (responses: PerceptionResponse[]): PerceptionAnalysis => {
    const positiveWords = ['happy', 'safe', 'peaceful', 'excited', 'curious', 'helping', 'friendly', 'warm', 'bright', 'fun'];
    const negativeWords = ['scary', 'lonely', 'sad', 'angry', 'worried', 'dark', 'cold', 'afraid', 'nervous'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    let totalLength = 0;
    
    responses.forEach(r => {
      const responseText = r.response.toLowerCase();
      positiveWords.forEach(word => {
        if (responseText.includes(word)) positiveCount++;
      });
      negativeWords.forEach(word => {
        if (responseText.includes(word)) negativeCount++;
      });
      totalLength += r.response.length;
    });
    
    return {
      emotionalPolarity: positiveCount > negativeCount + 2 ? 'positive' : 
                         negativeCount > positiveCount + 2 ? 'negative' : 
                         positiveCount > 0 && negativeCount > 0 ? 'mixed' : 'neutral',
      detailLevel: totalLength > 300 ? 'high' : totalLength > 100 ? 'medium' : 'low',
      perspectiveType: 'concrete',
      consistency: 70 + Math.floor(Math.random() * 20),
      trends: {
        emotional: 'Shows typical emotional responses for age group.',
        cognitive: 'Demonstrates age-appropriate interpretation skills.'
      }
    };
  };

  if (loading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-16 text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Preparing perception test for {studentName}...</p>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-16 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No perception tests available for this grade level.</p>
        </CardContent>
      </Card>
    );
  }

  if (analyzing) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-16 text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
          <p className="text-lg font-medium">Analyzing responses...</p>
          <p className="text-muted-foreground">Generating perception insights</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-16 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
          <p className="text-lg font-medium">Test Complete!</p>
          <p className="text-muted-foreground">Processing results...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="gap-1">
            <ImageIcon className="h-3 w-3" />
            Perception Test
          </Badge>
          <span className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <CardTitle className="text-xl mt-4">{currentQuestion.instruction}</CardTitle>
        <CardDescription>
          Take your time - there are no right or wrong answers.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Image display - MANDATORY */}
        <div className="aspect-video bg-muted rounded-xl overflow-hidden flex items-center justify-center border-2 border-dashed border-border">
          {generatingImage ? (
            <div className="text-center p-8">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-3" />
              <p className="text-sm font-medium text-foreground">Creating unique image...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
            </div>
          ) : imageError ? (
            <div className="text-center p-8">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-3" />
              <p className="text-sm font-medium text-foreground mb-3">Image generation failed</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateImageForQuestion}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : currentImage ? (
            <img 
              src={currentImage} 
              alt="Perception test stimulus" 
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center p-8">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Loading image...</p>
            </div>
          )}
        </div>

                

        {/* Warning if image not loaded */}
        {!canProceed && !generatingImage && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-center">
            <p className="text-sm text-accent-foreground">
              ⚠️ Please wait for the image to load before answering.
            </p>
          </div>
        )}

        {/* Response options - only enabled when image is loaded */}
        {currentQuestion.responseType === 'multiple-choice' && currentQuestion.options && (
          <div className="grid grid-cols-2 gap-3">
            {currentQuestion.options.map((option, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="h-auto py-4 text-lg disabled:opacity-50"
                onClick={() => handleAnswer(option)}
                disabled={!canProceed}
              >
                {option}
              </Button>
            ))}
          </div>
        )}

        {currentQuestion.responseType === 'voice' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={isRecording ? "destructive" : "default"}
                size="lg"
                onClick={isRecording ? stopRecording : startRecording}
                className="gap-2"
                disabled={!canProceed}
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-5 w-5" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" />
                    Start Speaking
                  </>
                )}
              </Button>
            </div>
            
            {transcribedText && (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3 italic">"{transcribedText}"</p>
                <Button onClick={() => handleAnswer(transcribedText)} className="gap-2">
                  Submit Response
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <p className="text-xs text-center text-muted-foreground">
              Speak freely about what you see and feel. Your thoughts are valuable!
            </p>
          </div>
        )}

        {currentQuestion.responseType === 'text' && (
          <div className="space-y-3">
            <textarea
              className="w-full h-24 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              placeholder="Type your response here..."
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              disabled={!canProceed}
            />
            <Button 
              onClick={() => handleAnswer(transcribedText)}
              disabled={!transcribedText.trim() || !canProceed}
              className="w-full gap-2"
            >
              Submit Response
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
