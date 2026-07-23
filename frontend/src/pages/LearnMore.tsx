import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mic,
  Brain,
  Database,
  Cloud,
  Cpu,
  Waves,
  FileText,
  ArrowRight,
  CheckCircle,
  Layers,
  Workflow,
} from "lucide-react";

const workflowSteps = [
  {
    step: 1,
    title: "Student Registration",
    description: "Teachers register students with basic demographic information. Parents can be linked via email for real-time updates.",
    icon: FileText,
  },
  {
    step: 2,
    title: "Voice-Based Assessment",
    description: "Students complete age-appropriate reading and speaking tasks in their preferred language. Our ASR captures every nuance.",
    icon: Mic,
  },
  {
    step: 3,
    title: "AI Analysis Pipeline",
    description: "Deep learning models analyze phoneme accuracy, prosody, temporal patterns, and error densities in real-time.",
    icon: Brain,
  },
  {
    step: 4,
    title: "Risk Flagging",
    description: "Based on DSM-5 criteria, the system flags potential indicators of dyslexia, dyscalculia, or dysgraphia.",
    icon: Waves,
  },
  {
    step: 5,
    title: "Report Generation",
    description: "Comprehensive, exportable reports are generated for teachers, parents, and institution administrators.",
    icon: Database,
  },
];

const techStack = {
  frontend: [
    "React with TypeScript",
    "Tailwind CSS for responsive UI",
    "Shadcn/UI component library",
    "Real-time audio visualization",
  ],
  backend: [
    "Supabase for database & auth",
    "Edge Functions for serverless logic",
    "PostgreSQL with RLS policies",
    "Secure file storage",
  ],
  ai: [
    "Custom ASR models for Indian languages",
    "CNN-based acoustic feature extraction",
    "Phoneme alignment algorithms",
    "LLM-powered report generation",
  ],
  analysis: [
    "Phoneme Error Rate (PER) calculation",
    "Prosodic feature extraction",
    "Temporal pattern analysis",
    "Multilingual interference handling",
  ],
};

const voiceParameters = [
  {
    title: "Phoneme Accuracy",
    description: "Detects substitutions (b↔d, p↔b), omissions, incorrect sequencing, and consonant cluster difficulties.",
    importance: "Core signal for dyslexia detection",
  },
  {
    title: "Pronunciation Consistency",
    description: "Tracks variance in articulation of identical phonemes across multiple attempts.",
    importance: "Strong dyslexia indicator in children",
  },
  {
    title: "Prosodic Features",
    description: "Analyzes stress placement, intonation patterns, pitch movement, and syllable stress.",
    importance: "Language processing & fluency issues",
  },
  {
    title: "Temporal Features",
    description: "Measures pause duration, hesitation patterns, speech rate, and syllable timing.",
    importance: "Reading effort estimation",
  },
  {
    title: "Error Pattern Density",
    description: "Identifies error clusters, recurring patterns, and escalation with word complexity.",
    importance: "Distinguishes practice gaps from cognitive difficulty",
  },
  {
    title: "Multilingual Handling",
    description: "Applies accent normalization and native-language phoneme transfer detection.",
    importance: "Prevents false positives for vernacular speakers",
  },
];

export default function LearnMore() {
  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 lg:py-24 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">How SWARSETU Works</h1>
            <p className="text-lg text-muted-foreground">
              A comprehensive overview of our voice-first, AI-powered approach to flagging learning disabilities in Indian students.
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">End-to-End Workflow</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From student registration to comprehensive reports, here's how the platform works.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            {workflowSteps.map((item, idx) => (
              <div key={idx} className="flex gap-6 mb-8 last:mb-0">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {item.step}
                  </div>
                  {idx < workflowSteps.length - 1 && (
                    <div className="w-0.5 h-full bg-border mt-2" />
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <item.icon className="h-5 w-5 text-primary" />
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                  </div>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Voice Analysis Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Voice Analysis Parameters</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our AI analyzes multiple acoustic and linguistic features to provide accurate risk assessment.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {voiceParameters.map((param, idx) => (
              <Card key={idx} className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{param.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{param.description}</p>
                  <div className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                    <CheckCircle className="h-3 w-3" />
                    {param.importance}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Technology Stack</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built with modern, scalable technologies designed for reliability and performance.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-lg bg-secondary/20 flex items-center justify-center mb-2">
                  <Layers className="h-5 w-5 text-secondary" />
                </div>
                <CardTitle className="text-lg">Frontend</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {techStack.frontend.map((item, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <ArrowRight className="h-3 w-3 mt-1 text-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center mb-2">
                  <Cloud className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Backend</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {techStack.backend.map((item, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <ArrowRight className="h-3 w-3 mt-1 text-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center mb-2">
                  <Cpu className="h-5 w-5 text-accent" />
                </div>
                <CardTitle className="text-lg">AI/ML</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {techStack.ai.map((item, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <ArrowRight className="h-3 w-3 mt-1 text-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center mb-2">
                  <Workflow className="h-5 w-5 text-success" />
                </div>
                <CardTitle className="text-lg">Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {techStack.analysis.map((item, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <ArrowRight className="h-3 w-3 mt-1 text-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Flagging Criteria Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">DSM-5 Aligned Flagging Criteria</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our system uses rigorous, evidence-based criteria aligned with DSM-5 guidelines. We flag indicators—not diagnose.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="border-2 border-secondary/30">
              <CardHeader>
                <CardTitle className="text-xl text-secondary">Dyslexia Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>Phoneme Error Rate (PER) &gt;10% on repeated tasks</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>Consistent phoneme confusions (labials, fricatives, stops)</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>6-month persistence despite targeted instruction</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>Reading accuracy/fluency ≤16th percentile</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-accent/30">
              <CardHeader>
                <CardTitle className="text-xl text-accent">Dyscalculia Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>Transcoding errors (21↔12, 6↔9)</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>Place-value misunderstandings</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>Impairment in ≥2 math domains</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>Persistent finger-counting on simple tasks</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8 max-w-2xl mx-auto">
            <strong>Important:</strong> SWARSETU flags potential indicators for further professional evaluation. 
            It does not provide medical diagnoses. Differential diagnosis must rule out sensory, neurological, 
            and psychosocial factors.
          </p>
        </div>
      </section>
    </Layout>
  );
}
