import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LearningResource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  skill_targeted: string;
  grade_min: number;
  grade_max: number;
  language: string;
  url: string | null;
  duration_minutes: number | null;
  difficulty: string | null;
  conditions: string[] | null;
  thumbnail_url: string | null;
  created_at: string;
}

interface ResourceInteraction {
  id: string;
  resource_id: string;
  student_id: string;
  parent_id: string;
  opened_at: string;
  completed: boolean;
  time_spent_minutes: number;
}

interface StudentProfile {
  id: string;
  name: string;
  grade: string;
  flaggedConditions: string[];
}

export function useLearningResources(studentId?: string) {
  const { user } = useAuth();
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [interactions, setInteractions] = useState<ResourceInteraction[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch student profile and their flagged conditions from test sessions
  const fetchStudentProfile = useCallback(async () => {
    if (!user || !studentId) return;

    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .maybeSingle();

    if (student) {
      // Get flagged conditions from test sessions
      const { data: sessions } = await supabase
        .from("test_sessions")
        .select("flagged_conditions")
        .eq("student_id", studentId)
        .eq("status", "completed");

      const allConditions = new Set<string>();
      sessions?.forEach((session) => {
        session.flagged_conditions?.forEach((condition: string) => {
          allConditions.add(condition.toLowerCase());
        });
      });

      // Map conditions to resource conditions
      const flaggedConditions: string[] = [];
      allConditions.forEach((condition) => {
        if (condition.includes("dyslexia") || condition.includes("reading") || condition.includes("phonological")) {
          flaggedConditions.push("dyslexia");
        }
        if (condition.includes("dyscalculia") || condition.includes("number") || condition.includes("math")) {
          flaggedConditions.push("dyscalculia");
        }
      });

      setStudentProfile({
        id: student.id,
        name: student.name,
        grade: student.grade,
        flaggedConditions: [...new Set(flaggedConditions)],
      });
    }
  }, [user, studentId]);

  // Fetch all resources
  const fetchResources = useCallback(async () => {
    const { data } = await supabase
      .from("learning_resources")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setResources(data as LearningResource[]);
    }
  }, []);

  // Fetch user's interactions
  const fetchInteractions = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("resource_interactions")
      .select("*")
      .eq("parent_id", user.id);

    if (data) {
      setInteractions(data as ResourceInteraction[]);
    }
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchStudentProfile(),
        fetchResources(),
        fetchInteractions(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [fetchStudentProfile, fetchResources, fetchInteractions]);

  // Filter resources based on student profile
  const personalizedResources = useMemo(() => {
    if (!studentProfile) return resources;

    const gradeNum = parseInt(studentProfile.grade) || 1;
    const conditions = studentProfile.flaggedConditions;

    return resources.filter((resource) => {
      // Filter by grade range
      if (gradeNum < resource.grade_min || gradeNum > resource.grade_max) {
        return false;
      }

      // If student has flagged conditions, prioritize those resources
      // Also include 'general' resources
      if (conditions.length > 0) {
        const resourceConditions = resource.conditions || [];
        return (
          resourceConditions.some((c) => conditions.includes(c)) ||
          resourceConditions.includes("general")
        );
      }

      // If no flagged conditions, show general resources
      return resource.conditions?.includes("general") || resource.conditions?.length === 0;
    });
  }, [resources, studentProfile]);

  // Sort resources by relevance
  const sortedResources = useMemo(() => {
    if (!studentProfile) return personalizedResources;

    const conditions = studentProfile.flaggedConditions;

    return [...personalizedResources].sort((a, b) => {
      // Prioritize resources matching flagged conditions
      const aMatch = a.conditions?.some((c) => conditions.includes(c)) ? 1 : 0;
      const bMatch = b.conditions?.some((c) => conditions.includes(c)) ? 1 : 0;
      if (bMatch !== aMatch) return bMatch - aMatch;

      // Then sort by difficulty (easy first for struggling students)
      const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
      const aDiff = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] ?? 1;
      const bDiff = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] ?? 1;
      return aDiff - bDiff;
    });
  }, [personalizedResources, studentProfile]);

  // Track resource interaction
  const trackInteraction = useCallback(
    async (resourceId: string) => {
      if (!user || !studentId) return;

      // Check if interaction already exists
      const existing = interactions.find(
        (i) => i.resource_id === resourceId && i.student_id === studentId
      );

      if (existing) {
        // Update existing interaction
        await supabase
          .from("resource_interactions")
          .update({ opened_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        // Create new interaction
        await supabase.from("resource_interactions").insert({
          resource_id: resourceId,
          student_id: studentId,
          parent_id: user.id,
        });
      }

      // Refresh interactions
      fetchInteractions();
    },
    [user, studentId, interactions, fetchInteractions]
  );

  // Mark resource as completed
  const markCompleted = useCallback(
    async (resourceId: string, timeSpent: number) => {
      if (!user || !studentId) return;

      const existing = interactions.find(
        (i) => i.resource_id === resourceId && i.student_id === studentId
      );

      if (existing) {
        await supabase
          .from("resource_interactions")
          .update({
            completed: true,
            time_spent_minutes: timeSpent,
          })
          .eq("id", existing.id);

        fetchInteractions();
      }
    },
    [user, studentId, interactions, fetchInteractions]
  );

  // Get interaction status for a resource
  const getInteractionStatus = useCallback(
    (resourceId: string) => {
      return interactions.find(
        (i) => i.resource_id === resourceId && i.student_id === studentId
      );
    },
    [interactions, studentId]
  );

  // Group resources by type
  const resourcesByType = useMemo(() => {
    const grouped: Record<string, LearningResource[]> = {};
    sortedResources.forEach((resource) => {
      if (!grouped[resource.resource_type]) {
        grouped[resource.resource_type] = [];
      }
      grouped[resource.resource_type].push(resource);
    });
    return grouped;
  }, [sortedResources]);

  return {
    loading,
    resources: sortedResources,
    resourcesByType,
    studentProfile,
    interactions,
    trackInteraction,
    markCompleted,
    getInteractionStatus,
    refetch: async () => {
      await Promise.all([fetchResources(), fetchInteractions()]);
    },
  };
}
