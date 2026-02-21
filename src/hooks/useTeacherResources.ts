import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LearningResource {
  id: string;
  title: string;
  description: string | null;
  skill_targeted: string;
  resource_type: string;
  grade_min: number;
  grade_max: number;
  language: string;
  difficulty: string | null;
  conditions: string[] | null;
  url: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
}

interface ResourceAssignment {
  id: string;
  teacher_id: string;
  resource_id: string;
  student_id: string | null;
  class_grade: string | null;
  assigned_at: string;
  completed: boolean;
  completed_at: string | null;
  resource?: LearningResource;
  student_name?: string;
}

export function useTeacherResources() {
  const { user } = useAuth();
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResources = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("learning_resources")
        .select("*")
        .order("grade_min", { ascending: true });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error("Error fetching resources:", error);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("teacher_resource_assignments")
        .select(`
          *,
          learning_resources (*)
        `)
        .eq("teacher_id", user.id)
        .order("assigned_at", { ascending: false });

      if (error) throw error;

      // Get student names
      const studentIds = (data || [])
        .filter((a) => a.student_id)
        .map((a) => a.student_id);

      let studentsMap: Record<string, string> = {};
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from("students")
          .select("id, name")
          .in("id", studentIds);

        if (students) {
          studentsMap = Object.fromEntries(students.map((s) => [s.id, s.name]));
        }
      }

      const enrichedAssignments: ResourceAssignment[] = (data || []).map((a) => ({
        ...a,
        resource: a.learning_resources as unknown as LearningResource,
        student_name: a.student_id ? studentsMap[a.student_id] : undefined,
      }));

      setAssignments(enrichedAssignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    }
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchResources(), fetchAssignments()]);
      setLoading(false);
    };
    load();
  }, [fetchResources, fetchAssignments]);

  const assignToStudent = useCallback(
    async (resourceId: string, studentId: string) => {
      if (!user) return { success: false };

      try {
        const { error } = await supabase.from("teacher_resource_assignments").insert({
          teacher_id: user.id,
          resource_id: resourceId,
          student_id: studentId,
        });

        if (error) throw error;

        await fetchAssignments();
        return { success: true };
      } catch (error) {
        console.error("Error assigning resource:", error);
        return { success: false };
      }
    },
    [user, fetchAssignments]
  );

  const assignToGrade = useCallback(
    async (resourceId: string, grade: string) => {
      if (!user) return { success: false };

      try {
        // Get all students in this grade for this teacher
        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select("id")
          .eq("teacher_id", user.id)
          .eq("grade", grade);

        if (studentsError) throw studentsError;

        // Create assignments for all students
        const assignments = (students || []).map((s) => ({
          teacher_id: user.id,
          resource_id: resourceId,
          student_id: s.id,
          class_grade: grade,
        }));

        if (assignments.length > 0) {
          const { error } = await supabase
            .from("teacher_resource_assignments")
            .insert(assignments);

          if (error) throw error;
        }

        await fetchAssignments();
        return { success: true, count: assignments.length };
      } catch (error) {
        console.error("Error assigning to grade:", error);
        return { success: false };
      }
    },
    [user, fetchAssignments]
  );

  const getAssignmentStats = useCallback(() => {
    const total = assignments.length;
    const completed = assignments.filter((a) => a.completed).length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, completionRate };
  }, [assignments]);

  const filterResourcesByGrade = useCallback(
    (grade: number) => {
      return resources.filter(
        (r) => r.grade_min <= grade && r.grade_max >= grade
      );
    },
    [resources]
  );

  const filterResourcesBySkill = useCallback(
    (skill: string) => {
      return resources.filter((r) =>
        r.skill_targeted.toLowerCase().includes(skill.toLowerCase())
      );
    },
    [resources]
  );

  return {
    resources,
    assignments,
    loading,
    assignToStudent,
    assignToGrade,
    getAssignmentStats,
    filterResourcesByGrade,
    filterResourcesBySkill,
    refetch: fetchAssignments,
  };
}
