import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Brain,
  BookOpen,
  Pencil,
  Eye,
  Target,
  Download,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { generatePdfReport } from "@/lib/generatePdfReport";
import logoLight from "@/assets/logolight.png";
import logoDark from "@/assets/logodark.png";

type TestSession = Tables<"test_sessions">;

interface TestReportDialogProps {
  session: TestSession & { student?: { name: string; grade: string } };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AnalysisReport {
  riskLevel?: string;
  summary?: string;
  recommendations?: string[];
  subtestScores?: { id: string; accuracy: number; avgResponseTime: number; errorCount: number; hesitationCount: number }[];
  flaggedConditions?: string[];
  errorPatterns?: Record<string, number>;
  answeredQuestions?: { question: string; answer: string; correct: boolean; subtest: string; responseTime: number }[];
  domainScores?: { motorControl: number; writingFluency: number; spatialAwareness: number; consistency: number };
  metrics?: Record<string, number>;
  type?: string;
  analysis?: {
    emotionalPolarity?: string;
    detailLevel?: string;
    perspectiveType?: string;
    consistency?: number;
    summary?: string;
  };
}

const testTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  dyslexia: { label: "Dyslexia Screening", icon: <BookOpen className="h-5 w-5" /> },
  dyscalculia: { label: "Dyscalculia Screening", icon: <Brain className="h-5 w-5" /> },
  dysgraphia: { label: "Dysgraphia Assessment", icon: <Pencil className="h-5 w-5" /> },
  perception: { label: "Perception Test", icon: <Eye className="h-5 w-5" /> },
  voice: { label: "Voice Assessment", icon: <Target className="h-5 w-5" /> },
};

function RiskBadge({ level }: { level: string }) {
  const config = {
    low: { class: "bg-success text-success-foreground", icon: CheckCircle },
    moderate: { class: "bg-warning text-warning-foreground", icon: AlertTriangle },
    high: { class: "bg-destructive text-destructive-foreground", icon: XCircle },
  };
  const c = config[level as keyof typeof config] || config.low;
  const Icon = c.icon;
  return (
    <Badge className={`${c.class} gap-1`}>
      <Icon className="h-3 w-3" />
      {level.toUpperCase()} RISK
    </Badge>
  );
}

export function TestReportDialog({ session, open, onOpenChange }: TestReportDialogProps) {
  const report = session.analysis_report as AnalysisReport | null;
  const testInfo = testTypeLabels[session.test_type] || { label: session.test_type, icon: <Target className="h-5 w-5" /> };

  const handleDownloadPdf = () => {
    generatePdfReport({
      student: session.student || { name: "Student", grade: "?" },
      session,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        {/* Branded Header */}
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <picture>
                <source srcSet={logoDark} media="(prefers-color-scheme: dark)" />
                <img src={logoLight} alt="SWARSETU" className="h-8 dark:hidden" />
              </picture>
              <img src={logoDark} alt="SWARSETU" className="h-8 hidden dark:block" />
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              {testInfo.icon}
            </div>
            <div>
              <DialogTitle className="text-lg">{testInfo.label} Report</DialogTitle>
              <DialogDescription>
                {session.student?.name || "Student"} • Grade {session.student?.grade || "?"} •{" "}
                {new Date(session.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Score & Risk */}
            <div className="rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-5xl font-bold text-primary">{session.overall_score ?? "N/A"}%</p>
                    <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {report?.riskLevel && <RiskBadge level={report.riskLevel} />}
                    <Badge variant="outline" className="capitalize">{session.test_type} test</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            {report?.summary && (
              <div className="p-4 rounded-lg border bg-card">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  AI Analysis Summary
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{report.summary}</p>
              </div>
            )}

            {/* Flagged Conditions */}
            {report?.flaggedConditions && report.flaggedConditions.length > 0 && (
              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <h3 className="font-semibold mb-2 text-destructive">⚠ Flagged Conditions</h3>
                <div className="flex flex-wrap gap-2">
                  {report.flaggedConditions.map((c, i) => (
                    <Badge key={i} variant="outline" className="border-destructive/50 text-destructive">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Domain Scores (Dysgraphia) */}
            {report?.domainScores && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-primary" />
                    Domain Scores
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(report.domainScores).map(([key, value]) => (
                      <div key={key} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                          <span className="text-sm font-bold">{value}%</span>
                        </div>
                        <Progress value={value} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Subtest Scores (Dyslexia/Dyscalculia) */}
            {report?.subtestScores && report.subtestScores.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Subtest Performance
                  </h3>
                  <div className="space-y-3">
                    {report.subtestScores.map((st) => (
                      <div key={st.id} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium capitalize">{st.id.replace(/_/g, " ")}</span>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="font-bold">{Math.round(st.accuracy)}%</span>
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {st.avgResponseTime.toFixed(1)}s
                            </span>
                          </div>
                        </div>
                        <Progress value={st.accuracy} className="h-2" />
                        {(st.errorCount > 0 || st.hesitationCount > 0) && (
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            {st.errorCount > 0 && <span>{st.errorCount} errors</span>}
                            {st.hesitationCount > 0 && <span>{st.hesitationCount} hesitations</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Perception Analysis */}
            {report?.analysis && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    Perception Analysis
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {report.analysis.emotionalPolarity && (
                      <Card>
                        <CardContent className="pt-3 pb-3">
                          <p className="text-xs text-muted-foreground">Emotional Polarity</p>
                          <p className="font-semibold capitalize">{report.analysis.emotionalPolarity}</p>
                        </CardContent>
                      </Card>
                    )}
                    {report.analysis.detailLevel && (
                      <Card>
                        <CardContent className="pt-3 pb-3">
                          <p className="text-xs text-muted-foreground">Detail Level</p>
                          <p className="font-semibold capitalize">{report.analysis.detailLevel}</p>
                        </CardContent>
                      </Card>
                    )}
                    {report.analysis.perspectiveType && (
                      <Card>
                        <CardContent className="pt-3 pb-3">
                          <p className="text-xs text-muted-foreground">Perspective Type</p>
                          <p className="font-semibold capitalize">{report.analysis.perspectiveType}</p>
                        </CardContent>
                      </Card>
                    )}
                    {report.analysis.consistency != null && (
                      <Card>
                        <CardContent className="pt-3 pb-3">
                          <p className="text-xs text-muted-foreground">Consistency</p>
                          <p className="font-semibold">{report.analysis.consistency}%</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  {report.analysis.summary && (
                    <p className="text-sm text-muted-foreground mt-3">{report.analysis.summary}</p>
                  )}
                </div>
              </>
            )}

            {/* Answered Questions (Dyslexia/Dyscalculia) */}
            {report?.answeredQuestions && report.answeredQuestions.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Question-by-Question Breakdown</h3>
                  <div className="space-y-2">
                    {report.answeredQuestions.map((q, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border text-sm ${
                          q.correct ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {q.correct ? (
                                <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                              )}
                              <span className="font-medium">Q{i + 1}:</span>
                              <Badge variant="outline" className="text-[10px]">{q.subtest}</Badge>
                            </div>
                            <p className="text-muted-foreground ml-6">{q.question}</p>
                            <p className="ml-6 mt-1">
                              <span className="text-muted-foreground">Answer: </span>
                              <span className={q.correct ? "text-success" : "text-destructive"}>{q.answer}</span>
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {q.responseTime.toFixed(1)}s
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Recommendations */}
            {report?.recommendations && report.recommendations.length > 0 && (
              <>
                <Separator />
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    💡 Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {report.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Raw Metrics (Dysgraphia) */}
            {report?.metrics && Object.keys(report.metrics).length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 text-xs text-muted-foreground uppercase tracking-wider">Detailed Metrics</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(report.metrics).map(([key, value]) => (
                      <div key={key} className="p-2 rounded bg-muted/50 text-center">
                        <p className="text-lg font-bold">{typeof value === "number" ? Math.round(value) : value}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Disclaimer Footer */}
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-muted-foreground">
              <strong>Disclaimer:</strong> This is a screening tool only and does not constitute a medical diagnosis.
              Consult qualified SLD specialists for proper diagnosis.
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
