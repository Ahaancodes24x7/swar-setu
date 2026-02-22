import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SaathiChatbot } from "@/components/SaathiChatbot";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/hooks/useTranslations";
import { useBadges } from "@/hooks/useBadges";
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

  // Use dynamic badges
  const { badges, loading: badgesLoading, checkAndAwardBadges } = useBadges(student?.id);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!user) return;
      
      // Find the student linked to this parent
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("*")
        .or(`parent_email.eq.${user.email},parent_id.eq.${user.id}`)
        .maybeSingle();

      if (studentData) {
        setStudent(studentData);
        
        // Fetch test sessions for this student
        const { data: sessionsData } = await supabase
          .from("test_sessions")
          .select("*")
          .eq("student_id", studentData.id)
          .order("created_at", { ascending: false })
          .limit(10);
        
        if (sessionsData) {
          setSessions(sessionsData);
          
          // Check and award badges based on current data
          const testsCompleted = sessionsData.length;
          const latestScore = sessionsData[0]?.overall_score ? Number(sessionsData[0].overall_score) : undefined;
          const previousScore = sessionsData[1]?.overall_score ? Number(sessionsData[1].overall_score) : undefined;
          
          checkAndAwardBadges({
            testsCompleted,
            streakDays: studentData.streak_days || 0,
            latestScore,
            previousScore,
          });
        }
      }
      
      setLoading(false);
    };

    if (!authLoading) {
      fetchStudentData();
    }
  }, [user, authLoading, checkAndAwardBadges]);

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

              {/* AI Report Summary */}
              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg">📊 {t.aiLearningReport}</CardTitle>
                  <CardDescription>
                    {student ? `Summary of ${student.name}'s progress` : "Simplified summary of progress"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {cleanSummary ? (
                    <>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        {cleanSummary}
                      </p>
                      {latestReport.recommendations && latestReport.recommendations.length > 0 && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm font-semibold mb-2">{t.recommendations}:</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {latestReport.recommendations.slice(0, 3).map((rec, i) => {
                              const cleanRec = rec.replace(/\(\d+%\s*accuracy\)/gi, "").replace(/\s+/g, " ").trim();
                              return <li key={i}>• {cleanRec}</li>;
                            })}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No tests completed yet. Complete a test to see the AI-generated learning report.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Sessions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    {t.recentSessions}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No test sessions yet. Your child's teacher will conduct assessments.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.slice(0, 5).map((session) => {
                        return (
                          <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-primary/20">
                                <CheckCircle className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm capitalize">{session.test_type} Test</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(session.created_at).toLocaleDateString("en-IN", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric"
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Completed</p>
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
              {/* Achievements - Now Dynamic */}
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

              {/* Learning Resources */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {t.recommendedResources}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Personalized learning activities based on your child's progress
                  </p>
                  <Button 
                    onClick={() => navigate(`/learning-resources${student ? `?studentId=${student.id}` : ''}`)}
                    className="w-full"
                    variant="default"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Explore Learning Resources
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
      </div>
    </Layout>
  );
}
