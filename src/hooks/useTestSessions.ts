import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type TestSession = Tables<"test_sessions">;
export type VoiceAnalysis = Tables<"voice_analysis">;

interface TestResultsData {
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

export function useTestSessions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const saveTestResults = useCallback(
    async (
      studentId: string,
      results: TestResultsData,
      testType: "voice" | "written" = "voice"
    ): Promise<{ sessionId: string | null; error: Error | null }> => {
      if (!user) {
        return { sessionId: null, error: new Error("User not authenticated") };
      }

      setLoading(true);
      try {
        // Create test session
        const testSession: TablesInsert<"test_sessions"> = {
          student_id: studentId,
          conducted_by: user.id,
          test_type: testType,
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
          completed_at: new Date().toISOString(),
        };

        const { data: session, error: sessionError } = await supabase
          .from("test_sessions")
          .insert(testSession)
          .select()
          .single();

        if (sessionError) throw sessionError;

        // Create voice analysis record
        const voiceAnalysis: TablesInsert<"voice_analysis"> = {
          session_id: session.id,
          phoneme_error_rate: results.phonemeErrorRate,
          pronunciation_consistency: results.pronunciationConsistency,
          prosodic_score: results.prosodicScore,
          temporal_score: results.temporalScore,
          error_pattern_density: results.errorPatternDensity,
          transcription: results.transcription,
          detailed_metrics: {
            flaggedConditions: results.flaggedConditions,
            riskLevel: results.riskLevel,
          },
        };

        const { error: analysisError } = await supabase
          .from("voice_analysis")
          .insert(voiceAnalysis);

        if (analysisError) throw analysisError;

        toast.success("Test results saved successfully!");
        return { sessionId: session.id, error: null };
      } catch (error) {
        console.error("Error saving test results:", error);
        toast.error("Failed to save test results");
        return { sessionId: null, error: error as Error };
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const getStudentTestSessions = useCallback(
    async (studentId: string): Promise<TestSession[]> => {
      const { data, error } = await supabase
        .from("test_sessions")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching test sessions:", error);
        return [];
      }

      return data || [];
    },
    []
  );

  const getTestSessionWithAnalysis = useCallback(
    async (
      sessionId: string
    ): Promise<{ session: TestSession | null; analysis: VoiceAnalysis | null }> => {
      const [sessionResult, analysisResult] = await Promise.all([
        supabase
          .from("test_sessions")
          .select("*")
          .eq("id", sessionId)
          .maybeSingle(),
        supabase
          .from("voice_analysis")
          .select("*")
          .eq("session_id", sessionId)
          .maybeSingle(),
      ]);

      return {
        session: sessionResult.data,
        analysis: analysisResult.data,
      };
    },
    []
  );

  return {
    loading,
    saveTestResults,
    getStudentTestSessions,
    getTestSessionWithAnalysis,
  };
}
