import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Brain, Sparkles, TrendingUp, ShieldAlert } from "lucide-react";
import { AIPredictionResult } from "@/api/ai";
import { Dsm5CriteriaPanel } from "@/components/profile/Dsm5CriteriaPanel";

interface AIResultPanelProps {
  result: AIPredictionResult;
}

const RiskBadge = ({ level }: { level: string }) => {
  const normalizedLevel = (level || "low").toUpperCase();
  const colors: Record<string, string> = {
    LOW: "bg-emerald-100 text-emerald-800 border-emerald-300",
    MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
    ELEVATED: "bg-orange-100 text-orange-800 border-orange-300",
    HIGH: "bg-rose-100 text-rose-800 border-rose-300 font-semibold",
    VERY_HIGH: "bg-red-200 text-red-900 border-red-400 font-bold",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border ${colors[normalizedLevel] || "bg-gray-100 text-gray-800"}`}>
      {normalizedLevel}
    </span>
  );
};

const getRiskBarColor = (level: string): string => {
  const normalizedLevel = (level || "low").toUpperCase();
  const colors: Record<string, string> = {
    LOW: "bg-emerald-500",
    MEDIUM: "bg-amber-500",
    ELEVATED: "bg-orange-500",
    HIGH: "bg-rose-500",
    VERY_HIGH: "bg-red-600",
  };
  return colors[normalizedLevel] || "bg-blue-500";
};

const formatFeatureName = (featName: string): string => {
  return featName
    .replace(/_/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace("Wpm", "WPM")
    .replace("Accuracy", "Accuracy Rate")
    .replace("Ms", "(ms)")
    .replace("Normalized", "")
    .trim();
};

export const AIResultPanel: React.FC<AIResultPanelProps> = ({ result }) => {
  if (!result || !result.prediction) return null;

  const pred = result.prediction;
  const isIndividual = ["single_test", "individual_0.5fill", "individual"].includes(pred.prediction_type || "");
  const disorderSource = pred.headline_disorder || pred.disorder_type;
  const disorderName = disorderSource ? disorderSource.charAt(0).toUpperCase() + disorderSource.slice(1) : "Assessment";
  const isScreeningModel = (pred.model_id || "").startsWith("lightgbm");
  const decision = pred.screening_decision;
  const decisionText: Record<string, string> = {
    screen_positive: "Screen positive: specialist assessment advised",
    screen_negative: "Screen negative at this time",
    uncertain: "Borderline result: re-screen advised",
    atypical_input: "Unusual response pattern: please re-test",
  };

  const riskScore = pred.risk_score || 0.0;
  const uncertainty = pred.uncertainty || 0.0;
  const confidence = pred.confidence || Math.round((1.0 - uncertainty) * 100);
  const shapFeatures = pred.top_3_shap_features || [];
  const conformalIntervals = pred.conformal_intervals || {};
  const explanation = result.explanation?.explanation || "";
  const recommendedSteps = result.explanation?.recommended_steps || [];

  return (
    <Card className="mt-6 border-2 border-primary/20 bg-gradient-to-br from-white to-primary/5 shadow-md">
      <CardHeader className="pb-3 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">AI Screening Diagnostics</CardTitle>
              <p className="text-xs text-muted-foreground">
                {isScreeningModel ? "LightGBM screening model (age & language adjusted)" : "FT-Transformer (legacy engine)"}
                {isIndividual ? " · single test" : ""}
              </p>
            </div>
          </div>
          <RiskBadge level={pred.risk_level} />
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Risk Score & Uncertainty Bar */}
        <div className="space-y-1.5 bg-white p-3 rounded-lg border">
          <div className="flex justify-between items-center text-sm font-medium">
            <span>{disorderName} screening likelihood</span>
            <span className="font-bold text-primary">
              {(riskScore * 100).toFixed(1)}%
              {pred.relative_risk ? ` (${pred.relative_risk.toFixed(1)}× typical)` : ""}
            </span>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${getRiskBarColor(pred.risk_level)}`}
              style={{ width: `${Math.min(100, Math.max(5, riskScore * 100))}%` }}
            />
          </div>

          {isScreeningModel ? (
            <div className="flex justify-between text-xs text-muted-foreground pt-1">
              <span>{decision ? decisionText[decision] : ""}</span>
              {pred.base_rate ? <span>Typical rate: {(pred.base_rate * 100).toFixed(0)}%</span> : null}
            </div>
          ) : (
            <div className="flex justify-between text-xs text-muted-foreground pt-1">
              <span>Confidence: {confidence}%</span>
              <span>MC Uncertainty: ±{(uncertainty * 100).toFixed(1)}%</span>
            </div>
          )}

          {/* Conformal Prediction Interval (legacy engine) */}
          {!isScreeningModel && conformalIntervals && Object.keys(conformalIntervals).length > 0 && (
            <div className="text-xs text-primary/80 pt-1 font-medium border-t border-dashed mt-2">
              📊 90% Statistical Conformal Interval:{" "}
              {Object.entries(conformalIntervals).map(([disorder, bounds]) => {
                const lower = typeof bounds.lower_bound === "number" ? (bounds.lower_bound * 100).toFixed(0) : "0";
                const upper = typeof bounds.upper_bound === "number" ? (bounds.upper_bound * 100).toFixed(0) : "100";
                return `[${lower}% – ${upper}%] (${disorder})`;
              }).join(", ")}
            </div>
          )}
        </div>

        {/* Top SHAP Drivers */}
        {shapFeatures.length > 0 && (
          <div className="bg-white p-3 rounded-lg border space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" /> Main areas behind this result (SHAP)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {shapFeatures.slice(0, 3).map((feat, idx) => (
                <div key={idx} className="bg-primary/5 p-2 rounded text-xs border border-primary/10 flex items-center gap-1.5">
                  <span className="text-rose-500 font-bold">▲</span>
                  <span className="font-medium text-gray-700">{formatFeatureName(feat)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DSM-5 criteria A-D from the student profile (teacher questionnaire) */}
        {isScreeningModel && (
          <Dsm5CriteriaPanel summary={pred.dsm5} focus={disorderSource} profileMissing={pred.covariates?.profile_used === false} />
        )}

        {/* Gemini Explanation */}
        {explanation && (
          <div className="bg-blue-50/70 p-3.5 rounded-lg border border-blue-200/60 space-y-2">
            <div className="flex items-center gap-1.5 text-blue-900 font-semibold text-xs uppercase tracking-wide">
              <Sparkles className="h-4 w-4 text-blue-600" /> AI Explanatory Summary
            </div>
            <p className="text-xs text-blue-950 leading-relaxed whitespace-pre-wrap">{explanation}</p>

            {recommendedSteps.length > 0 && (
              <div className="pt-2 border-t border-blue-200/50 mt-2">
                <span className="text-xs font-semibold text-blue-900">Recommended Steps:</span>
                <ul className="text-xs text-blue-900/90 list-disc list-inside space-y-0.5 mt-1">
                  {recommendedSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Individual Test Warning Gating */}
        {isIndividual && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <span className="font-semibold">Single-test screening:</span> this result uses only this test. Complete all three assessments for a combined profile that also considers overlap between reading, maths and writing difficulties.
            </div>
          </div>
        )}

        {/* Clinical Disclaimer */}
        <p className="text-[11px] text-muted-foreground italic text-center pt-1">
          * This output is generated for clinical screening purposes and does not constitute a formal diagnosis.
        </p>
      </CardContent>
    </Card>
  );
};
