import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generatePrincipalPdfReport } from "@/lib/generatePdfReport";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { usePrincipalDashboard } from "@/hooks/usePrincipalDashboard";
import { usePrincipalTeachers } from "@/hooks/usePrincipalTeachers";
import {
  Users,
  School,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Download,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  Loader2,
  ChevronRight,
  GraduationCap,
  BookOpen,
  Target,
} from "lucide-react";

export default function PrincipalDashboard() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const {
    loading,
    overallStats,
    gradeStats,
    cohortData,
    trendData,
    availableGrades,
    selectedGrade,
    setSelectedGrade,
    generateReportData,
  } = usePrincipalDashboard();

  const {
    teachers,
    gradeDetails,
    loading: teachersLoading,
    getTeachersByGrade,
    getGradeDetail,
  } = usePrincipalTeachers();

  const [selectedGradeDetail, setSelectedGradeDetail] = useState<string | null>(null);
  const [showTeacherDialog, setShowTeacherDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleExportPdf = () => {
    const reportData = generateReportData();
    generatePrincipalPdfReport({
      overview: reportData.overview,
      gradeStats: reportData.gradeStats,
      cohortData: reportData.cohortData,
      trendData: reportData.trendData,
    });
  };

  const handleGradeClick = (grade: string) => {
    setSelectedGradeDetail(grade);
    setShowTeacherDialog(true);
  };

  const gradeDetail = selectedGradeDetail ? getGradeDetail(selectedGradeDetail) : null;
  const gradeTeachers = selectedGradeDetail ? getTeachersByGrade(selectedGradeDetail) : [];

  if (authLoading) {
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
      <div className="min-h-screen bg-muted/20">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Principal Dashboard</h1>
              <p className="text-muted-foreground">School-wide analytics and insights</p>
            </div>
            <div className="flex gap-3">
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {availableGrades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExportPdf}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" size="icon" onClick={handleLogout} title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4">
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{overallStats.totalStudents}</p>
                      <p className="text-xs text-muted-foreground">Total Students</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{overallStats.testedStudents}</p>
                      <p className="text-xs text-muted-foreground">Tested</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{overallStats.flaggedStudents}</p>
                      <p className="text-xs text-muted-foreground">Flagged</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-secondary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{overallStats.avgScore}%</p>
                      {overallStats.weeklyChange !== 0 && (
                        <span className={`flex items-center text-xs ${overallStats.weeklyChange > 0 ? "text-success" : "text-destructive"}`}>
                          {overallStats.weeklyChange > 0 ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {Math.abs(overallStats.weeklyChange)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Teacher Overview Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Teacher Overview
              </CardTitle>
              <CardDescription>
                Click on a grade to view teachers and class performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teachersLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {gradeDetails.map((gd) => (
                    <div
                      key={gd.grade}
                      onClick={() => handleGradeClick(gd.grade)}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{gd.grade}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Students:</span>
                          <span className="font-medium text-foreground">{gd.total_students}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Teachers:</span>
                          <span className="font-medium text-foreground">{gd.teachers.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Flagged:</span>
                          <span className={`font-medium ${gd.flagged_students > 0 ? "text-destructive" : "text-success"}`}>
                            {gd.flagged_students}
                          </span>
                        </div>
                      </div>
                      <Progress value={gd.avg_score} className="h-2 mt-2" />
                      <p className="text-[10px] text-right mt-1 text-muted-foreground">{gd.avg_score}% avg</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="grades" className="space-y-6">
            <TabsList>
              <TabsTrigger value="grades">Grade Analysis</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
              <TabsTrigger value="cohorts">Cohort Comparison</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            <TabsContent value="grades">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Grade-wise Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))
                    ) : gradeStats.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No grade data available yet.
                      </p>
                    ) : (
                      gradeStats.map((grade) => (
                        <div 
                          key={grade.grade} 
                          className="cursor-pointer hover:bg-muted/50 p-2 rounded-lg -mx-2"
                          onClick={() => handleGradeClick(grade.grade)}
                        >
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">{grade.grade}</span>
                            <span className="text-sm text-muted-foreground">{grade.avgScore}% avg</span>
                          </div>
                          <Progress value={grade.avgScore} className="h-2" />
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <School className="h-5 w-5 text-primary" />
                      Grade Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))
                      ) : gradeStats.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          No grade data available yet.
                        </p>
                      ) : (
                        gradeStats.map((grade) => (
                          <div 
                            key={grade.grade} 
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted"
                            onClick={() => handleGradeClick(grade.grade)}
                          >
                            <div>
                              <p className="font-medium">{grade.grade}</p>
                              <p className="text-xs text-muted-foreground">
                                {grade.tested}/{grade.students} tested
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm font-medium">{grade.flagged} flagged</p>
                                <p className="text-xs text-muted-foreground">
                                  {grade.flagPercentage.toFixed(1)}%
                                </p>
                              </div>
                              {grade.status === "red" ? (
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                              ) : grade.status === "yellow" ? (
                                <AlertTriangle className="h-5 w-5 text-warning" />
                              ) : (
                                <CheckCircle className="h-5 w-5 text-success" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="teachers">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    All Teachers
                  </CardTitle>
                  <CardDescription>Teacher performance and student statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  {teachersLoading ? (
                    <Skeleton className="h-64 w-full" />
                  ) : teachers.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No teachers registered yet.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Teacher Name</TableHead>
                          <TableHead>Grades</TableHead>
                          <TableHead>Students</TableHead>
                          <TableHead>Flagged</TableHead>
                          <TableHead>Tests</TableHead>
                          <TableHead>Avg Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teachers.map((teacher) => (
                          <TableRow key={teacher.id}>
                            <TableCell className="font-medium">{teacher.full_name}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {teacher.grades.slice(0, 3).map((g) => (
                                  <Badge key={g} variant="secondary" className="text-xs">
                                    {g}
                                  </Badge>
                                ))}
                                {teacher.grades.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{teacher.grades.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{teacher.student_count}</TableCell>
                            <TableCell>
                              <span className={teacher.flagged_count > 0 ? "text-destructive font-medium" : ""}>
                                {teacher.flagged_count}
                              </span>
                            </TableCell>
                            <TableCell>{teacher.tests_conducted}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={teacher.avg_score} className="h-2 w-16" />
                                <span className="text-xs">{teacher.avg_score}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cohorts">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-primary" />
                      Student Cohorts
                    </CardTitle>
                    <CardDescription>Distribution of students by performance level</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))
                      ) : (
                        cohortData.map((cohort) => (
                          <div key={cohort.cohort}>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">{cohort.cohort}</span>
                              <span className="text-sm text-muted-foreground">
                                {cohort.count} students ({cohort.percentage}%)
                              </span>
                            </div>
                            <Progress 
                              value={cohort.percentage} 
                              className={`h-3 ${
                                cohort.cohort === "High Performers" 
                                  ? "[&>div]:bg-success" 
                                  : cohort.cohort === "Needs Support" 
                                    ? "[&>div]:bg-destructive" 
                                    : ""
                              }`} 
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Intervention Recommendations</CardTitle>
                    <CardDescription>AI-generated recommendations based on school-wide data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))
                      ) : (
                        <>
                          {gradeStats.filter((g) => g.status === "red").length > 0 && (
                            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                                <div>
                                  <p className="font-medium text-sm">High Attention Needed</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {gradeStats.filter((g) => g.status === "red").map((g) => g.grade).join(", ")} 
                                    {" "}show flagging rate above 12%. Consider immediate intervention 
                                    and additional teacher training for SLD identification.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          {overallStats.weeklyChange > 0 && (
                            <div className="p-4 rounded-lg border border-success/30 bg-success/5">
                              <div className="flex items-start gap-3">
                                <TrendingUp className="h-5 w-5 text-success mt-0.5" />
                                <div>
                                  <p className="font-medium text-sm">Improvement Trend</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Overall scores improved {overallStats.weeklyChange}% this week. 
                                    Current interventions are showing positive results.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                            <div className="flex items-start gap-3">
                              <Target className="h-5 w-5 text-primary mt-0.5" />
                              <div>
                                <p className="font-medium text-sm">Focus Areas</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Based on test results, prioritize phonics exercises for younger grades 
                                  and reading comprehension for grades 4+.
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trends">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Weekly Performance Trends
                  </CardTitle>
                  <CardDescription>8-week performance overview</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-64 w-full" />
                  ) : (
                    <div className="space-y-4">
                      {trendData.map((week) => (
                        <div key={week.week} className="flex items-center gap-4">
                          <span className="text-sm w-20 text-muted-foreground">{week.week}</span>
                          <Progress value={week.avgScore} className="flex-1 h-3" />
                          <div className="flex items-center gap-4 text-xs">
                            <span className="w-16">{week.avgScore}% avg</span>
                            <span className="w-16 text-muted-foreground">{week.tested} tested</span>
                            <span className={`w-16 ${week.flagged > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                              {week.flagged} flagged
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Grade Detail Dialog */}
      <Dialog open={showTeacherDialog} onOpenChange={setShowTeacherDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedGradeDetail} Details</DialogTitle>
            <DialogDescription>
              Teachers and performance overview
            </DialogDescription>
          </DialogHeader>
          
          {gradeDetail && (
            <div className="space-y-6">
              {/* Grade Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{gradeDetail.total_students}</p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{gradeDetail.tested_students}</p>
                  <p className="text-xs text-muted-foreground">Tested</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-destructive">{gradeDetail.flagged_students}</p>
                  <p className="text-xs text-muted-foreground">Flagged</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{gradeDetail.avg_score}%</p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
              </div>

              {/* Teachers List */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Teachers ({gradeTeachers.length})
                </h4>
                {gradeTeachers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No teachers assigned to this grade yet.</p>
                ) : (
                  <div className="space-y-3">
                    {gradeTeachers.map((teacher) => (
                      <div key={teacher.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{teacher.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {teacher.student_count} students • {teacher.tests_conducted} tests conducted
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{teacher.avg_score}%</p>
                          <p className="text-xs text-muted-foreground">avg score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowTeacherDialog(false)}>
                  Close
                </Button>
                <Button 
                  variant="default" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedGrade(selectedGradeDetail?.replace("Grade ", "") || "all");
                    setShowTeacherDialog(false);
                  }}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Filter Dashboard to {selectedGradeDetail}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
