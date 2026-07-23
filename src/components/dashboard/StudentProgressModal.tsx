import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { FileText, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export interface StudentProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  studentGrade?: string;
  teacherId: string;
}

type TestSessionRow = Tables<"test_sessions">["Row"];

interface ChartDataPoint {
  date: string;
  score: number;
}

type TrendStatus = "improving" | "declining" | "stable";

interface ProgressStats {
  average: number;
  high: number;
  low: number;
  trend: TrendStatus;
  firstScore: number | null;
  lastScore: number | null;
}

export function StudentProgressModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  studentGrade,
  teacherId,
}: StudentProgressModalProps) {
  const [sessions, setSessions] = useState<TestSessionRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !studentId || !teacherId) return;

    let cancelled = false;
    setLoading(true);

    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from("test_sessions")
        .select("id, created_at, overall_score, student_id, conducted_by")
        .eq("student_id", studentId)
        .eq("conducted_by", teacherId)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (!error && data) setSessions(data as TestSessionRow[]);
      setLoading(false);
    };

    fetchSessions();
    return () => {
      cancelled = true;
    };
  }, [isOpen, studentId, teacherId]);

  const chartData = useMemo((): ChartDataPoint[] => {
    return sessions
      .filter((s) => s.overall_score != null)
      .map((s) => ({
        date: new Date(s.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
        score: Number(s.overall_score),
      }));
  }, [sessions]);

  const stats = useMemo((): ProgressStats | null => {
    const scores = sessions
      .filter((s) => s.overall_score != null)
      .map((s) => Number(s.overall_score)) as number[];
    if (scores.length === 0) return null;
    const firstScore = scores[0] ?? null;
    const lastScore = scores[scores.length - 1] ?? null;
    const average =
      scores.reduce((sum, n) => sum + n, 0) / scores.length;
    const high = Math.max(...scores);
    const low = Math.min(...scores);
    let trend: TrendStatus = "stable";
    if (firstScore != null && lastScore != null) {
      if (lastScore > firstScore) trend = "improving";
      else if (lastScore < firstScore) trend = "declining";
    }
    return { average, high, low, trend, firstScore, lastScore };
  }, [sessions]);

  const TrendIcon = stats?.trend === "improving"
    ? TrendingUp
    : stats?.trend === "declining"
      ? TrendingDown
      : Minus;

  const trendLabel =
    stats?.trend === "improving"
      ? "Improving"
      : stats?.trend === "declining"
        ? "Declining"
        : "Stable";

  const trendClass =
    stats?.trend === "improving"
      ? "text-success"
      : stats?.trend === "declining"
        ? "text-destructive"
        : "text-muted-foreground";

  const hasData = chartData.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle className="text-xl">{studentName}</DialogTitle>
            {studentGrade != null && studentGrade !== "" && (
              <Badge variant="secondary" className="bg-white/10 text-zinc-300 border-zinc-700">
                Grade {studentGrade}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <span className="animate-pulse">Loading...</span>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <FileText className="h-12 w-12 opacity-50" />
            <p className="text-sm">No test data available yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                <div className={`flex items-center gap-1.5 font-medium ${trendClass}`}>
                  <TrendIcon className="h-4 w-4" />
                  <span className="text-sm">Trend</span>
                </div>
                <p className={`text-lg font-semibold mt-1 ${trendClass}`}>{trendLabel}</p>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                <p className="text-xs text-muted-foreground font-medium">Average</p>
                <p className="text-lg font-semibold text-primary">
                  {stats ? Math.round(stats.average) : 0}%
                </p>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                <p className="text-xs text-muted-foreground font-medium">High / Low</p>
                <p className="text-lg font-semibold">
                  {stats ? `${stats.high}% / ${stats.low}%` : "—"}
                </p>
              </div>
            </div>

            <div className="h-[240px] w-full rounded-lg bg-white/5 border border-white/10 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "rgb(161 161 170)", fontSize: 11 }}
                    axisLine={{ stroke: "rgb(63 63 70)" }}
                    tickLine={{ stroke: "rgb(63 63 70)" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "rgb(161 161 170)", fontSize: 11 }}
                    axisLine={{ stroke: "rgb(63 63 70)" }}
                    tickLine={{ stroke: "rgb(63 63 70)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgb(24 24 27)",
                      border: "1px solid rgb(63 63 70)",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "rgb(212 212 216)" }}
                    formatter={(value: number) => [`${value}%`, "Score"]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="url(#scoreGradient)"
                    strokeWidth={3}
                    dot={{ r: 0 }}
                    activeDot={{ r: 5, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
