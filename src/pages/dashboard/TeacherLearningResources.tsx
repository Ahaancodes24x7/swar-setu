import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTeacherResources } from "@/hooks/useTeacherResources";
import { useStudents } from "@/hooks/useStudents";
import { toast } from "sonner";
import {
  BookOpen,
  Search,
  Send,
  Users,
  CheckCircle,
  Clock,
  Filter,
  Loader2,
  ExternalLink,
  Target,
  Calculator,
  Volume2,
  GraduationCap,
} from "lucide-react";

const skillIcons: Record<string, React.ElementType> = {
  reading: BookOpen,
  phonics: Volume2,
  numeracy: Calculator,
  comprehension: Target,
  default: BookOpen,
};

export default function TeacherLearningResources() {
  const {
    resources,
    assignments,
    loading,
    assignToStudent,
    assignToGrade,
    getAssignmentStats,
    filterResourcesByGrade,
    filterResourcesBySkill,
  } = useTeacherResources();
  
  const { students } = useStudents();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string>("all");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("all");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  const stats = getAssignmentStats();

  // Filter resources
  let filteredResources = resources;
  
  if (selectedGradeFilter !== "all") {
    filteredResources = filterResourcesByGrade(parseInt(selectedGradeFilter));
  }
  
  if (selectedSkill !== "all") {
    filteredResources = filteredResources.filter(r => 
      r.skill_targeted.toLowerCase().includes(selectedSkill.toLowerCase())
    );
  }
  
  if (searchQuery) {
    filteredResources = filteredResources.filter(r =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Get unique grades from students
  const uniqueGrades = [...new Set(students.map(s => s.grade))].sort();

  const handleAssign = async () => {
    if (!selectedResource || !assignTarget) return;
    
    setIsAssigning(true);
    
    if (assignTarget.startsWith("grade_")) {
      const grade = assignTarget.replace("grade_", "");
      const result = await assignToGrade(selectedResource, grade);
      if (result.success) {
        toast.success(`Assigned to ${result.count} students in Grade ${grade}`);
      } else {
        toast.error("Failed to assign resource");
      }
    } else {
      const result = await assignToStudent(selectedResource, assignTarget);
      if (result.success) {
        toast.success("Resource assigned successfully");
      } else {
        toast.error("Failed to assign resource");
      }
    }
    
    setIsAssigning(false);
    setAssignDialogOpen(false);
    setSelectedResource(null);
    setAssignTarget("");
  };

  const openAssignDialog = (resourceId: string) => {
    setSelectedResource(resourceId);
    setAssignDialogOpen(true);
  };

  return (
    <Layout hideFooter hideHeader={true}>
      <div className="min-h-screen bg-muted/20">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <BookOpen className="h-7 w-7 text-primary" />
                Learning Resources
              </h1>
              <p className="text-muted-foreground">
                Browse, assign, and track learning resources for your students
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{resources.length}</p>
                    <p className="text-xs text-muted-foreground">Available Resources</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center">
                    <Send className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Assignments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Target className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.completionRate}%</p>
                    <p className="text-xs text-muted-foreground">Completion Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="browse" className="space-y-6">
            <TabsList>
              <TabsTrigger value="browse">Browse Resources</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
            </TabsList>

            <TabsContent value="browse">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search resources..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Skill" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Skills</SelectItem>
                    <SelectItem value="reading">Reading</SelectItem>
                    <SelectItem value="phonics">Phonics</SelectItem>
                    <SelectItem value="numeracy">Numeracy</SelectItem>
                    <SelectItem value="comprehension">Comprehension</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedGradeFilter} onValueChange={setSelectedGradeFilter}>
                  <SelectTrigger className="w-40">
                    <GraduationCap className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                      <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resources Grid */}
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredResources.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No resources found matching your criteria</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredResources.map((resource) => {
                    const IconComponent = skillIcons[resource.skill_targeted.toLowerCase()] || skillIcons.default;
                    return (
                      <Card key={resource.id} className="overflow-hidden">
                        {resource.thumbnail_url && (
                          <div className="h-32 bg-muted overflow-hidden">
                            <img 
                              src={resource.thumbnail_url} 
                              alt={resource.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <IconComponent className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-base">{resource.title}</CardTitle>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {resource.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Badge variant="secondary">{resource.skill_targeted}</Badge>
                            <Badge variant="outline">Grade {resource.grade_min}-{resource.grade_max}</Badge>
                            {resource.difficulty && (
                              <Badge variant="outline" className="capitalize">{resource.difficulty}</Badge>
                            )}
                            {resource.duration_minutes && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {resource.duration_minutes}m
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {resource.url && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => window.open(resource.url!, "_blank")}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                            )}
                            <Button 
                              variant="default" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => openAssignDialog(resource.id)}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Assign
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="assignments">
              <Card>
                <CardHeader>
                  <CardTitle>Assignment History</CardTitle>
                  <CardDescription>Track which resources have been assigned to students</CardDescription>
                </CardHeader>
                <CardContent>
                  {assignments.length === 0 ? (
                    <div className="text-center py-8">
                      <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No assignments yet. Start by assigning resources to students.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Resource</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Assigned</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="font-medium">
                              {assignment.resource?.title || "Unknown Resource"}
                            </TableCell>
                            <TableCell>
                              {assignment.student_name || assignment.class_grade || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(assignment.assigned_at).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                              })}
                            </TableCell>
                            <TableCell>
                              {assignment.completed ? (
                                <Badge variant="default" className="bg-success">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Resource</DialogTitle>
            <DialogDescription>
              Select a student or assign to an entire grade
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Select value={assignTarget} onValueChange={setAssignTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Select student or grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" disabled>Select assignment target</SelectItem>
                
                {/* Grade options */}
                {uniqueGrades.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Assign to Grade
                    </div>
                    {uniqueGrades.map((grade) => (
                      <SelectItem key={`grade_${grade}`} value={`grade_${grade}`}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          All Grade {grade} students
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                
                {/* Student options */}
                {students.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                      Assign to Student
                    </div>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} (Grade {student.grade})
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>

            <Button 
              className="w-full" 
              onClick={handleAssign}
              disabled={!assignTarget || isAssigning}
            >
              {isAssigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Assign Resource
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
