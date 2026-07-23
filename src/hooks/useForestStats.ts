import { useMemo } from "react";
import type { Tables } from "@/integrations/supabase/types";

type Student = Tables<"students">;
type TestSession = Tables<"test_sessions">;

interface StudentWithStats extends Student {
  testCount: number;
  averageScore: number;
}

interface ForestStats {
  studentsWithStats: StudentWithStats[];
  sunlight: number; // Engagement - based on tests this week
  water: number; // Assignments - based on resources assigned
  parentInteraction: number; // Based on linked parents
}

export function useForestStats(
  students: Student[],
  testSessions: TestSession[]
): ForestStats {
  const stats = useMemo(() => {
    // Calculate per-student stats
    const studentsWithStats: StudentWithStats[] = students.map(student => {
      const studentSessions = testSessions.filter(s => s.student_id === student.id);
      const completedSessions = studentSessions.filter(s => s.status === 'completed');
      
      const scores = completedSessions
        .filter(s => s.overall_score !== null)
        .map(s => s.overall_score as number);
      
      const averageScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      
      return {
        ...student,
        testCount: completedSessions.length,
        averageScore
      };
    });
    
    // Calculate sunlight (engagement) - tests this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const testsThisWeek = testSessions.filter(s => 
      new Date(s.created_at) > oneWeekAgo && s.status === 'completed'
    ).length;
    
    // Max engagement at ~2 tests per student per week
    const expectedTestsPerWeek = students.length * 2;
    const sunlight = expectedTestsPerWeek > 0 
      ? Math.min(100, Math.round((testsThisWeek / expectedTestsPerWeek) * 100))
      : 0;
    
    // Calculate water (assignments) - simplified, based on test variety
    const uniqueTestTypes = new Set(testSessions.map(s => s.test_type)).size;
    const water = Math.min(100, uniqueTestTypes * 25); // 4 test types = 100%
    
    // Calculate parent interaction
    const linkedParents = students.filter(s => s.parent_email).length;
    const parentInteraction = students.length > 0
      ? Math.round((linkedParents / students.length) * 100)
      : 0;
    
    return {
      studentsWithStats,
      sunlight,
      water,
      parentInteraction
    };
  }, [students, testSessions]);
  
  return stats;
}
