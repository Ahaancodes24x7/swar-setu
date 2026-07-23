import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  Calculator,
  Pencil,
  ArrowLeft,
  UserPlus,
  ClipboardCheck,
  BarChart3,
  HeartHandshake,
  AlertTriangle,
} from "lucide-react";

export default function TeacherHelp() {
  const navigate = useNavigate();

  return (
    <Layout hideFooter hideHeader={true}>
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto max-w-4xl px-4 py-12">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="mb-6 -ml-2"
            onClick={() => navigate("/dashboard/teacher")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          {/* Header */}
          <header className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              🌿 Teacher Support Center
            </h1>
            <p className="text-muted-foreground text-lg">
              Understand learning differences and how to use SWAR-Setu effectively.
            </p>
          </header>

          {/* Section 1: Understanding LDs */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Understanding Learning Differences
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5 overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center mb-2">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg text-foreground">Dyslexia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Definition:</strong> A learning difference
                    affecting reading fluency and accuracy.
                  </p>
                  <p>
                    <strong className="text-foreground">Reading difficulties:</strong> Letter
                    reversals, word decoding challenges, slow reading pace.
                  </p>
                  <p>
                    <strong className="text-foreground">Symptoms:</strong> Difficulty rhyming,
                    trouble with phonological awareness, inconsistent spelling.
                  </p>
                  <p>
                    <strong className="text-foreground">Emotional impact:</strong> Frustration with
                    reading tasks, avoidance, lowered self-esteem.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5 overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center mb-2">
                    <Calculator className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg text-foreground">Dyscalculia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Number processing:</strong> Difficulty
                    understanding quantities, number symbols, and basic arithmetic.
                  </p>
                  <p>
                    <strong className="text-foreground">Math anxiety:</strong> Fear or stress when
                    confronted with math tasks.
                  </p>
                  <p>
                    <strong className="text-foreground">Classroom signs:</strong> Trouble counting,
                    difficulty with sequencing, struggles with time and measurement.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5 overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center mb-2">
                    <Pencil className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg text-foreground">Dysgraphia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Writing difficulties:</strong> Trouble
                    forming letters, organizing thoughts on paper.
                  </p>
                  <p>
                    <strong className="text-foreground">Motor coordination:</strong> Challenges with
                    fine motor skills required for handwriting.
                  </p>
                  <p>
                    <strong className="text-foreground">Messy handwriting:</strong> Inconsistent
                    letter size, spacing, and legibility.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Section 2: Emotional Impact */}
          <section className="mb-12">
            <div className="rounded-lg border-l-4 border-orange-500 bg-amber-900/20 dark:bg-orange-500/10 p-6 transition-opacity duration-300 hover:opacity-95">
              <div className="flex gap-3">
                <AlertTriangle className="h-6 w-6 text-orange-500 shrink-0 mt-0.5" />
                <div className="space-y-3 text-foreground">
                  <h3 className="font-semibold text-lg">The Emotional Impact</h3>
                  <p className="text-muted-foreground">
                    Children with learning differences often experience significant emotional
                    stress and classroom anxiety. Peer comparison can lead to feelings of inadequacy,
                    and students may be mislabeled as &quot;lazy&quot; or &quot;unmotivated&quot;
                    when they are actually struggling with invisible challenges.
                  </p>
                  <p className="text-muted-foreground">
                    As a teacher, your role in providing early support, patience, and
                    appropriate accommodations is vital. SWAR-Setu helps you identify students
                    who may benefit from targeted intervention, so you can advocate for them
                    and create an inclusive learning environment.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: How to Use the App */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              How to Use SWAR-Setu
            </h2>
            <div className="space-y-6">
              {[
                {
                  step: 1,
                  icon: UserPlus,
                  title: "Add Students",
                  description:
                    "Add your students to your forest using the Plant a Tree button. Include their name, grade, and optionally link a parent email for home access.",
                },
                {
                  step: 2,
                  icon: ClipboardCheck,
                  title: "Conduct Assessments",
                  description:
                    "Run dyslexia, dyscalculia, dysgraphia, or perception tests through the Conduct Tests tab. Select a student and follow the on-screen assessment flow.",
                },
                {
                  step: 3,
                  icon: BarChart3,
                  title: "View Reports & Analytics",
                  description:
                    "Check the Reports tab for past assessments, scores, and risk levels. Export PDF reports for records or sharing with parents and specialists.",
                },
                {
                  step: 4,
                  icon: HeartHandshake,
                  title: "Provide Early Intervention",
                  description:
                    "Use the Student Progress button to track trends over time. Flag students who need extra support and connect with parents through the linked parent portal.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex gap-4 p-4 rounded-lg border border-primary/20 bg-gradient-to-r from-background to-primary/5 transition-all duration-300 hover:border-primary/30"
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Step {item.step}: {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: FAQ */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq-1" className="border-primary/20">
                <AccordionTrigger className="text-foreground hover:text-primary hover:no-underline">
                  Is this a medical diagnosis tool?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  No. SWAR-Setu is a screening aid to help identify students who may benefit from
                  further evaluation. It does not replace professional assessment by a qualified
                  clinician. Use results as a starting point for conversations with parents and
                  specialists.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-2" className="border-primary/20">
                <AccordionTrigger className="text-foreground hover:text-primary hover:no-underline">
                  How accurate are assessments?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Assessments are designed to align with DSM-5 criteria where applicable and use
                  evidence-based methods. Accuracy depends on test administration conditions and
                  student engagement. Results should be interpreted as indicators, not definitive
                  diagnoses.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-3" className="border-primary/20">
                <AccordionTrigger className="text-foreground hover:text-primary hover:no-underline">
                  Can parents view reports?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes. When you link a parent email to a student, parents can log in and view
                  their child&apos;s progress, test results, and recommended resources through
                  the Parent Portal.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-4" className="border-primary/20">
                <AccordionTrigger className="text-foreground hover:text-primary hover:no-underline">
                  How often should tests be conducted?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  We recommend baseline screening at the start of the year, with follow-up
                  assessments every few months to track progress. Avoid testing too frequently,
                  as it can cause fatigue and affect accuracy.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-5" className="border-primary/20">
                <AccordionTrigger className="text-foreground hover:text-primary hover:no-underline">
                  What does &quot;Flagged&quot; mean?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  A &quot;Flagged&quot; student has assessment results suggesting they may need
                  additional support or further evaluation. It is a prompt for you to consider
                  intervention strategies and to communicate with parents and specialists.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-6" className="border-primary/20">
                <AccordionTrigger className="text-foreground hover:text-primary hover:no-underline">
                  Is student data secure?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Yes. Student data is stored securely and access is controlled by role-based
                  permissions. Only authorized teachers and linked parents can view student
                  information. We follow best practices for data protection and privacy.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        </div>
      </div>
    </Layout>
  );
}
