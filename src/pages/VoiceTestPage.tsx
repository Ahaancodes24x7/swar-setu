import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { VoiceTest } from "@/components/VoiceTest";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Mic } from "lucide-react";

const grades = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
  "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
];

export default function VoiceTestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [studentName, setStudentName] = useState(searchParams.get("name") || "");
  const [studentGrade, setStudentGrade] = useState(searchParams.get("grade") || "");
  const [studentId, setStudentId] = useState(searchParams.get("id") || "");
  const [testStarted, setTestStarted] = useState(false);

  // Auto-start if student data is provided via URL params
  const hasStudentData = searchParams.get("id") && searchParams.get("name") && searchParams.get("grade");

  const handleTestComplete = (results: any) => {
    console.log("Test results:", results);
  };

  if (!testStarted) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard/teacher")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                <Mic className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Start Voice Assessment</CardTitle>
              <CardDescription>
                Enter student details to begin the SLD screening test
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studentName">Student Name</Label>
                <Input
                  id="studentName"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter student's full name"
                />
              </div>

              <div className="space-y-2">
                <Label>Grade</Label>
                <Select value={studentGrade} onValueChange={setStudentGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((grade) => (
                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="hero"
                size="lg"
                className="w-full mt-6"
                onClick={() => setTestStarted(true)}
                disabled={!studentName || !studentGrade}
              >
                Begin Assessment
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                This assessment uses voice analysis to flag potential learning disability indicators. 
                It does not provide medical diagnoses.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => setTestStarted(false)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <VoiceTest
          studentName={studentName}
          studentGrade={studentGrade}
          studentId={studentId || undefined}
          onComplete={handleTestComplete}
        />
      </div>
    </Layout>
  );
}
