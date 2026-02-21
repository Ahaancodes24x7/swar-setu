import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Users, Briefcase, Handshake, Newspaper, FlaskConical, FileText,
  HelpCircle, Shield, Scale, Cookie, Accessibility, Heart, Target,
  Globe, BookOpen, GraduationCap, Mail
} from "lucide-react";

function PageShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{title}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
        </div>
        {children}
      </div>
    </Layout>
  );
}

export function AboutPage() {
  return (
    <PageShell title="About SWARSETU" subtitle="Bridging the gap between early detection and inclusive education across India.">
      <div className="space-y-8">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5 text-primary" /> Our Mission</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>SWARSETU ("Bridge of Voices") was born from a simple belief: every child deserves to be understood. In India, an estimated 10–15% of children have specific learning disabilities, yet most go undetected until it's too late for effective early intervention.</p>
            <p>We combine advanced AI, multilingual voice analysis, and culturally sensitive assessment tools to flag early indicators of dyslexia, dyscalculia, and dysgraphia — in 11 Indian languages.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Our Values</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: "Privacy First", desc: "All data is encrypted. We never make medical diagnoses." },
                { title: "Accessibility", desc: "Voice-first design ensures every child can participate." },
                { title: "Inclusivity", desc: "11 languages covering 95%+ of India's student population." },
                { title: "Evidence-Based", desc: "DSM-5 aligned assessments backed by cognitive science." },
              ].map((v) => (
                <div key={v.title} className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="font-semibold mb-1">{v.title}</p>
                  <p className="text-sm text-muted-foreground">{v.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> The Team</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground">
            <p>SWARSETU is built by a passionate team of educators, AI researchers, and speech-language pathologists committed to transforming learning disability detection in India.</p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

export function CareersPage() {
  return (
    <PageShell title="Careers" subtitle="Join us in building India's most impactful EdTech platform.">
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6 text-muted-foreground">
            <p>We're always looking for passionate individuals who want to make a difference in children's lives through technology. If you're excited about AI, education, or accessibility, we'd love to hear from you.</p>
          </CardContent>
        </Card>
        {[
          { title: "ML Engineer – Speech & NLP", type: "Full-time", location: "Remote / Bengaluru" },
          { title: "Product Designer – EdTech", type: "Full-time", location: "Remote" },
          { title: "Full-Stack Developer", type: "Full-time", location: "Remote / Delhi NCR" },
          { title: "Educational Content Specialist", type: "Part-time", location: "Remote" },
        ].map((job) => (
          <Card key={job.title}>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-semibold text-lg">{job.title}</h3>
                  <p className="text-sm text-muted-foreground">{job.location}</p>
                </div>
                <Badge variant="secondary">{job.type}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        <div className="text-center pt-4">
          <p className="text-muted-foreground">Interested? Send your resume to <a href="mailto:careers@swarsetu.in" className="text-primary hover:underline">careers@swarsetu.in</a></p>
        </div>
      </div>
    </PageShell>
  );
}

export function PartnershipsPage() {
  return (
    <PageShell title="Partnerships" subtitle="Collaborate with us to bring early detection to every school in India.">
      <div className="space-y-6">
        {[
          { icon: GraduationCap, title: "Schools & Institutions", desc: "Integrate SWARSETU into your school's assessment workflow. Get bulk pricing, teacher training, and dedicated support." },
          { icon: Globe, title: "NGOs & Government Bodies", desc: "Partner with us to deploy screening programs in underserved communities and government schools." },
          { icon: FlaskConical, title: "Research Institutions", desc: "Collaborate on studies related to learning disabilities, speech patterns, and cognitive assessment in Indian languages." },
          { icon: Briefcase, title: "Corporate CSR", desc: "Fund literacy and learning disability awareness programs as part of your corporate social responsibility initiatives." },
        ].map((p) => (
          <Card key={p.title}>
            <CardContent className="pt-6 flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <p.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        <div className="text-center pt-4">
          <p className="text-muted-foreground">Reach out at <a href="mailto:partnerships@swarsetu.in" className="text-primary hover:underline">partnerships@swarsetu.in</a></p>
        </div>
      </div>
    </PageShell>
  );
}

export function PressPage() {
  return (
    <PageShell title="Press & Media" subtitle="News, updates, and media resources from SWARSETU.">
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6 text-muted-foreground">
            <p>For press inquiries, interviews, or media kits, please contact us at <a href="mailto:press@swarsetu.in" className="text-primary hover:underline">press@swarsetu.in</a>.</p>
          </CardContent>
        </Card>
        {[
          { date: "Feb 2026", title: "SWARSETU launches AI-powered perception testing module", desc: "New cognitive assessment tool uses real-time AI image generation for non-diagnostic behavioral screening." },
          { date: "Jan 2026", title: "Platform expands to support 11 Indian languages", desc: "Multilingual voice analysis now covers Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, and English." },
          { date: "Dec 2025", title: "SWARSETU selected for National Education Innovation Challenge", desc: "Recognized for innovative approach to learning disability screening in Indian classrooms." },
        ].map((item) => (
          <Card key={item.title}>
            <CardContent className="pt-6">
              <Badge variant="outline" className="mb-2">{item.date}</Badge>
              <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function ResearchPage() {
  return (
    <PageShell title="Research" subtitle="The scientific foundation behind SWARSETU's assessment methodology.">
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6 text-muted-foreground space-y-4">
            <p>SWARSETU's assessment framework is grounded in established cognitive science research and aligned with DSM-5 diagnostic criteria for Specific Learning Disorders.</p>
            <p>Our tools are designed for screening, not diagnosis. They flag indicators that may warrant further evaluation by qualified professionals.</p>
          </CardContent>
        </Card>
        {[
          { title: "Phonological Deficit Theory", desc: "Reading difficulties often stem from impaired phonological processing. Our assessments measure phoneme awareness, pseudoword decoding, and rapid naming." },
          { title: "Approximate Number System (ANS)", desc: "Dyscalculia research links deficits in the ANS to difficulties with number sense. Our dot-cluster and magnitude comparison tasks assess this core capacity." },
          { title: "Motor Planning & Dysgraphia", desc: "Writing difficulties involve fine motor control, visual-spatial processing, and orthographic coding. Our canvas-based assessments capture stroke patterns, hesitations, and consistency." },
          { title: "Cross-linguistic Considerations", desc: "Indian languages have unique scripts, phonemic inventories, and orthographic depth. Our assessments are adapted for each language's specific characteristics." },
        ].map((r) => (
          <Card key={r.title}>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-2">{r.title}</h3>
              <p className="text-sm text-muted-foreground">{r.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function BlogPage() {
  return (
    <PageShell title="Blog" subtitle="Insights, updates, and stories from the SWARSETU team.">
      <div className="space-y-6">
        {[
          { date: "Feb 5, 2026", title: "Understanding Dyslexia in Indian Languages", desc: "How phonological processing differs across Hindi, Tamil, and Bengali — and what it means for early detection.", tag: "Research" },
          { date: "Jan 28, 2026", title: "5 Signs Your Child Might Need a Learning Assessment", desc: "A parent's guide to recognizing early indicators of learning disabilities, without creating anxiety.", tag: "Parents" },
          { date: "Jan 15, 2026", title: "How AI is Changing Special Education in India", desc: "From voice analysis to adaptive testing — the role of artificial intelligence in making assessments accessible.", tag: "Technology" },
          { date: "Jan 5, 2026", title: "Teacher's Guide: Conducting Effective Screenings", desc: "Best practices for using SWARSETU's assessment tools in your classroom, with tips for communication with parents.", tag: "Teachers" },
        ].map((post) => (
          <Card key={post.title} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{post.tag}</Badge>
                <span className="text-xs text-muted-foreground">{post.date}</span>
              </div>
              <h3 className="font-semibold text-lg mb-1">{post.title}</h3>
              <p className="text-sm text-muted-foreground">{post.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

export function FAQPage() {
  return (
    <PageShell title="Frequently Asked Questions" subtitle="Common questions about SWARSETU and learning disability screening.">
      <Card>
        <CardContent className="pt-6">
          <Accordion type="single" collapsible className="w-full">
            {[
              { q: "Does SWARSETU diagnose learning disabilities?", a: "No. SWARSETU is a screening tool that flags early indicators of potential learning difficulties. A formal diagnosis must be made by a qualified clinical psychologist or special educator." },
              { q: "What languages are supported?", a: "We currently support 11 Indian languages: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, and English." },
              { q: "What age group is this designed for?", a: "SWARSETU is designed for students in Grades 1–10 (approximately ages 6–16). Tests are adaptive and grade-appropriate." },
              { q: "Is my child's data safe?", a: "Yes. All data is encrypted in transit and at rest. We comply with Indian data protection standards. No personally identifiable information is shared with third parties." },
              { q: "How accurate are the assessments?", a: "Our assessments are based on DSM-5 criteria and validated cognitive science research. They provide reliable screening indicators, but are not a substitute for professional clinical evaluation." },
              { q: "Can parents use this at home?", a: "Parents can track their child's progress, access learning resources, and practice with the AI chatbot. However, formal assessments should be conducted by teachers or trained administrators." },
              { q: "How much does SWARSETU cost?", a: "SWARSETU offers a free tier for individual teachers. School-wide deployments have custom pricing. Contact us for details." },
              { q: "What happens after a child is flagged?", a: "Flagged results include specific recommendations. Teachers and parents receive guidance on next steps, including referral pathways to specialists." },
            ].map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </PageShell>
  );
}

export function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy" subtitle="Last updated: February 6, 2026">
      <Card>
        <CardContent className="pt-6 prose prose-sm max-w-none text-muted-foreground space-y-4">
          <h3 className="text-foreground font-semibold">1. Information We Collect</h3>
          <p>We collect information you provide directly: name, email, school affiliation, and assessment responses. Voice recordings are processed in real-time and not stored permanently unless explicitly opted in.</p>
          
          <h3 className="text-foreground font-semibold">2. How We Use Information</h3>
          <p>Your data is used solely to provide assessment services, generate reports, and improve our screening algorithms. We never sell personal data to third parties.</p>
          
          <h3 className="text-foreground font-semibold">3. Data Security</h3>
          <p>All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Access is restricted to authorized personnel on a need-to-know basis.</p>
          
          <h3 className="text-foreground font-semibold">4. Data Retention</h3>
          <p>Assessment data is retained for the duration of the school's subscription plus 1 year. Users can request data deletion at any time.</p>
          
          <h3 className="text-foreground font-semibold">5. Children's Privacy</h3>
          <p>We comply with applicable child data protection regulations. Student data is managed by authorized teachers and parents. We do not directly collect data from children without institutional authorization.</p>
          
          <h3 className="text-foreground font-semibold">6. Contact</h3>
          <p>For privacy concerns, contact <a href="mailto:privacy@swarsetu.in" className="text-primary hover:underline">privacy@swarsetu.in</a>.</p>
        </CardContent>
      </Card>
    </PageShell>
  );
}

export function TermsPage() {
  return (
    <PageShell title="Terms of Service" subtitle="Last updated: February 6, 2026">
      <Card>
        <CardContent className="pt-6 prose prose-sm max-w-none text-muted-foreground space-y-4">
          <h3 className="text-foreground font-semibold">1. Acceptance of Terms</h3>
          <p>By accessing SWARSETU, you agree to these terms. If you represent a school, you confirm authorization to bind your institution.</p>
          
          <h3 className="text-foreground font-semibold">2. Service Description</h3>
          <p>SWARSETU provides AI-powered learning disability screening tools. Our service is a screening aid, not a medical or clinical diagnostic tool.</p>
          
          <h3 className="text-foreground font-semibold">3. User Responsibilities</h3>
          <p>Users must provide accurate information, maintain account security, and use the platform only for its intended educational purposes.</p>
          
          <h3 className="text-foreground font-semibold">4. Intellectual Property</h3>
          <p>All content, algorithms, and assessment materials are the property of SWARSETU. Users may not copy, distribute, or reverse-engineer any part of the platform.</p>
          
          <h3 className="text-foreground font-semibold">5. Limitation of Liability</h3>
          <p>SWARSETU is not liable for decisions made based on screening results. Professional evaluation is recommended for any flagged indicators.</p>
          
          <h3 className="text-foreground font-semibold">6. Governing Law</h3>
          <p>These terms are governed by the laws of India. Disputes shall be resolved in the courts of New Delhi.</p>
        </CardContent>
      </Card>
    </PageShell>
  );
}

export function CookiesPage() {
  return (
    <PageShell title="Cookie Policy" subtitle="Last updated: February 6, 2026">
      <Card>
        <CardContent className="pt-6 prose prose-sm max-w-none text-muted-foreground space-y-4">
          <h3 className="text-foreground font-semibold">What Are Cookies?</h3>
          <p>Cookies are small text files stored on your device to enhance your browsing experience.</p>
          
          <h3 className="text-foreground font-semibold">Cookies We Use</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Essential Cookies:</strong> Required for authentication and security. Cannot be disabled.</li>
            <li><strong>Preference Cookies:</strong> Remember your language, theme, and display preferences.</li>
            <li><strong>Analytics Cookies:</strong> Help us understand usage patterns to improve the platform. Anonymized.</li>
          </ul>
          
          <h3 className="text-foreground font-semibold">Managing Cookies</h3>
          <p>You can manage cookies through your browser settings. Disabling essential cookies may affect platform functionality.</p>
        </CardContent>
      </Card>
    </PageShell>
  );
}

export function AccessibilityPage() {
  return (
    <PageShell title="Accessibility" subtitle="SWARSETU is committed to making education technology accessible to everyone.">
      <Card>
        <CardContent className="pt-6 prose prose-sm max-w-none text-muted-foreground space-y-4">
          <h3 className="text-foreground font-semibold">Our Commitment</h3>
          <p>We strive to meet WCAG 2.1 Level AA standards across our platform. Our voice-first approach ensures students who struggle with text-based interfaces can still participate fully.</p>
          
          <h3 className="text-foreground font-semibold">Accessibility Features</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Voice-first assessment: Students can respond verbally instead of typing</li>
            <li>High contrast mode and dark theme support</li>
            <li>Screen reader compatible navigation</li>
            <li>Keyboard-accessible interface</li>
            <li>Multilingual support in 11 Indian languages</li>
            <li>Large, clear visual elements designed for all ability levels</li>
          </ul>
          
          <h3 className="text-foreground font-semibold">Feedback</h3>
          <p>If you encounter accessibility barriers, please contact <a href="mailto:accessibility@swarsetu.in" className="text-primary hover:underline">accessibility@swarsetu.in</a>. We take all feedback seriously and work to address issues promptly.</p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
