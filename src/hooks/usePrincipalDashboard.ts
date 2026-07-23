import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getAIPrediction } from "../api/ai";

type Student = Tables<"students">;
type TestSession = Tables<"test_sessions">;

// DEMO MODE: When enabled, principals see ALL teachers and students
// This is for demo/hackathon purposes to ensure full data visibility
const DEMO_MODE = true;

interface GradeStats {
  grade: string;
  students: number;
  tested: number;
  flagged: number;
  avgScore: number;
  flagPercentage: number;
  status: "green" | "yellow" | "red";
}

interface CohortData {
  cohort: string;
  count: number;
  percentage: number;
}

interface TrendData {
  week: string;
  avgScore: number;
  tested: number;
  flagged: number;
}

interface OverallStats {
  totalStudents: number;
  testedStudents: number;
  flaggedStudents: number;
  avgScore: number;
  weeklyChange: number;
}

export function usePrincipalDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // DEMO MODE: Fetch ALL students regardless of teacher/school assignment
      // In production, this would filter by school_id
      const { data: studentsData } = await supabase
        .from("students")
        .select("*")
        .order("grade", { ascending: true });

      // DEMO MODE: Fetch ALL test sessions
      // In production, this would filter by school's students
      const { data: sessionsData } = await supabase
        .from("test_sessions")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (studentsData) setStudents(studentsData);
      if (sessionsData) setSessions(sessionsData);
      
      if (DEMO_MODE) {
        console.log("[DEMO MODE] Principal dashboard loaded all data:", {
          students: studentsData?.length || 0,
          sessions: sessionsData?.length || 0
        });
      }
    } catch (error) {
      console.error("Error fetching principal dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    const studentsChannel = supabase
      .channel("principal-students")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        () => fetchData()
      )
      .subscribe();

    const sessionsChannel = supabase
      .channel("principal-sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "test_sessions" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(sessionsChannel);
    };
  }, [fetchData]);

  // Filter data by selected grade
  const filteredStudents = useMemo(() => {
    if (selectedGrade === "all") return students;
    return students.filter((s) => s.grade === selectedGrade);
  }, [students, selectedGrade]);

  const filteredSessions = useMemo(() => {
    if (selectedGrade === "all") return sessions;
    const studentIds = filteredStudents.map((s) => s.id);
    return sessions.filter((s) => studentIds.includes(s.student_id));
  }, [sessions, filteredStudents, selectedGrade]);

  // Calculate overall stats
  const overallStats: OverallStats = useMemo(() => {
    const testedStudentIds = new Set(filteredSessions.map((s) => s.student_id));
    const flaggedStudents = filteredStudents.filter(
      (s) => s.status === "flagged" || s.status === "at-risk"
    );

    const scores = filteredSessions
      .filter((s) => s.overall_score !== null)
      .map((s) => s.overall_score as number);
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // Calculate weekly change
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const lastWeekSessions = filteredSessions.filter(
      (s) => new Date(s.created_at) >= oneWeekAgo
    );
    const prevWeekSessions = filteredSessions.filter(
      (s) => new Date(s.created_at) >= twoWeeksAgo && new Date(s.created_at) < oneWeekAgo
    );

    const lastWeekAvg = lastWeekSessions.length > 0
      ? lastWeekSessions.reduce((sum, s) => sum + (s.overall_score || 0), 0) / lastWeekSessions.length
      : 0;
    const prevWeekAvg = prevWeekSessions.length > 0
      ? prevWeekSessions.reduce((sum, s) => sum + (s.overall_score || 0), 0) / prevWeekSessions.length
      : 0;

    const weeklyChange = prevWeekAvg > 0 ? Math.round(lastWeekAvg - prevWeekAvg) : 0;

    return {
      totalStudents: filteredStudents.length,
      testedStudents: testedStudentIds.size,
      flaggedStudents: flaggedStudents.length,
      avgScore,
      weeklyChange,
    };
  }, [filteredStudents, filteredSessions]);

  // Get unique grades from students
  const availableGrades = useMemo(() => {
    const grades = [...new Set(students.map((s) => s.grade))].sort();
    return grades;
  }, [students]);

  // Calculate grade-wise stats
  const gradeStats: GradeStats[] = useMemo(() => {
    const grades = selectedGrade === "all" ? availableGrades : [selectedGrade];
    
    return grades.map((grade) => {
      const gradeStudents = students.filter((s) => s.grade === grade);
      const gradeStudentIds = gradeStudents.map((s) => s.id);
      const gradeSessions = sessions.filter((s) => gradeStudentIds.includes(s.student_id));
      
      const testedIds = new Set(gradeSessions.map((s) => s.student_id));
      const flaggedCount = gradeStudents.filter(
        (s) => s.status === "flagged" || s.status === "at-risk"
      ).length;
      
      const scores = gradeSessions
        .filter((s) => s.overall_score !== null)
        .map((s) => s.overall_score as number);
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

      const flagPercentage = gradeStudents.length > 0
        ? (flaggedCount / gradeStudents.length) * 100
        : 0;

      let status: "green" | "yellow" | "red" = "green";
      if (flagPercentage >= 12) status = "red";
      else if (flagPercentage >= 8) status = "yellow";

      return {
        grade: `Grade ${grade}`,
        students: gradeStudents.length,
        tested: testedIds.size,
        flagged: flaggedCount,
        avgScore,
        flagPercentage,
        status,
      };
    });
  }, [students, sessions, availableGrades, selectedGrade]);

  // Calculate cohort distribution
  const cohortData: CohortData[] = useMemo(() => {
    const testedStudentIds = [...new Set(filteredSessions.map((s) => s.student_id))];
    const studentScores: Record<string, number[]> = {};

    filteredSessions.forEach((session) => {
      if (session.overall_score !== null) {
        if (!studentScores[session.student_id]) {
          studentScores[session.student_id] = [];
        }
        studentScores[session.student_id].push(session.overall_score);
      }
    });

    let highPerformers = 0;
    let average = 0;
    let needsSupport = 0;

    testedStudentIds.forEach((studentId) => {
      const scores = studentScores[studentId] || [];
      if (scores.length === 0) return;
      
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avgScore >= 80) highPerformers++;
      else if (avgScore >= 50) average++;
      else needsSupport++;
    });

    const total = highPerformers + average + needsSupport || 1;

    return [
      {
        cohort: "High Performers",
        count: highPerformers,
        percentage: Math.round((highPerformers / total) * 100),
      },
      {
        cohort: "Average",
        count: average,
        percentage: Math.round((average / total) * 100),
      },
      {
        cohort: "Needs Support",
        count: needsSupport,
        percentage: Math.round((needsSupport / total) * 100),
      },
    ];
  }, [filteredSessions]);

  // Calculate trend data (last 8 weeks)
  const trendData: TrendData[] = useMemo(() => {
    const weeks: TrendData[] = [];
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekSessions = filteredSessions.filter((s) => {
        const date = new Date(s.created_at);
        return date >= weekStart && date < weekEnd;
      });

      const scores = weekSessions
        .filter((s) => s.overall_score !== null)
        .map((s) => s.overall_score as number);
      
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

      const testedIds = new Set(weekSessions.map((s) => s.student_id));
      const flaggedCount = weekSessions.filter(
        (s) => s.flagged_conditions && s.flagged_conditions.length > 0
      ).length;

      weeks.push({
        week: weekStart.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        avgScore,
        tested: testedIds.size,
        flagged: flaggedCount,
      });
    }

    return weeks;
  }, [filteredSessions]);

  // Generate report data for export
  const generateReportData = useCallback(() => {
    return {
      generatedAt: new Date().toISOString(),
      overview: overallStats,
      gradeStats,
      cohortData,
      trendData,
      students: filteredStudents.map((s) => ({
        name: s.name,
        grade: s.grade,
        status: s.status,
      })),
    };
  }, [overallStats, gradeStats, cohortData, trendData, filteredStudents]);

  return {
    loading,
    overallStats,
    gradeStats,
    cohortData,
    trendData,
    availableGrades,
    selectedGrade,
    setSelectedGrade,
    generateReportData,
    refetch: fetchData,
  };
}
