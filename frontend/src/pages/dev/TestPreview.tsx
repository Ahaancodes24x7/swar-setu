// Development-only preview of the assessment screens (registered in App.tsx only when
// import.meta.env.DEV). Lets the tests be completed without signing in, to check the
// screens shown after a test. Usage: /dev/test-preview?test=dyslexia|dyscalculia|dysgraphia|perception|voice|ai-result
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { DSM5DyslexiaTest } from "@/components/tests/DSM5DyslexiaTest";
import { DSM5DyscalculiaTest } from "@/components/tests/DSM5DyscalculiaTest";
import { DysgraphiaCanvas } from "@/components/tests/DysgraphiaCanvas";
import { PerceptionTest } from "@/components/tests/PerceptionTest";
import { VoiceTest } from "@/components/VoiceTest";
import { AIResultPanel } from "@/components/dashboard/AIResultPanel";
import type { AIPredictionResult } from "@/api/ai";

const SAMPLE_AI: AIPredictionResult = {
  success: true,
  prediction: {
    disorder_type: "dyslexia", headline_disorder: "Dyslexia", prediction_type: "single_test",
    model_id: "lightgbm-normed@preview", risk_level: "Medium", risk_score: 0.112, base_rate: 0.08,
    relative_risk: 1.4, screening_decision: "uncertain", conformal_set: [0, 1],
    top_3_shap_features: ["word_decoding_accuracy", "phonological_awareness_score", "rapid_naming_speed_normalized"],
  },
  explanation: {
    source: "fallback",
    explanation: "This screening shows some signs that may relate to reading. Targeted support and a re-screen in a few weeks are advisable.",
    recommended_steps: ["Start short daily practice on the highlighted skills.", "Ask the teacher for small classroom supports.", "Track progress weekly.", "Re-screen in 6-8 weeks."],
    confidence_note: "This is a screening result, not a diagnosis.",
  },
};

export default function TestPreview() {
  const [params] = useSearchParams();
  const test = params.get("test") || "dyslexia";
  const [completed, setCompleted] = useState<unknown>(null);
  const props = { studentName: "Aarav", studentGrade: "Grade 3", studentId: "preview-student", onComplete: setCompleted };

  return (
    <Layout hideFooter hideHeader={true}>
      <div className="min-h-screen bg-muted/20 py-8">
        <div className="container mx-auto px-4" data-testid="preview-root">
          {test === "dyslexia" && <DSM5DyslexiaTest {...props} />}
          {test === "dyscalculia" && <DSM5DyscalculiaTest {...props} />}
          {test === "dysgraphia" && <DysgraphiaCanvas {...props} />}
          {test === "perception" && <PerceptionTest {...props} />}
          {test === "voice" && <VoiceTest {...props} />}
          {test === "ai-result" && <AIResultPanel result={SAMPLE_AI} />}
          {completed !== null && <span data-testid="completed" className="sr-only">completed</span>}
        </div>
      </div>
    </Layout>
  );
}
