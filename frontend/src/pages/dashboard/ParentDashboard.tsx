import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SaathiChatbot } from "@/components/SaathiChatbot";
import { TestReportDialog } from "@/components/dashboard/TestReportDialog";
import { ResourceViewModal } from "@/components/resources/ResourceViewModal";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/hooks/useTranslations";
import { useBadges } from "@/hooks/useBadges";
import { DEFAULT_SLD_RESOURCES, type LearningResource } from "@/hooks/useLearningResources";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  Trophy,
  Star,
  Flame,
  Target,
  BookOpen,
  Award,
  Zap,
  Calendar,
  CheckCircle,
  Sparkles,
  LogOut,
  Loader2,
  Heart,
  Volume2,
  Calculator,
  Eye,
  TrendingUp,
  FileText,
  Brain,
  Pencil,
  ArrowRight,
} from "lucide-react";

type Student = Tables<"students">;
type TestSession = Tables<"test_sessions">;

// Icon mapping for badges
const iconMap: Record<string, React.ElementType> = {
  Trophy,
  Star,
  Flame,
  Target,
  Zap,
  Award,
  BookOpen,
  Heart,
  Volume2,
  Calculator,
};

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const t = useTranslations();
  const [chatOpen, setChatOpen] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportSession, setSelectedReportSession] = useState<TestSession | null>(null);
  const [selectedResource, setSelectedResource] = useState<LearningResource | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Use dynamic badges
  const { badges, loading: badgesLoading, checkAndAwardBadges } = useBadges(student?.id);
  const fetchStudentDataRef = useRef<() => void>();

  const fetchStudentData = async () => {
    if (!user) return;
    
    let activeStudent: Student | null = null;

    // Find the student linked to this parent in Supabase
    const { data: studentData } = await supabase
      .from("students")
      .select("*")
      .or(`parent_email.eq.${user.email},parent_id.eq.${user.id}`)
      .maybeSingle();

    if (studentData) {
      activeStudent = studentData as Student;
    } else {
      // Local storage fallback for offline / demo students
      try {
        const localData = localStorage.getItem("swar_setu_local_students_v1");
        if (localData && user.email) {
          const parsed: Student[] = JSON.parse(localData);
          const userEmailLower = user.email.toLowerCase().trim();
          const match = parsed.find(
            (s) => s.parent_email && s.parent_email.toLowerCase().trim() === userEmailLower
          );
          if (match) {
            activeStudent = match;
          }
        }
      } catch (e) {
        console.warn("Error reading local student cache in ParentDashboard:", e);
      }
    }

    if (activeStudent) {
      setStudent(activeStudent);
      
      // Fetch test sessions for this student from Supabase
      const { data: sessionsData } = await supabase
        .from("test_sessions")
        .select("*")
        .eq("student_id", activeStudent.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      let mergedSessions: TestSession[] = sessionsData || [];

      // Merge local test sessions cache (swar_setu_local_sessions_v1)
      try {
        const localSessionsRaw = localStorage.getItem("swar_setu_local_sessions_v1");
        if (localSessionsRaw && activeStudent) {
          const parsedLocal: TestSession[] = JSON.parse(localSessionsRaw);
          const studentLocal = parsedLocal.filter((s) => s.student_id === activeStudent.id);
          const remoteIds = new Set(mergedSessions.map((s) => s.id));
          const extraLocal = studentLocal.filter((s) => !remoteIds.has(s.id));
          mergedSessions = [...mergedSessions, ...extraLocal].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
      } catch (e) {
        console.warn("Error reading local test sessions cache:", e);
      }

      setSessions(mergedSessions);
      if (mergedSessions.length > 0 && !selectedSessionId) {
        setSelectedSessionId(mergedSessions[0].id);
      }

      // Check and award badges based on current data
      const testsCompleted = mergedSessions.length;
      const latestScore = mergedSessions[0]?.overall_score ? Number(mergedSessions[0].overall_score) : undefined;
      const previousScore = mergedSessions[1]?.overall_score ? Number(mergedSessions[1].overall_score) : undefined;
      
      checkAndAwardBadges({
        testsCompleted,
        streakDays: activeStudent.streak_days || 0,
        latestScore,
        previousScore,
      });
    }
    
    setLoading(false);
  };

  fetchStudentDataRef.current = fetchStudentData;

  useEffect(() => {
    if (!authLoading) {
      fetchStudentData();
    }
  }, [user, authLoading]);

  // Realtime subscription for test_sessions
  useEffect(() => {
    if (!student?.id) return;

    const channel = supabase
      .channel(`parent_sessions_sub_${student.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "test_sessions",
          filter: `student_id=eq.${student.id}`,
        },
        () => {
          fetchStudentDataRef.current?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [student?.id]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  // Calculate stats from real data
  const totalTests = sessions.length;
  const readingAvg = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (Number(s.reading_score) || 0), 0) / sessions.length)
    : 0;
  const numberAvg = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (Number(s.number_score) || 0), 0) / sessions.length)
    : 0;
  const phonemeAvg = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (Number(s.phoneme_score) || 0), 0) / sessions.length)
    : 0;

  // Get the most recent AI summary
  const latestSession = sessions[0];
  const latestReport = latestSession?.analysis_report as { summary?: string; recommendations?: string[] } | null;
  
  // Remove accuracy percentages from summary for parent view
  const cleanSummary = latestReport?.summary
    ? latestReport.summary.replace(/\(\d+%\s*accuracy\)/gi, "").replace(/\s+/g, " ").trim()
    : null;

  if (authLoading || loading) {
    return (
      <Layout hideFooter hideHeader={true}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideFooter hideHeader={true}>
      <div className="min-h-screen bg-gradient-to-b from-accent/5 to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{t.welcome} 👋</h1>
              <p className="text-muted-foreground">
                {student ? `${t.hereIsProgress.replace("your child", student.name)}` : t.hereIsProgress}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-accent/20 px-4 py-2 rounded-full">
                <Flame className="h-5 w-5 text-accent" />
                <span className="font-semibold">{student?.streak_days || 0} {t.dayStreak}</span>
              </div>
              <Button variant="hero" size="sm" onClick={() => setChatOpen(!chatOpen)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Saathi
              </Button>
              <Button variant="outline" size="icon" onClick={handleLogout} title={t.logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-accent/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Star className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{student?.total_points || 0}</p>
                    <p className="text-xs text-muted-foreground">{t.totalPoints}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-success/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalTests}</p>
                    <p className="text-xs text-muted-foreground">{t.testsDone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Progress Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    {t.learningProgress}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <span className="text-sm font-medium">{t.readingSkills}</span>
                    <Progress value={readingAvg} className="h-3 mt-2" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">{t.numberRecognition}</span>
                    <Progress value={numberAvg} className="h-3 mt-2" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">{t.phonemeAccuracy}</span>
                    <Progress value={phonemeAvg} className="h-3 mt-2" />
                  </div>
                </CardContent>
              </Card>

              {/* AI Report Summary with Session Selector */}
              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        📊 {t.aiLearningReport}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {student ? `Simplified summary of ${student.name}'s progress` : "Simplified summary of progress"}
                      </CardDescription>
                    </div>

                    {sessions.length > 1 && (
                      <Select
                        value={selectedSessionId || sessions[0]?.id}
                        onValueChange={(val) => setSelectedSessionId(val)}
                      >
                        <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                          <SelectValue placeholder="Select Session" />
                        </SelectTrigger>
                        <SelectContent>
                          {sessions.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              {s.test_type.toUpperCase()} - {new Date(s.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const currentSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];
                    if (!currentSession) {
                      return (
                        <p className="text-sm text-muted-foreground">
                          No tests completed yet. When your child takes a test, the AI summary and report will appear here.
                        </p>
                      );
                    }

                    const report = currentSession.analysis_report as { summary?: string; recommendations?: string[] } | null;
                    const rawSummary = report?.summary || "";
                    const cleanSummary = rawSummary
                      ? rawSummary.replace(/\(\d+%\s*accuracy\)/gi, "").replace(/\s+/g, " ").trim()
                      : `${student?.name || "Your child"} completed a ${currentSession.test_type} assessment. They showed encouraging engagement and steady progress. Gentle multi-sensory practice and consistent reading routine are recommended.`;

                    return (
                      <>
                        <div className="flex items-center justify-between text-xs text-muted-foreground bg-background/60 px-3 py-1.5 rounded-md">
                          <span className="font-semibold text-foreground capitalize">{currentSession.test_type} Screening Test</span>
                          <span>Completed on {new Date(currentSession.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {cleanSummary}
                        </p>

                        {report?.recommendations && report.recommendations.length > 0 && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                              <Target className="h-3.5 w-3.5 text-primary" />
                              {t.recommendations} for Home Practice:
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-1.5">
                              {report.recommendations.slice(0, 3).map((rec, i) => {
                                const cleanRec = rec.replace(/\(\d+%\s*accuracy\)/gi, "").replace(/\s+/g, " ").trim();
                                return <li key={i}>• {cleanRec}</li>;
                              })}
                            </ul>
                          </div>
                        )}

                        <div className="flex justify-end pt-1">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setSelectedReportSession(currentSession)}
                          >
                            <FileText className="h-4 w-4 mr-1.5" />
                            View Full Detailed Report
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Recent Sessions List with Direct Report Action */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    {t.recentSessions}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No test sessions recorded yet. Your child's teacher will conduct assessments.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.slice(0, 5).map((session) => {
                        return (
                          <div
                            key={session.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg bg-muted/50 gap-3 transition-colors hover:bg-muted/70"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-primary/20 shrink-0">
                                {session.test_type === "dyslexia" ? (
                                  <BookOpen className="h-5 w-5 text-primary" />
                                ) : session.test_type === "dyscalculia" ? (
                                  <Brain className="h-5 w-5 text-primary" />
                                ) : session.test_type === "dysgraphia" ? (
                                  <Pencil className="h-5 w-5 text-primary" />
                                ) : (
                                  <CheckCircle className="h-5 w-5 text-primary" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm capitalize">{session.test_type} Screening Test</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(session.created_at).toLocaleDateString("en-IN", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric"
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              {session.overall_score !== null && (
                                <Badge variant="secondary" className="text-xs">
                                  Score: {Math.round(Number(session.overall_score))}%
                                </Badge>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedReportSession(session)}
                                className="h-8 text-xs"
                              >
                                <FileText className="h-3.5 w-3.5 mr-1 text-primary" />
                                View Report
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Dynamic Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-accent" />
                    {t.achievements}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {badgesLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {badges.slice(0, 6).map((badgeProgress) => {
                        const IconComponent = iconMap[badgeProgress.badge.icon] || Trophy;
                        return (
                          <div 
                            key={badgeProgress.badge.id}
                            className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                              badgeProgress.earned 
                                ? "bg-accent/10 scale-100" 
                                : "bg-muted/50 opacity-50 grayscale"
                            }`}
                            title={badgeProgress.earned 
                              ? `${badgeProgress.badge.name} - Earned!` 
                              : `${badgeProgress.badge.name} - ${badgeProgress.badge.description}`
                            }
                          >
                            <IconComponent className={`h-6 w-6 mb-1 ${
                              badgeProgress.earned ? "text-accent" : "text-muted-foreground"
                            }`} />
                            <span className="text-[10px] text-center text-muted-foreground">
                              {badgeProgress.badge.name}
                            </span>
                            {badgeProgress.earned && (
                              <span className="text-[8px] text-accent mt-1">✓ Earned</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {badges.filter(b => b.earned).length > 0 && (
                    <div className="mt-4 p-2 bg-accent/10 rounded-lg text-center">
                      <p className="text-xs font-medium text-accent">
                        🎉 {badges.filter(b => b.earned).length} badges earned!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Featured SLD Learning Resources */}
              <Card className="border border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Featured SLD Resources
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      {DEFAULT_SLD_RESOURCES.length}+ Available
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Curated diagnostic checklists, practice tests, and parent manuals for SLD support.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {DEFAULT_SLD_RESOURCES.slice(0, 3).map((resource) => (
                      <div
                        key={resource.id}
                        onClick={() => setSelectedResource(resource)}
                        className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-all space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {resource.category || resource.resource_type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {resource.duration_minutes} mins
                          </span>
                        </div>
                        <p className="font-semibold text-xs text-foreground line-clamp-1">{resource.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{resource.description}</p>
                      </div>
                    ))}
                  </div>

                  <Button 
                    onClick={() => navigate(`/learning-resources${student ? `?studentId=${student.id}` : ''}`)}
                    className="w-full text-xs"
                    variant="default"
                  >
                    Explore All Resources
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Saathi Chatbot with voice support */}
        <SaathiChatbot 
          studentName={student?.name || "Student"} 
          studentId={student?.id}
          isOpen={chatOpen} 
          onClose={() => setChatOpen(false)}
          userRole="parent"
          userGrade={student?.grade || "3"}
        />

        {/* Test Report Dialog for detailed view */}
        {selectedReportSession && (
          <TestReportDialog
            session={{
              ...selectedReportSession,
              student: student ? { name: student.name, grade: student.grade } : undefined,
            } as any}
            open={!!selectedReportSession}
            onOpenChange={(open) => !open && setSelectedReportSession(null)}
            simplified={true}
          />
        )}

        {/* Resource View Modal for in-app viewing */}
        <ResourceViewModal
          resource={selectedResource}
          isOpen={!!selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      </div>
    </Layout>
  );
}
