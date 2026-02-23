import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { TeacherActivityIndicators } from "@/components/forest/TeacherActivityIndicators";
import type { Tables } from "@/integrations/supabase/types";
import { 
  Users, Plus, Trash2, Mic, FileText, AlertTriangle, CheckCircle, Mail, 
  Search, Download, Loader2, LogOut, BookOpen, Calculator, Pencil, 
  ArrowLeft, TrendingUp, X, Eye, Brain, ArrowUpDown, Check, HelpCircle
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuRadioGroup, 
  DropdownMenuRadioItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { TestReportDialog } from "@/components/dashboard/TestReportDialog";
import { StudentProgressModal } from "@/components/dashboard/StudentProgressModal";

type TestSession = Tables<"test_sessions">;
type Student = Tables<"students">;

interface SessionWithStudent extends TestSession {
  student?: Student;
}

type TestType = null | "dyslexia" | "dyscalculia" | "dysgraphia" | "perception";
type ViewMode = "forest" | "classic";
type SortOption = "name" | "grade" | "status";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("name");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: "", grade: "", parentEmail: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [testSessions, setTestSessions] = useState<SessionWithStudent[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("forest");
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);
  const [reportSession, setReportSession] = useState<SessionWithStudent | null>(null);
  const [progressModalStudent, setProgressModalStudent] = useState<Student | null>(null);
  
  // Test selection state
  const [selectedTest, setSelectedTest] = useState<TestType>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const { students, loading, addStudent, deleteStudent } = useStudents();
  const forestStats = useForestStats(students, testSessions);

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
    await addStudent(newStudent);
    setNewStudent({ name: "", grade: "", parentEmail: "" });
    setDialogOpen(false);
    setIsAdding(false);
  };

  const handleDeleteStudent = async (id: string) => {
    if (confirm("Are you sure you want to remove this student?")) {
      await deleteStudent(id);
    }
  };

  const startTest = (testType: TestType, student: Student) => {
    setSelectedTest(testType);
    setSelectedStudent(student);
    setSelectedStudentForDetail(null);
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudentForDetail(student);
  };

  const handleTestComplete = async (results: any) => {
    // Persist non-voice tests so Parent/Teacher dashboards update immediately.
    // (Perception test already persists inside its component.)
    try {
      if (user && selectedStudent && results?.testType && results.testType !== "perception") {
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

        // Build detailed analysis report with question data
        const analysisReport: Record<string, any> = {
          riskLevel: results.riskLevel || "low",
          summary,
          recommendations,
          subtestScores: results.subtestScores || [],
          flaggedConditions: results.flaggedConditions || [],
          errorPatterns: results.errorTypeCounts || {},
          answeredQuestions: results.answeredQuestions || [],
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

    // Refresh sessions after test completion
    if (!user) return;
    const { data } = await supabase
      .from("test_sessions")
      .select("*")
      .eq("conducted_by", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (data) {
      const enrichedSessions = data.map(session => {
        const student = students.find(s => s.id === session.student_id);
        return { ...session, student };
      });
      setTestSessions(enrichedSessions);
    }
    
    setSelectedTest(null);
    setSelectedStudent(null);
  };

  // If a test is in progress, show the test component
  if (selectedTest && selectedStudent) {
    return (
      <Layout hideFooter hideHeader={true}>
        <div className="min-h-screen bg-muted/20 py-8">
          <div className="container mx-auto px-4">
            <Button 
              variant="ghost" 
              className="mb-6"
              onClick={() => { setSelectedTest(null); setSelectedStudent(null); }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Button>
            
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

  return (
    <Layout hideFooter hideHeader={true}>
      <div className="min-h-screen bg-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                🌳 Learning Forest
              </h1>
              <p className="text-muted-foreground">{t.conductTests}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="rounded-full border-primary/30 text-primary hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_16px_hsl(var(--primary)/0.25)]"
                onClick={() => navigate("/dashboard/teacher/help")}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Need Help?
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero"><Plus className="h-4 w-4 mr-2" />Plant a Tree</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>🌱 Plant a New Tree (Add Student)</DialogTitle>
                    <DialogDescription>Enter student details to add them to your forest.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>{t.studentName}</Label>
                      <Input value={newStudent.name} onChange={(e) => setNewStudent(p => ({ ...p, name: e.target.value }))} placeholder="Full name" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.grade}</Label>
                      <Input value={newStudent.grade} onChange={(e) => setNewStudent(p => ({ ...p, grade: e.target.value }))} placeholder="e.g., 3" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.parentEmail} (Optional)</Label>
                      <Input value={newStudent.parentEmail} onChange={(e) => setNewStudent(p => ({ ...p, parentEmail: e.target.value }))} type="email" placeholder="parent@email.com" />
                    </div>
                    <Button className="w-full" onClick={handleAddStudent} disabled={isAdding || !newStudent.name || !newStudent.grade}>
                      {isAdding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.loading}</> : "🌱 Plant Tree"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="icon" onClick={handleLogout} title={t.logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Teacher Activity Indicators (Weather) */}
          <TeacherActivityIndicators
            sunlight={forestStats.sunlight}
            water={forestStats.water}
            parentInteraction={forestStats.parentInteraction}
            className="mb-6"
          />

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center text-xl">
                    🌳
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{students.length}</p>
                    <p className="text-xs text-muted-foreground">Trees in Forest</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center text-xl">
                    🍂
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{students.filter(s => s.status === "flagged").length}</p>
                    <p className="text-xs text-muted-foreground">Need Care</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                    ☀️
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{testsThisWeek}</p>
                    <p className="text-xs text-muted-foreground">Tests This Week</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-info/20 flex items-center justify-center text-xl">
                    👨‍👩‍👧
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{students.filter(s => s.parent_email).length}</p>
                    <p className="text-xs text-muted-foreground">{t.linkedParents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="students" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <TabsList>
                <TabsTrigger value="students">{t.students}</TabsTrigger>
                <TabsTrigger value="tests">{t.conductTests}</TabsTrigger>
                <TabsTrigger value="reports">{t.reports}</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-3">
                <ForestViewToggle view={viewMode} onViewChange={setViewMode} />
                <Button variant="outline" onClick={() => navigate("/dashboard/teacher/resources")}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Resources
                </Button>
              </div>
            </div>

            <TabsContent value="students">
              {viewMode === "forest" ? (
                // Forest View
                <div className="space-y-4">
                  <ForestScene
                    students={forestStats.studentsWithStats}
                    onStudentClick={handleStudentClick}
                    sunlight={forestStats.sunlight}
                    water={forestStats.water}
                    rain={forestStats.parentInteraction > 50}
                    className="min-h-[500px]"
                  />
                  
                  {/* Student detail panel */}
                  {selectedStudentForDetail && (
                    <Card className="border-2 border-primary/30 animate-fade-in">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            🌳 {selectedStudentForDetail.name}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setProgressModalStudent(selectedStudentForDetail)}>
                              <TrendingUp className="h-4 w-4 mr-1" />
                              {t.studentProgress}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedStudentForDetail(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription>
                          Grade {selectedStudentForDetail.grade} • 
                          Status: {selectedStudentForDetail.status === "flagged" ? "🍂 Needs Care" : "🌿 Healthy"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <Button variant="outline" onClick={() => startTest("dyslexia", selectedStudentForDetail)}>
                            <BookOpen className="h-4 w-4 mr-2" />
                            Reading Test
                          </Button>
                          <Button variant="outline" onClick={() => startTest("dyscalculia", selectedStudentForDetail)}>
                            <Calculator className="h-4 w-4 mr-2" />
                            Math Test
                          </Button>
                          <Button variant="outline" onClick={() => startTest("dysgraphia", selectedStudentForDetail)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Writing Test
                          </Button>
                          <Button variant="outline" onClick={() => startTest("perception", selectedStudentForDetail)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Perception Test
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
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
                                  <CheckCircle className="h-4 w-4 text-success" />
                                ) : (
                                  <span className="text-muted-foreground text-xs">Not linked</span>
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
                                        <DialogTitle>Select Test for {student.name}</DialogTitle>
                                        <DialogDescription>Choose which assessment to conduct</DialogDescription>
                                      </DialogHeader>
                                      <div className="grid gap-4 pt-4">
                                        <Button 
                                          variant="outline" 
                                          className="h-auto py-4 justify-start"
                                          onClick={() => startTest("dyslexia", student)}
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
                                          onClick={() => startTest("dyscalculia", student)}
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
                                          onClick={() => startTest("dysgraphia", student)}
                                        >
                                          <div className="h-10 w-10 rounded-lg bg-secondary/20 flex items-center justify-center mr-4">
                                            <Pencil className="h-5 w-5 text-secondary" />
                                          </div>
                                          <div className="text-left">
                                            <p className="font-semibold">{t.dysgraphiaTest}</p>
                                            <p className="text-xs text-muted-foreground">Drawing-based writing assessment</p>
                                          </div>
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          className="h-auto py-4 justify-start"
                                          onClick={() => startTest("perception", student)}
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
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-2 border-primary/30">
                  <CardContent className="pt-8 pb-8">
                    <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-center mb-2">{t.dyslexiaTest}</h3>
                    <p className="text-sm text-muted-foreground text-center mb-6">
                      DSM-5 compliant reading assessment
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
                              onClick={() => startTest("dyslexia", s)}
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
                      DSM-5 compliant number assessment
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
                              onClick={() => startTest("dyscalculia", s)}
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
                      Drawing-based writing assessment
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
                              onClick={() => startTest("dysgraphia", s)}
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
                       <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold shadow-md">
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
                              onClick={() => startTest("perception", s)}
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
        </div>
      </div>
    </Layout>
  );
}
