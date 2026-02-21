import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface VoiceAnalysisResult {
  transcription: string;
  pronunciation_score: number;
  fluency_score: number;
  hesitation_count: number;
  pause_duration_ms: number;
  accuracy_score: number;
  feedback: string;
}

interface VoicePracticeSession {
  id: string;
  student_id: string;
  prompt_text: string;
  spoken_text: string | null;
  pronunciation_score: number | null;
  fluency_score: number | null;
  hesitation_count: number;
  pause_duration_ms: number;
  accuracy_score: number | null;
  feedback: string | null;
  created_at: string;
}

export function useVoicePractice(studentId?: string) {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<VoiceAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<VoicePracticeSession[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") 
          ? "audio/webm" 
          : "audio/mp4",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Microphone access denied. Please enable microphone access and try again.");
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorderRef.current?.mimeType || "audio/webm" 
        });
        
        // Stop all tracks
        mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
        
        setIsRecording(false);
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  const analyzeVoice = useCallback(
    async (audioBlob: Blob, promptText: string): Promise<VoiceAnalysisResult | null> => {
      if (!user) return null;

      setIsProcessing(true);
      setError(null);

      try {
        // First, get the transcription
        const formData = new FormData();
        formData.append("audio", audioBlob);
        formData.append("prompt_text", promptText);
        formData.append("language", "en"); // Can be dynamic

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-voice-practice`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to analyze voice");
        }

        const result: VoiceAnalysisResult = await response.json();
        setLastResult(result);

        // Save to database if we have a student
        if (studentId) {
          await supabase.from("voice_practice_sessions").insert({
            student_id: studentId,
            parent_id: user.id,
            prompt_text: promptText,
            spoken_text: result.transcription,
            pronunciation_score: result.pronunciation_score,
            fluency_score: result.fluency_score,
            hesitation_count: result.hesitation_count,
            pause_duration_ms: result.pause_duration_ms,
            accuracy_score: result.accuracy_score,
            feedback: result.feedback,
          });
        }

        return result;
      } catch (err) {
        console.error("Error analyzing voice:", err);
        setError(err instanceof Error ? err.message : "Failed to analyze voice");
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [user, studentId]
  );

  const fetchSessions = useCallback(async () => {
    if (!studentId) return;

    try {
      const { data, error } = await supabase
        .from("voice_practice_sessions")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error("Error fetching sessions:", err);
    }
  }, [studentId]);

  // Fallback for browsers without MediaRecorder support
  const hasMediaRecorder = typeof MediaRecorder !== "undefined";
  const hasMicrophoneSupport = typeof navigator !== "undefined" && navigator.mediaDevices;

  return {
    isRecording,
    isProcessing,
    lastResult,
    error,
    sessions,
    startRecording,
    stopRecording,
    analyzeVoice,
    fetchSessions,
    hasMediaRecorder,
    hasMicrophoneSupport,
    clearError: () => setError(null),
  };
}
