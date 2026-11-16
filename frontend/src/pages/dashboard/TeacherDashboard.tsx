import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useStudents } from "@/hooks/useStudents";
import { useForestStats } from "@/hooks/useForestStats";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/hooks/useTranslations";
import { supabase } from "@/integrations/supabase/client";
import { generatePdfReport } from "@/lib/generatePdfReport";
import { toast } from "sonner";
import { DSM5DyslexiaTest } from "@/components/tests/DSM5DyslexiaTest";
import { DSM5DyscalculiaTest } from "@/components/tests/DSM5DyscalculiaTest";
import { DysgraphiaCanvas } from "@/components/tests/DysgraphiaCanvas";
import { PerceptionTest } from "@/components/tests/PerceptionTest";
import { ForestScene } from "@/components/forest/ForestScene";
import { ForestViewToggle } from "@/components/forest/ForestViewToggle";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LeafIcon, STAGE_LABELS, getTreeStage, type TreeStage } from "@/components/forest/StudentTree";
import type { Tables } from "@/integrations/supabase/types";
import { 
  Users, Plus, Trash2, Mic, FileText, AlertTriangle, CheckCircle, Mail, 
  Search, Download, Loader2, LogOut, BookOpen, Calculator, Pencil, 
  ArrowLeft, TrendingUp, X, Eye, Brain, ArrowUpDown, Check, HelpCircle, ClipboardList, Lock, ListChecks,
  Bell, Sprout, CalendarDays, BarChart3, Link2, ArrowRight
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup, 
  DropdownMenuRadioItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { TestReportDialog } from "@/components/dashboard/TestReportDialog";
import { AIResultPanel } from "@/components/dashboard/AIResultPanel";
import { StudentProfileDialog } from "@/components/profile/StudentProfileDialog";
import { AIPredictionResult, AssessmentPayload, getAIPrediction, getUnifiedProfile } from "@/api/ai";
import { StudentProgressModal } from "@/components/dashboard/StudentProgressModal";
import { SingleTestPermissionDialog } from "@/components/dashboard/SingleTestPermissionDialog";
import {
  BATTERY, DisorderTest, ScreeningMode, TEST_LABELS, buildUnifiedRequest, newBatteryId, protocolFor,
} from "@/lib/screeningBattery";

type TestSession = Tables<"test_sessions">;
type Student = Tables<"students">;

interface SessionWithStudent extends TestSession {
  student?: Student;
}

type TestType = null | "dyslexia" | "dyscalculia" | "dysgraphia" | "perception";
type ViewMode = "forest" | "classic";
type SortOption = "name" | "grade" | "status";

// One screening session: the full DSM-5 battery (all three tests) or a teacher-permitted single test
interface ScreeningRun {
  mode: ScreeningMode;
  batteryId: string;
  tests: DisorderTest[];
  step: number; // index into tests of the test being taken
  reason?: string;
  payloads: Partial<Record<DisorderTest, AssessmentPayload>>;
}
type RunStage = "test" | "between" | "scoring" | "done";

const NAV = [
  { value: "students", label: "Learning Forest", icon: Sprout },
  { value: "tests", label: "Assessments", icon: ClipboardList },
  { value: "reports", label: "Reports", icon: BarChart3 },
  { value: "resources", label: "Resources", icon: BookOpen },
] as const;

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("name");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: "", grade: "", parentEmail: "" });
  // student whose DSM-5 profile/questionnaire dialog is open (opens right after a student is added)
  const [profileStudent, setProfileStudent] = useState<{ id: string; name: string; grade: string } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [testSessions, setTestSessions] = useState<SessionWithStudent[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("forest");
  const [tab, setTab] = useState("students");
  const [stageFilter, setStageFilter] = useState<TreeStage[] | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [parentsOpen, setParentsOpen] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);
  const [reportSession, setReportSession] = useState<SessionWithStudent | null>(null);
  const [progressModalStudent, setProgressModalStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editParentEmail, setEditParentEmail] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  
  // Test selection state
  const [selectedTest, setSelectedTest] = useState<TestType>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [lastAIResult, setLastAIResult] = useState<AIPredictionResult | null>(null);
  const [run, setRun] = useState<ScreeningRun | null>(null);
  const [runStage, setRunStage] = useState<RunStage>("test");
  const [permissionRequest, setPermissionRequest] = useState<{ test: DisorderTest; student: Student } | null>(null);

  const { students, loading, addStudent, updateStudent, deleteStudent } = useStudents();
  const forestStats = useForestStats(students, testSessions);

  const handleOpenEdit = (studentToEdit: Student) => {
    setEditingStudent(studentToEdit);
    setEditParentEmail(studentToEdit.parent_email || "");
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    setIsSavingEdit(true);
    await updateStudent(editingStudent.id, { parentEmail: editParentEmail });
    setEditingStudent(null);
    setIsSavingEdit(false);
  };

  // Fetch test sessions
  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("test_sessions")
        .select("*")
        .eq("conducted_by", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (!error && data) {
        const enrichedSessions = data.map(session => {
          const student = students.find(s => s.id === session.student_id);
          return { ...session, student };
        });
        setTestSessions(enrichedSessions);
      }
      setLoadingSessions(false);
    };

    if (!loading) {
      fetchSessions();
    }
  }, [user, students, loading]);

  // Calculate tests this week
  const testsThisWeek = testSessions.filter(s => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(s.created_at) > weekAgo;
  }).length;

  const handleExportPdf = async (session: SessionWithStudent) => {
    if (!session.student) return;

    const { data: analysis } = await supabase
      .from("voice_analysis")
      .select("*")
      .eq("session_id", session.id)
      .maybeSingle();

    generatePdfReport({
      student: session.student,
      session,
      analysis,
      conductedBy: user?.user_metadata?.full_name || "Teacher",
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort students based on selected sort option
  const sortedStudents = useMemo(() => {
    const sorted = [...filteredStudents];
    
    switch (sortOption) {
      case "name":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "grade":
        return sorted.sort((a, b) => {
          const gradeA = parseInt(a.grade) || 0;
          const gradeB = parseInt(b.grade) || 0;
          return gradeA - gradeB;
        });
      case "status":
        // Flagged students first, then normal
        return sorted.sort((a, b) => {
          if (a.status === "flagged" && b.status !== "flagged") return -1;
          if (a.status !== "flagged" && b.status === "flagged") return 1;
          return a.name.localeCompare(b.name);
        });
      default:
        return sorted;
    }
  }, [filteredStudents, sortOption]);

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.grade) return;
    setIsAdding(true);
    const created = await addStudent(newStudent);
    setNewStudent({ name: "", grade: "", parentEmail: "" });
    setDialogOpen(false);
    setIsAdding(false);
    // next step after the grade: the teacher/operator fills in the student profile and DSM-5 questionnaire
    if (created) setProfileStudent({ id: created.id, name: created.name, grade: created.grade });
  };

  const handleDeleteStudent = async (id: string) => {
    if (confirm("Are you sure you want to remove this student?")) {
      await deleteStudent(id);
    }
  };

  const launch = (testType: TestType, student: Student, newRun: ScreeningRun | null) => {
    setRun(newRun);
    setRunStage("test");
    setSelectedTest(testType);
    setSelectedStudent(student);
    setSelectedStudentForDetail(null);
    setLastAIResult(null);
  };

  // Default: all three DSM-5 tests, scored together by the comprehensive model
  const startFullScreening = (student: Student) =>
    launch(BATTERY[0], student, { mode: "full", batteryId: newBatteryId(), tests: [...BATTERY], step: 0, payloads: {} });

  // A single DSM-5 test needs the teacher's explicit permission (see SingleTestPermissionDialog)
  const requestSingleTest = (test: DisorderTest, student: Student) => setPermissionRequest({ test, student });

  const startPermittedSingleTest = (reason: string) => {
    if (!permissionRequest) return;
    const { test, student } = permissionRequest;
    setPermissionRequest(null);
    launch(test, student, { mode: "single", batteryId: newBatteryId(), tests: [test], step: 0, reason, payloads: {} });
  };

  // Perception is a supplementary task, not one of the three DSM-5 tests
  const startPerception = (student: Student) => launch("perception", student, null);

  const exitTest = () => {
    if (run?.mode === "full" && runStage !== "done") {
      const done = run.step + (runStage === "between" ? 1 : 0);
      if (!confirm(`The DSM-5 screening is incomplete (${done} of ${BATTERY.length} tests done). Completed tests are saved, ` +
                   "but no combined screening result will be produced. Leave anyway?")) return;
    }
    setSelectedTest(null);
    setSelectedStudent(null);
    setRun(null);
    setLastAIResult(null);
  };

  const continueBattery = () => {
    if (!run) return;
    const step = run.step + 1;
    setRun({ ...run, step });
    setSelectedTest(run.tests[step]);
    setRunStage("test");
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudentForDetail(student);
  };

  const refreshSessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("test_sessions")
      .select("*")
      .eq("conducted_by", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setTestSessions(data.map(session => ({ ...session, student: students.find(s => s.id === session.student_id) })));
    }
  };

  const handleTestComplete = async (results: any) => {
    const isDsm5Test = run && results?.testType && results.testType !== "perception";
    if (isDsm5Test && user && selectedStudent) {
      await saveSession(results);
      const test = run.tests[run.step];
      const payloads = results.aiPayload ? { ...run.payloads, [test]: results.aiPayload } : run.payloads;
      setRun({ ...run, payloads });

      if (run.mode === "full" && run.step < run.tests.length - 1) {
        setRunStage("between");
      } else if (run.mode === "full") {
        // all three tests done: one comprehensive DSM-5 screen on the full 64-feature profile
        setRunStage("scoring");
        let unified: AIPredictionResult | null = null;
        try {
          unified = await getUnifiedProfile(buildUnifiedRequest(payloads, selectedStudent.id));
        } catch (e) {
          console.error("Comprehensive screening failed:", e);
        }
        if (!unified) toast.error("Could not compute the combined screening result. The three tests are saved.");
        setLastAIResult(unified);
        setRunStage("done");
      } else {
        // teacher-permitted single test: the single-test model for that domain
        if (results.aiPayload) {
          setLastAIResult(await getAIPrediction({ ...results.aiPayload, student_id: selectedStudent.id }));
        }
        setRunStage("done");
      }
      await refreshSessions();
      return;
    }

    // supplementary perception task: nothing to score, return to the dashboard
    await refreshSessions();
    setSelectedTest(null);
    setSelectedStudent(null);
    setRun(null);
  };

  const saveSession = async (results: any) => {
    try {
      if (user && selectedStudent && run) {
        const summary =
          typeof results.summary === "string" && results.summary.trim()
            ? results.summary
            : "Assessment completed.";

        const recommendations = Array.isArray(results.recommendations)
          ? results.recommendations
          : [];

        const overallScore = typeof results.overallScore === "number" && !isNaN(results.overallScore)
          ? results.overallScore
          : 0;

        const analysisReport: Record<string, any> = {
          riskLevel: results.riskLevel || "low",
          summary,
          recommendations,
          subtestScores: results.subtestScores || [],
          flaggedConditions: results.flaggedConditions || [],
          errorPatterns: results.errorTypeCounts || {},
          answeredQuestions: results.answeredQuestions || [],
          // full three-test DSM-5 screening, or a single test with the teacher's recorded permission
          screening_protocol: protocolFor(run.mode, run.batteryId, run.step + 1, user.id, run.reason),
        };

        const { error: insertError } = await supabase.from("test_sessions").insert({
          student_id: selectedStudent.id,
          conducted_by: user.id,
          test_type: String(results.testType),
          status: "completed",
          completed_at: new Date().toISOString(),
          overall_score: overallScore,
          reading_score: results.pronunciationConsistency || null,
          number_score: results.numberSenseScore || results.calculationScore || null,
          phoneme_score: results.phonemeErrorRate != null ? (100 - results.phonemeErrorRate) : null,
          flagged_conditions: Array.isArray(results.flaggedConditions) ? results.flaggedConditions : null,
          analysis_report: analysisReport,
        });

        if (insertError) {
          console.error("DB insert error:", insertError);
          toast.error("Failed to save test session");
        } else {
          toast.success("Test results saved successfully!");
        }
      }
    } catch (e) {
      console.error("Failed to persist test session:", e);
      toast.error("Failed to save test results");
    }
  };

  if (selectedTest && selectedStudent) {
    const nextTest = run && run.step + 1 < run.tests.length ? run.tests[run.step + 1] : null;
    const testsDone = run ? run.step + (runStage === "test" ? 0 : 1) : 0;
    return (
      <Layout hideFooter hideHeader={true}>
        <div className="min-h-screen bg-muted/20 py-8">
          <div className="container mx-auto px-4">
            <Button
              variant="ghost"
              className="mb-6"
              onClick={exitTest}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Button>

            {run?.mode === "full" && (
              <Card className="mx-auto mb-6 w-full max-w-2xl">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold flex items-center gap-2">
                      <ListChecks className="h-4 w-4" /> DSM-5 screening for {selectedStudent.name}
                    </span>
                    <span className="text-muted-foreground">{testsDone} of {run.tests.length} tests done</span>
                  </div>
                  <Progress value={(testsDone / run.tests.length) * 100} />
                  <div className="flex flex-wrap gap-2">
                    {run.tests.map((test, i) => (
                      <Badge key={test} variant={i < testsDone ? "default" : i === run.step ? "secondary" : "outline"}>
                        {i < testsDone ? "✓ " : ""}{TEST_LABELS[test]}
                      </Badge>
                    ))}
                  </div>
                  {runStage === "between" && nextTest && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md bg-muted p-3">
                      <p className="text-sm">
                        {TEST_LABELS[run.tests[run.step]]} complete. Give the child a short break if needed, then continue
                        with the {TEST_LABELS[nextTest].toLowerCase()}.
                      </p>
                      <Button onClick={continueBattery}>Start {TEST_LABELS[nextTest]}</Button>
                    </div>
                  )}
                  {runStage === "scoring" && (
                    <p className="text-sm flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Combining all three tests into one DSM-5 screening result…
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
            {run?.mode === "single" && (
              <Card className="mx-auto mb-6 w-full max-w-2xl border-dashed">
                <CardContent className="pt-6 text-sm flex items-start gap-2">
                  <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    Single test permitted by the teacher ({run.reason}). It screens one domain only; run the full DSM-5
                    screening for a combined result across reading, math and writing.
                  </span>
                </CardContent>
              </Card>
            )}
            {runStage === "done" && (
              <div className="mx-auto mb-6 w-full max-w-2xl space-y-4">
                {lastAIResult && <AIResultPanel result={lastAIResult} />}
                <div className="flex justify-end">
                  <Button onClick={exitTest}>Back to dashboard</Button>
                </div>
              </div>
            )}

            {selectedTest === "dyslexia" && (
              <DSM5DyslexiaTest
                studentName={selectedStudent.name}
                studentGrade={`Grade ${selectedStudent.grade}`}
                studentId={selectedStudent.id}
                onComplete={handleTestComplete}
              />
            )}
            {selectedTest === "dyscalculia" && (
              <DSM5DyscalculiaTest
                studentName={selectedStudent.name}
                studentGrade={`Grade ${selectedStudent.grade}`}
                studentId={selectedStudent.id}
                onComplete={handleTestComplete}
              />
            )}
            {selectedTest === "dysgraphia" && (
              <DysgraphiaCanvas
                studentName={selectedStudent.name}
                studentGrade={`Grade ${selectedStudent.grade}`}
                studentId={selectedStudent.id}
                onComplete={handleTestComplete}
              />
            )}
            {selectedTest === "perception" && (
              <PerceptionTest
                studentName={selectedStudent.name}
                studentGrade={`Grade ${selectedStudent.grade}`}
                studentId={selectedStudent.id}
                onComplete={handleTestComplete}
              />
            )}
          </div>
        </div>
      </Layout>
    );
  }

  const awaitingFirst = forestStats.studentsWithStats.filter((s) => s.testCount === 0).length;
  const parentsConnected = students.filter((s) => s.parent_email).length;
  const teacherName: string = user?.user_metadata?.full_name || user?.email || "Teacher";
  const recentSessions = testSessions.slice(0, 6);
  const goTab = (value: string) => {
    setTab(value);
    if (value === "students") setViewMode("forest");
  };

  return (
    <Layout hideFooter hideHeader={true}>
      <div className="min-h-screen bg-[hsl(42_55%_95%)] dark:bg-background">
        {/* ===== top bar ===== */}
        <header className="sticky top-0 z-40 border-b border-[hsl(40_30%_86%)] bg-[hsl(42_55%_95%/0.92)] backdrop-blur dark:border-border dark:bg-background/90">
          <div className="container mx-auto flex h-16 items-center gap-3 px-4">
            <Link to="/" className="shrink-0" aria-label="Swar-Setu home">
              <BrandLogo size="sm" />
            </Link>
            <span className="mx-2 hidden h-7 w-px bg-border lg:block" />
            <nav className="hidden items-center gap-1 lg:flex" data-tour="teacher-tabs">
              {NAV.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => (value === "resources" ? navigate("/dashboard/teacher/resources") : goTab(value))}
                  data-tour={value === "resources" ? "teacher-resources" : undefined}
                  className={`group flex items-center gap-2 rounded-xl px-4 py-2 text-[15px] font-semibold transition ${
                    tab === value ? "bg-leaf/20 text-forest dark:text-leaf" : "text-foreground/80 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4 transition-transform group-hover:-rotate-6 group-hover:scale-110" />
                  {label}
                </button>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-1.5">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/dashboard/teacher/help")} aria-label="Help" data-tour="teacher-help">
                <HelpCircle className="h-5 w-5" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Recent sessions">
                    <Bell className="h-5 w-5" />
                    {testsThisWeek > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 animate-pulse rounded-full bg-[hsl(14_90%_56%)] ring-2 ring-[hsl(42_55%_95%)]" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 rounded-2xl p-2">
                  <p className="px-2 py-1.5 text-sm font-semibold">Recent sessions</p>
                  {recentSessions.length === 0 ? (
                    <p className="px-2 pb-2 text-sm text-muted-foreground">No sessions yet. Start one from the forest.</p>
                  ) : (
                    recentSessions.map((s) => (
                      <button key={s.id} type="button" onClick={() => setReportSession(s)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-muted">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-leaf/20 text-forest dark:text-leaf">
                          <Sprout className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{s.student?.name ?? "Learner"}</span>
                          <span className="block truncate text-xs capitalize text-muted-foreground">{s.test_type} · {new Date(s.created_at).toLocaleDateString()}</span>
                        </span>
                      </button>
                    ))
                  )}
                </PopoverContent>
              </Popover>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-forest text-base font-bold text-forest-foreground shadow-sm transition hover:scale-105 active:scale-95" aria-label="Account">
                    {teacherName.charAt(0).toUpperCase()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{teacherName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard/teacher/help")}><HelpCircle className="mr-2 h-4 w-4" />Help &amp; guides</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard/teacher/resources")}><BookOpen className="mr-2 h-4 w-4" />Resources</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />{t.logout}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* phone / tablet nav */}
          <nav className="container mx-auto flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
            {NAV.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => (value === "resources" ? navigate("/dashboard/teacher/resources") : goTab(value))}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                  tab === value ? "bg-forest text-forest-foreground" : "bg-white/70 text-foreground/80 dark:bg-white/5"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </header>

        <div className="container mx-auto px-4 pb-12 pt-6">
          {/* ===== title ===== */}
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Sprout className="h-12 w-12 shrink-0 text-leaf sm:h-14 sm:w-14" strokeWidth={2.4} />
              <div>
                <h1 className="flex flex-wrap items-center gap-3 text-3xl font-extrabold tracking-tight text-forest sm:text-4xl dark:text-leaf" data-tour="teacher-title">
                  Your learning forest
                  <span className="rounded-full bg-leaf/20 px-3 py-1 text-xs font-semibold tracking-normal text-forest dark:text-leaf">
                    {students.length} {students.length === 1 ? "tree" : "trees"} growing
                  </span>
                </h1>
                <p className="mt-1 text-base text-muted-foreground">Every learner has a place to grow.</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="group h-12 rounded-2xl bg-forest px-6 text-base font-bold text-forest-foreground shadow-[0_5px_0_hsl(152_64%_10%)] hover:bg-forest hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_hsl(152_64%_10%)]" data-tour="add-student">
                  <Plus className="mr-1 h-5 w-5 transition-transform group-hover:rotate-90" />Add student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><Sprout className="h-5 w-5 text-leaf" /> Plant a new seed</DialogTitle>
                  <DialogDescription>Add a learner to your forest. You will fill in their profile next.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>{t.studentName}</Label>
                    <Input value={newStudent.name} onChange={(e) => setNewStudent(p => ({ ...p, name: e.target.value }))} placeholder="Full name" autoFocus />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.grade}</Label>
                    <Input value={newStudent.grade} onChange={(e) => setNewStudent(p => ({ ...p, grade: e.target.value }))} placeholder="e.g., 3" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.parentEmail} (Optional)</Label>
                    <Input value={newStudent.parentEmail} onChange={(e) => setNewStudent(p => ({ ...p, parentEmail: e.target.value }))} type="email" placeholder="parent@email.com" />
                  </div>
                  <Button className="w-full bg-forest text-forest-foreground hover:bg-forest hover:brightness-110" onClick={handleAddStudent} disabled={isAdding || !newStudent.name || !newStudent.grade}>
                    {isAdding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.loading}</> : "Plant & continue to profile"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* ===== stats strip ===== */}
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-3xl border border-[hsl(40_30%_84%)] bg-[hsl(42_60%_97%)] p-2 shadow-sm lg:grid-cols-4 dark:border-border dark:bg-card" data-tour="teacher-stats">
            {([
              { icon: Users, tone: "text-forest dark:text-leaf", value: students.length, label: students.length === 1 ? "learner" : "learners", onClick: () => { setStageFilter(null); goTab("students"); }, active: false },
              { icon: Sprout, tone: "text-leaf", value: awaitingFirst, label: "awaiting first assessment", onClick: () => { setStageFilter(["seed"]); goTab("students"); }, active: stageFilter?.length === 1 && stageFilter[0] === "seed" },
              { icon: CalendarDays, tone: "text-forest dark:text-leaf", value: testsThisWeek, label: testsThisWeek === 1 ? "session this week" : "sessions this week", onClick: () => goTab("reports"), active: false },
              { icon: Users, tone: "text-amber", value: parentsConnected, label: parentsConnected === 1 ? "parent connected" : "parents connected", onClick: () => setParentsOpen(true), active: false },
            ]).map(({ icon: Icon, tone, value, label, onClick, active }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className={`stat-chip flex items-center justify-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-white dark:hover:bg-white/5 ${active ? "bg-leaf/15 ring-1 ring-leaf/50" : ""}`}
              >
                <Icon className={`stat-icon h-6 w-6 shrink-0 ${tone}`} strokeWidth={2.4} />
                <span className="text-sm sm:text-base">
                  <b className="mr-1 text-lg">{value}</b>
                  {label}
                </span>
              </button>
            ))}
          </div>

          {lastAIResult && (
            <div className="mb-8" data-tour="ai-result">
              <AIResultPanel result={lastAIResult} />
            </div>
          )}

          <Tabs value={tab} onValueChange={goTab} className="space-y-6">
            {(tab !== "students" || viewMode === "classic") && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="students">{t.students}</TabsTrigger>
                  <TabsTrigger value="tests">{t.conductTests}</TabsTrigger>
                  <TabsTrigger value="reports">{t.reports}</TabsTrigger>
                </TabsList>
                {tab === "students" && <ForestViewToggle view={viewMode} onViewChange={setViewMode} />}
              </div>
            )}

            <TabsContent value="students">
              {viewMode === "forest" ? (
                <ForestScene
                  students={forestStats.studentsWithStats}
                  selectedId={selectedStudentForDetail?.id ?? null}
                  onSelect={setSelectedStudentForDetail}
                  onStartScreening={startFullScreening}
                  onViewProfile={(s) => setProfileStudent(s)}
                  onViewHistory={(s) => setProgressModalStudent(s)}
                  onSingleTest={requestSingleTest}
                  onPerception={startPerception}
                  onPlanSession={() => setPlanOpen(true)}
                  onOpenParents={() => setParentsOpen(true)}
                  onAddStudent={() => setDialogOpen(true)}
                  onShowList={() => setViewMode("classic")}
                  parentsConnected={parentsConnected}
                  sunlight={forestStats.sunlight}
                  rain={forestStats.parentInteraction > 50}
                  stageFilter={stageFilter}
                  onStageFilterChange={setStageFilter}
                />
              ) : (
                // Classic Table View
                <Card>
                  <CardHeader>
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      <div>
                        <CardTitle>{t.students}</CardTitle>
                        <CardDescription>Manage your classroom students</CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 sm:flex-initial sm:w-48">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder={t.searchStudents} className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2">
                              <ArrowUpDown className="h-4 w-4" />
                              <span>Sort</span>
                              <Check className="h-4 w-4 ml-1 text-primary" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                              <DropdownMenuRadioItem value="name">
                                <span>Sort by Name (A-Z)</span>
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="grade">
                                <span>Sort by Grade</span>
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="status">
                                <span>Sort by Status (Flagged First)</span>
                              </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8"><Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" /></div>
                    ) : students.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">{t.noStudentsFound}</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto -mx-1">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t.studentName}</TableHead>
                              <TableHead>{t.grade}</TableHead>
                              <TableHead>{t.status}</TableHead>
                              <TableHead>Parent</TableHead>
                              <TableHead className="text-center min-w-[140px]">{t.studentProgress}</TableHead>
                              <TableHead className="text-right">{t.actions}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                          {sortedStudents.map((student) => (
                            <TableRow key={student.id}>
                              <TableCell className="font-medium">{student.name}</TableCell>
                              <TableCell>Grade {student.grade}</TableCell>
                              <TableCell>
                                {student.status === "flagged" ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded-full">
                                    <AlertTriangle className="h-3 w-3" />Flagged
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                                    <CheckCircle className="h-3 w-3" />Normal
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {student.parent_email ? (
                                  <span className="text-xs font-medium text-success flex items-center gap-1 cursor-pointer hover:underline" onClick={() => handleOpenEdit(student)} title={`Click to edit: ${student.parent_email}`}>
                                    <CheckCircle className="h-4 w-4 text-success shrink-0" />
                                    <span className="truncate max-w-[120px]">{student.parent_email}</span>
                                  </span>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-muted-foreground hover:text-foreground p-1"
                                    onClick={() => handleOpenEdit(student)}
                                  >
                                    <Mail className="h-3.5 w-3.5 mr-1" />
                                    + Link Email
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell className="text-center min-w-[140px]">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setProgressModalStudent(student)}
                                >
                                  <TrendingUp className="h-4 w-4 mr-1 shrink-0" />
                                  <span className="whitespace-nowrap">{t.studentProgress}</span>
                                </Button>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {/* Test Selection Dropdown */}
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Mic className="h-4 w-4 mr-1" />
                                        {t.startTest}
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Screen {student.name}</DialogTitle>
                                        <DialogDescription>
                                          A screening includes all three DSM-5 tests. Single tests need your permission.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="grid gap-4 pt-4">
                                        <Button
                                          className="h-auto py-4 justify-start"
                                          onClick={() => startFullScreening(student)}
                                        >
                                          <div className="h-10 w-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center mr-4">
                                            <ListChecks className="h-5 w-5" />
                                          </div>
                                          <div className="text-left">
                                            <p className="font-semibold">DSM-5 screening (all 3 tests)</p>
                                            <p className="text-xs opacity-80">Reading → math → writing, one combined result</p>
                                          </div>
                                        </Button>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 pt-2">
                                          <Lock className="h-3 w-3" /> Single test (teacher permission required)
                                        </p>
                                        <Button
                                          variant="outline"
                                          className="h-auto py-4 justify-start"
                                          onClick={() => requestSingleTest("dyslexia", student)}
                                        >
                                          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center mr-4">
                                            <BookOpen className="h-5 w-5 text-primary" />
                                          </div>
                                          <div className="text-left">
                                            <p className="font-semibold">{t.dyslexiaTest}</p>
                                            <p className="text-xs text-muted-foreground">DSM-5 reading assessment</p>
                                          </div>
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          className="h-auto py-4 justify-start"
                                          onClick={() => requestSingleTest("dyscalculia", student)}
                                        >
                                          <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center mr-4">
                                            <Calculator className="h-5 w-5 text-accent" />
                                          </div>
                                          <div className="text-left">
                                            <p className="font-semibold">{t.dyscalculiaTest}</p>
                                            <p className="text-xs text-muted-foreground">DSM-5 number assessment</p>
                                          </div>
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          className="h-auto py-4 justify-start"
                                          onClick={() => requestSingleTest("dysgraphia", student)}
                                        >
                                          <div className="h-10 w-10 rounded-lg bg-secondary/20 flex items-center justify-center mr-4">
                                            <Pencil className="h-5 w-5 text-secondary" />
                                          </div>
                                          <div className="text-left">
                                            <p className="font-semibold">{t.dysgraphiaTest}</p>
                                            <p className="text-xs text-muted-foreground">DSM-5 written expression assessment</p>
                                          </div>
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          className="h-auto py-4 justify-start"
                                          onClick={() => startPerception(student)}
                                        >
                                          <div className="h-10 w-10 rounded-lg bg-info/20 flex items-center justify-center mr-4">
                                            <Brain className="h-5 w-5 text-info" />
                                          </div>
                                          <div className="text-left">
                                            <p className="font-semibold">Perception Test</p>
                                            <p className="text-xs text-muted-foreground">Cognitive perception assessment</p>
                                          </div>
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setProfileStudent(student)}
                                    title="Student profile & DSM-5 questionnaire"
                                    aria-label={`Profile for ${student.name}`}
                                  >
                                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEdit(student)}
                                    title="Edit Student / Link Parent Email"
                                  >
                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-destructive" 
                                    onClick={() => handleDeleteStudent(student.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tests">
              <Card className="mb-6 border-2 border-primary/50">
                <CardContent className="pt-6 pb-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center shrink-0">
                      <ListChecks className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">DSM-5 screening: all three tests</h3>
                      <p className="text-sm text-muted-foreground">
                        Reading, math and writing in one session, scored together. This is the standard screening.
                      </p>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="hero" className="md:w-56">Start screening</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Select Student</DialogTitle>
                      </DialogHeader>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {students.map(s => (
                          <Button key={s.id} variant="outline" className="w-full justify-start" onClick={() => startFullScreening(s)}>
                            {s.name} - Grade {s.grade}
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
              <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                <Lock className="h-4 w-4" /> Single tests below need teacher permission and a recorded reason.
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-2 border-primary/30">
                  <CardContent className="pt-8 pb-8">
                    <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-center mb-2">{t.dyslexiaTest}</h3>
                    <p className="text-sm text-muted-foreground text-center mb-6">
                      DSM-5 reading assessment · single test
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="hero" className="w-full">{t.startTest}</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Select Student</DialogTitle>
                        </DialogHeader>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {students.map(s => (
                            <Button 
                              key={s.id} 
                              variant="outline" 
                              className="w-full justify-start"
                              onClick={() => requestSingleTest("dyslexia", s)}
                            >
                              {s.name} - Grade {s.grade}
                            </Button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>

                <Card className="border-2 border-accent/30">
                  <CardContent className="pt-8 pb-8">
                    <div className="h-16 w-16 rounded-2xl gradient-warm flex items-center justify-center mx-auto mb-4">
                      <Calculator className="h-8 w-8 text-accent-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-center mb-2">{t.dyscalculiaTest}</h3>
                    <p className="text-sm text-muted-foreground text-center mb-6">
                      DSM-5 mathematics assessment · single test
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="accent" className="w-full">{t.startTest}</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Select Student</DialogTitle>
                        </DialogHeader>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {students.map(s => (
                            <Button 
                              key={s.id} 
                              variant="outline" 
                              className="w-full justify-start"
                              onClick={() => requestSingleTest("dyscalculia", s)}
                            >
                              {s.name} - Grade {s.grade}
                            </Button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>

                <Card className="border-2 border-secondary/30">
                  <CardContent className="pt-8 pb-8">
                    <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                      <Pencil className="h-8 w-8 text-secondary-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-center mb-2">{t.dysgraphiaTest}</h3>
                    <p className="text-sm text-muted-foreground text-center mb-6">
                      DSM-5 written expression assessment · single test
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="secondary" className="w-full">{t.startTest}</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Select Student</DialogTitle>
                        </DialogHeader>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {students.map(s => (
                            <Button 
                              key={s.id} 
                              variant="outline" 
                              className="w-full justify-start"
                              onClick={() => requestSingleTest("dysgraphia", s)}
                            >
                              {s.name} - Grade {s.grade}
                            </Button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>

                <Card className="border-2 border-info/30">
                  <CardContent className="pt-8 pb-8">
                    <div className="h-16 w-16 rounded-2xl gradient-cool flex items-center justify-center mx-auto mb-4">
                      <Brain className="h-8 w-8 text-info-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-center mb-2">Perception Test</h3>
                    <p className="text-sm text-muted-foreground text-center mb-6">
                      Cognitive perception assessment
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="default" className="w-full font-semibold shadow-md">
                          {t.startTest}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Select Student</DialogTitle>
                        </DialogHeader>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {students.map(s => (
                            <Button 
                              key={s.id} 
                              variant="outline" 
                              className="w-full justify-start"
                              onClick={() => startPerception(s)}
                            >
                              {s.name} - Grade {s.grade}
                            </Button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>{t.reports}</CardTitle>
                  <CardDescription>View past assessments and export PDF reports</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingSessions ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                    </div>
                  ) : testSessions.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No test results yet. Conduct a test to see reports here.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.studentName}</TableHead>
                          <TableHead>Test Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>{t.overallScore}</TableHead>
                          <TableHead>{t.riskLevel}</TableHead>
                          <TableHead className="text-right">{t.actions}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {testSessions.map((session) => {
                          const report = session.analysis_report as { riskLevel?: string } | null;
                          return (
                            <TableRow key={session.id}>
                              <TableCell className="font-medium">{session.student?.name || "Unknown"}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {session.test_type}
                                </Badge>
                              </TableCell>
                              <TableCell>{new Date(session.created_at).toLocaleDateString("en-IN")}</TableCell>
                              <TableCell>
                                {session.overall_score !== null ? (
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">{session.overall_score}%</span>
                                    <Progress value={session.overall_score} className="w-16 h-2" />
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">N/A</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  report?.riskLevel === "low" ? "default" : 
                                  report?.riskLevel === "moderate" ? "secondary" : 
                                  "destructive"
                                }>
                                  {report?.riskLevel === "low" ? t.lowRisk : 
                                   report?.riskLevel === "moderate" ? t.moderateRisk : 
                                   t.highRisk}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setReportSession(session)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleExportPdf(session)}
                                    disabled={!session.student}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    {t.exportPdf}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Student Progress Modal */}
          {progressModalStudent && user && (
            <StudentProgressModal
              isOpen={!!progressModalStudent}
              onClose={() => setProgressModalStudent(null)}
              studentId={progressModalStudent.id}
              studentName={progressModalStudent.name}
              studentGrade={progressModalStudent.grade}
              teacherId={user.id}
            />
          )}

          {/* Report Dialog */}
          {reportSession && (
            <TestReportDialog
              session={{
                ...reportSession,
                student: reportSession.student ? {
                  name: reportSession.student.name,
                  grade: reportSession.student.grade,
                } : undefined,
              }}
              open={!!reportSession}
              onOpenChange={(open) => { if (!open) setReportSession(null); }}
            />
          )}

          {/* Plan a session: pick a learner, start the full DSM-5 screening */}
          <Dialog open={planOpen} onOpenChange={setPlanOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-forest dark:text-leaf" /> Plan a session</DialogTitle>
                <DialogDescription>Pick a learner. Learners who haven't started yet are listed first.</DialogDescription>
              </DialogHeader>
              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {students.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Add a learner first.</p>}
                {[...forestStats.studentsWithStats]
                  .sort((a, b) => a.testCount - b.testCount || a.name.localeCompare(b.name))
                  .map((s) => {
                    const stage = getTreeStage(s.testCount);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { setPlanOpen(false); startFullScreening(s); }}
                        className="group flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-forest hover:shadow-md"
                      >
                        <LeafIcon color={STAGE_LABELS[stage].leaf} className="h-7 w-7 shrink-0 transition-transform group-hover:-rotate-12" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{s.name}</span>
                          <span className="block text-xs text-muted-foreground">Grade {s.grade} · {STAGE_LABELS[stage].label}</span>
                        </span>
                        <span className="flex items-center gap-1 text-sm font-semibold text-forest opacity-0 transition group-hover:opacity-100 dark:text-leaf">
                          Start <ArrowRight className="h-4 w-4" />
                        </span>
                      </button>
                    );
                  })}
              </div>
            </DialogContent>
          </Dialog>

          {/* Parent connections */}
          <Dialog open={parentsOpen} onOpenChange={setParentsOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-amber" /> Parent connections · {parentsConnected}</DialogTitle>
                <DialogDescription>Linked parents can follow their child's progress in the parent portal.</DialogDescription>
              </DialogHeader>
              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {students.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No learners yet.</p>}
                {[...students]
                  .sort((a, b) => Number(!!a.parent_email) - Number(!!b.parent_email) || a.name.localeCompare(b.name))
                  .map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${s.parent_email ? "bg-amber/20 text-amber" : "bg-muted text-muted-foreground"}`}>
                        {s.parent_email ? <Check className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{s.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{s.parent_email || "No parent linked yet"}</span>
                      </span>
                      <Button size="sm" variant={s.parent_email ? "outline" : "default"} className={s.parent_email ? "rounded-full" : "rounded-full bg-forest text-forest-foreground hover:bg-forest hover:brightness-110"} onClick={() => { setParentsOpen(false); handleOpenEdit(s); }}>
                        {s.parent_email ? "Edit" : "Link parent"}
                      </Button>
                    </div>
                  ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Student Parent Link Modal */}
          {editingStudent && (
            <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Parent Link for {editingStudent.name}</DialogTitle>
                  <DialogDescription>
                    Attach or update the parent's email address to allow them to access {editingStudent.name}'s progress.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="editParentEmail">Parent Email Address</Label>
                    <Input
                      id="editParentEmail"
                      type="email"
                      placeholder="parent@email.com (e.g., ahaan8547@gmail.com)"
                      value={editParentEmail}
                      onChange={(e) => setEditParentEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      The parent can use this email address to log in to the Parent Portal.
                    </p>
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button variant="outline" onClick={() => setEditingStudent(null)}>Cancel</Button>
                  <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
                    {isSavingEdit ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {isSavingEdit ? "Saving..." : "Save Link"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <StudentProfileDialog
        open={profileStudent !== null}
        onOpenChange={(o) => { if (!o) setProfileStudent(null); }}
        student={profileStudent}
      />
      <SingleTestPermissionDialog
        open={permissionRequest !== null}
        studentName={permissionRequest?.student.name ?? ""}
        testLabel={permissionRequest ? TEST_LABELS[permissionRequest.test].toLowerCase() : ""}
        onCancel={() => setPermissionRequest(null)}
        onConfirm={startPermittedSingleTest}
      />
    </Layout>
  );
}
