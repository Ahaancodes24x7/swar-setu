import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLearningResources } from "@/hooks/useLearningResources";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen,
  Headphones,
  Calculator,
  Eye,
  Music2,
  Clock,
  ExternalLink,
  CheckCircle,
  ArrowLeft,
  Loader2,
  GraduationCap,
  Target,
  Sparkles,
} from "lucide-react";

const typeIcons: Record<string, typeof BookOpen> = {
  reading: BookOpen,
  phonics: Music2,
  number_sense: Calculator,
  visual: Eye,
  audio: Headphones,
};

const typeLabels: Record<string, string> = {
  reading: "Reading",
  phonics: "Phonics & Decoding",
  number_sense: "Number Sense",
  visual: "Visual Worksheets",
  audio: "Audio Activities",
};

const difficultyColors: Record<string, string> = {
  easy: "bg-success/20 text-success",
  medium: "bg-warning/20 text-warning",
  hard: "bg-destructive/20 text-destructive",
};

const languageLabels: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
  ta: "Tamil",
};

export default function LearningResources() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get("studentId");
  const { user, loading: authLoading } = useAuth();
  const [localStudentId, setLocalStudentId] = useState<string | null>(studentId);

  // If no studentId in URL, try to find student linked to parent
  useEffect(() => {
    const findStudent = async () => {
      if (!user || studentId) return;
      
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("parent_email", user.email)
        .maybeSingle();

      if (student) {
        setLocalStudentId(student.id);
      }
    };

    if (!authLoading) {
      findStudent();
    }
  }, [user, authLoading, studentId]);

  const {
    loading,
    resources,
    resourcesByType,
    studentProfile,
    trackInteraction,
    getInteractionStatus,
  } = useLearningResources(localStudentId || undefined);

  const handleOpenResource = (resourceId: string, url: string | null) => {
    trackInteraction(resourceId);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  if (authLoading || loading) {
    return (
      <Layout hideFooter>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideFooter>
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard/parent")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  <BookOpen className="h-7 w-7 text-primary" />
                  Learning Resources
                </h1>
                <p className="text-muted-foreground">
                  {studentProfile
                    ? `Personalized resources for ${studentProfile.name}`
                    : "Explore learning activities"}
                </p>
              </div>
            </div>

            {studentProfile && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  Grade {studentProfile.grade}
                </Badge>
                {studentProfile.flaggedConditions.map((condition) => (
                  <Badge
                    key={condition}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Target className="h-3 w-3" />
                    {condition === "dyslexia" ? "Reading Support" : "Math Support"}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Personalization Notice */}
          {studentProfile && studentProfile.flaggedConditions.length > 0 && (
            <Card className="mb-6 border-primary/30 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Personalized for {studentProfile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      These resources are specially selected based on your child's assessment 
                      results to target areas that need improvement.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resource Tabs */}
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="all">All Resources</TabsTrigger>
              {Object.keys(resourcesByType).map((type) => (
                <TabsTrigger key={type} value={type} className="flex items-center gap-1">
                  {(() => {
                    const Icon = typeIcons[type] || BookOpen;
                    return <Icon className="h-4 w-4" />;
                  })()}
                  {typeLabels[type] || type}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    interaction={getInteractionStatus(resource.id)}
                    onOpen={() => handleOpenResource(resource.id, resource.url)}
                  />
                ))}
                {resources.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    No resources available for the current criteria.
                  </div>
                )}
              </div>
            </TabsContent>

            {Object.entries(resourcesByType).map(([type, typeResources]) => (
              <TabsContent key={type} value={type}>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeResources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      interaction={getInteractionStatus(resource.id)}
                      onOpen={() => handleOpenResource(resource.id, resource.url)}
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}

interface ResourceCardProps {
  resource: {
    id: string;
    title: string;
    description: string | null;
    resource_type: string;
    skill_targeted: string;
    grade_min: number;
    grade_max: number;
    language: string;
    url: string | null;
    duration_minutes: number | null;
    difficulty: string | null;
    conditions: string[] | null;
  };
  interaction?: {
    completed: boolean;
    time_spent_minutes: number;
  };
  onOpen: () => void;
}

function ResourceCard({ resource, interaction, onOpen }: ResourceCardProps) {
  const Icon = typeIcons[resource.resource_type] || BookOpen;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          {interaction?.completed && (
            <Badge variant="default" className="bg-success text-success-foreground">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
        <CardTitle className="text-base mt-3">{resource.title}</CardTitle>
        <CardDescription className="text-xs line-clamp-2">
          {resource.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Meta info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              {resource.skill_targeted}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Grade {resource.grade_min}-{resource.grade_max}
            </Badge>
          </div>

          {/* Additional info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {resource.duration_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {resource.duration_minutes} mins
                </span>
              )}
              <span>{languageLabels[resource.language] || resource.language}</span>
            </div>
            {resource.difficulty && (
              <Badge className={`text-xs ${difficultyColors[resource.difficulty] || ""}`}>
                {resource.difficulty}
              </Badge>
            )}
          </div>

          {/* Action button */}
          <Button
            onClick={onOpen}
            className="w-full mt-2"
            variant={interaction?.completed ? "outline" : "default"}
            disabled={!resource.url}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {interaction?.completed ? "Open Again" : "Start Learning"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
