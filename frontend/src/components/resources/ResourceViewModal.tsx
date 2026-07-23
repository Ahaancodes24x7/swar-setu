import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Clock,
  ExternalLink,
  Target,
  FileText,
  Brain,
  Award,
} from "lucide-react";
import type { LearningResource } from "@/hooks/useLearningResources";

interface ResourceViewModalProps {
  resource: LearningResource | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ResourceViewModal({
  resource,
  isOpen,
  onClose,
}: ResourceViewModalProps) {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showTips, setShowTips] = useState<Record<number, boolean>>({});

  if (!resource) return null;

  const content = resource.content;
  const isAssessment = resource.category === "assessment" || resource.title.toLowerCase().includes("checklist");
  const isTest = resource.category === "test" || (content?.practiceItems && content.practiceItems.length > 0);

  const toggleChecklist = (index: number) => {
    setCheckedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const selectAnswer = (index: number, option: string) => {
    setAnswers((prev) => ({ ...prev, [index]: option }));
  };

  const toggleTip = (index: number) => {
    setShowTips((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalChecklist = content?.checklist?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="capitalize">
              {resource.category || resource.resource_type}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {resource.duration_minutes || 15} mins
            </Badge>
            <Badge variant="default" className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              Grades {resource.grade_min}-{resource.grade_max}
            </Badge>
          </div>
          <DialogTitle className="text-xl md:text-2xl flex items-center gap-2">
            {isAssessment ? (
              <CheckCircle2 className="h-6 w-6 text-primary" />
            ) : isTest ? (
              <Brain className="h-6 w-6 text-primary" />
            ) : (
              <BookOpen className="h-6 w-6 text-primary" />
            )}
            {resource.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {resource.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 my-4">
          {/* Overview */}
          {content?.overview && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Overview & Objective</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {content.overview}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {content?.instructions && content.instructions.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Parent Guidelines:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1.5 pl-5 list-disc">
                {content.instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Checklist for Assessments */}
          {content?.checklist && content.checklist.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Observation Checklist ({checkedCount}/{totalChecklist} observed):
                </h4>
              </div>
              <div className="space-y-2">
                {content.checklist.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => toggleChecklist(i)}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      checkedItems[i] ? "bg-accent/10 border-accent/40" : "bg-card border-border hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox checked={!!checkedItems[i]} onCheckedChange={() => toggleChecklist(i)} className="mt-1" />
                    <div>
                      <p className={`font-medium text-sm ${checkedItems[i] ? "text-accent" : ""}`}>
                        {item.item}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              {checkedCount > 0 && (
                <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                  💡 Note: If 3 or more behaviors are checked, share this summary with your child's educator to customize classroom support.
                </div>
              )}
            </div>
          )}

          {/* Interactive Practice Items for Tests */}
          {content?.practiceItems && content.practiceItems.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Interactive Practice Questions:
              </h4>
              <div className="space-y-4">
                {content.practiceItems.map((item, i) => (
                  <Card key={i} className="border border-border">
                    <CardHeader className="py-3 px-4 bg-muted/30">
                      <CardTitle className="text-sm font-medium flex items-center justify-between">
                        <span>Question {i + 1}: {item.prompt}</span>
                        {item.tip && (
                          <Button variant="ghost" size="sm" onClick={() => toggleTip(i)} className="h-7 text-xs">
                            <HelpCircle className="h-3.5 w-3.5 mr-1" />
                            {showTips[i] ? "Hide Tip" : "Hint"}
                          </Button>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3 pb-4 px-4 space-y-3">
                      {showTips[i] && item.tip && (
                        <p className="text-xs bg-primary/10 text-primary p-2 rounded">
                          💡 Hint: {item.tip}
                        </p>
                      )}

                      {item.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.options.map((opt) => {
                            const isSelected = answers[i] === opt;
                            const isCorrect = item.answer && opt === item.answer;

                            return (
                              <Button
                                key={opt}
                                variant={isSelected ? (isCorrect ? "default" : "secondary") : "outline"}
                                size="sm"
                                onClick={() => selectAnswer(i, opt)}
                                className="justify-start text-left text-xs h-auto py-2.5 px-3"
                              >
                                {opt}
                              </Button>
                            );
                          })}
                        </div>
                      )}

                      {answers[i] && item.answer && (
                        <div className={`p-2 rounded text-xs ${answers[i] === item.answer ? "bg-success/15 text-success font-medium" : "bg-muted text-muted-foreground"}`}>
                          {answers[i] === item.answer ? "✓ Correct answer!" : `Suggested answer: ${item.answer}`}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Guides & Remedial Strategies */}
          {content?.guides && content.guides.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Step-by-Step Learning Strategy:
              </h4>
              <div className="space-y-3">
                {content.guides.map((guide, i) => (
                  <Card key={i} className="border-l-4 border-l-primary bg-card">
                    <CardContent className="pt-4 pb-4">
                      <h5 className="font-semibold text-sm text-foreground mb-1">{guide.heading}</h5>
                      <p className="text-sm text-muted-foreground leading-relaxed">{guide.detail}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* External URL link if provided */}
          {resource.url && (
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(resource.url!, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open External Resource Link
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="default" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
