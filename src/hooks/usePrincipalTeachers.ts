import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TeacherInfo {
  id: string;
  user_id: string;
  full_name: string;
  grades: string[];
  subjects: string[];
  institute_name: string | null;
  student_count: number;
  flagged_count: number;
  avg_score: number;
  tests_conducted: number;
}

interface GradeDetail {
  grade: string;
  teachers: TeacherInfo[];
  total_students: number;
  tested_students: number;
  flagged_students: number;
  avg_score: number;
}

// DEMO MODE: When enabled, principals see ALL teachers and students
// This is for demo/hackathon purposes to ensure full data visibility
const DEMO_MODE = true;

export function usePrincipalTeachers() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [gradeDetails, setGradeDetails] = useState<GradeDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeachersAndGrades = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      // DEMO MODE: Fetch ALL teacher profiles regardless of school assignment
      // In production, this would filter by the principal's school_id
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "teacher");

      if (profilesError) throw profilesError;

      // DEMO MODE: Fetch ALL students
      // In production, this would filter by school_id
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("*");

      if (studentsError) throw studentsError;

      // DEMO MODE: Fetch ALL test sessions
      // In production, this would filter by school's students
      const { data: sessions, error: sessionsError } = await supabase
        .from("test_sessions")
        .select("*");

      if (sessionsError) throw sessionsError;
      
      if (DEMO_MODE) {
        console.log("[DEMO MODE] Principal teachers data loaded:", {
          teachers: profiles?.length || 0,
          students: students?.length || 0,
          sessions: sessions?.length || 0
        });
      }

      // Build teacher info
      const teacherInfos: TeacherInfo[] = (profiles || []).map((profile) => {
        const teacherStudents = (students || []).filter(
          (s) => s.teacher_id === profile.user_id
        );
        const teacherSessions = (sessions || []).filter(
          (s) => s.conducted_by === profile.user_id
        );

        const scores = teacherSessions
          .filter((s) => s.overall_score != null)
          .map((s) => Number(s.overall_score));

        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          grades: profile.grades || [],
          subjects: [], // Can be extended
          institute_name: profile.institute_name,
          student_count: teacherStudents.length,
          flagged_count: teacherStudents.filter((s) => s.status === "flagged").length,
          avg_score: scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0,
          tests_conducted: teacherSessions.length,
        };
      });

      setTeachers(teacherInfos);

      // Build grade details
      const allGrades = [...new Set((students || []).map((s) => s.grade))].sort();

      const gradeDetailsList: GradeDetail[] = allGrades.map((grade) => {
        const gradeStudents = (students || []).filter((s) => s.grade === grade);
        const gradeTeachers = teacherInfos.filter(
          (t) => t.grades.some((g) => g.includes(grade))
        );

        // Find teachers who have students in this grade
        const teachersWithStudents = teacherInfos.filter((t) =>
          gradeStudents.some((s) => s.teacher_id === t.user_id)
        );

        const gradeSessions = (sessions || []).filter((s) =>
          gradeStudents.some((st) => st.id === s.student_id)
        );

        const testedStudentIds = new Set(gradeSessions.map((s) => s.student_id));
        const scores = gradeSessions
          .filter((s) => s.overall_score != null)
          .map((s) => Number(s.overall_score));

        return {
          grade: `Grade ${grade}`,
          teachers: teachersWithStudents.length > 0 ? teachersWithStudents : gradeTeachers,
          total_students: gradeStudents.length,
          tested_students: testedStudentIds.size,
          flagged_students: gradeStudents.filter((s) => s.status === "flagged").length,
          avg_score: scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0,
        };
      });

      setGradeDetails(gradeDetailsList);
    } catch (error) {
      console.error("Error fetching teacher data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTeachersAndGrades();
  }, [fetchTeachersAndGrades]);

  // Subscribe to realtime updates
  useEffect(() => {
    const studentsChannel = supabase
      .channel("principal_students")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchTeachersAndGrades()
      )
      .subscribe();

    const sessionsChannel = supabase
      .channel("principal_sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "test_sessions" },
        () => fetchTeachersAndGrades()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(sessionsChannel);
    };
  }, [fetchTeachersAndGrades]);

  const getTeachersByGrade = useCallback(
    (grade: string) => {
      const gradeNumber = grade.replace("Grade ", "");
      return teachers.filter(
        (t) =>
          t.grades.some((g) => g.includes(gradeNumber)) ||
          gradeDetails.some(
            (gd) => gd.grade === grade && gd.teachers.some((gt) => gt.id === t.id)
          )
      );
    },
    [teachers, gradeDetails]
  );

  const getGradeDetail = useCallback(
    (grade: string) => {
      return gradeDetails.find((gd) => gd.grade === grade);
    },
    [gradeDetails]
  );

  return {
    teachers,
    gradeDetails,
    loading,
    getTeachersByGrade,
    getGradeDetail,
    refetch: fetchTeachersAndGrades,
  };
}
