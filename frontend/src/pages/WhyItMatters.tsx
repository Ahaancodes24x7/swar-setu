import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Users,
  TrendingDown,
  MapPin,
  Globe,
  Heart,
  ArrowRight,
  GraduationCap,
  Ban,
  School,
} from "lucide-react";

const statistics = [
  {
    icon: Users,
    value: "35+ Million",
    label: "Children in India affected by SLDs",
    description: "Specific learning disabilities affect 10-15% of Indian school children, yet most remain unidentified.",
  },
  {
    icon: AlertTriangle,
    value: "90%",
    label: "Go undiagnosed in rural areas",
    description: "Limited access to specialized professionals means millions never receive proper screening.",
  },
  {
    icon: TrendingDown,
    value: "3x Higher",
    label: "Dropout rates for undiagnosed SLDs",
    description: "Students with undetected learning disabilities are far more likely to leave school early.",
  },
  {
    icon: Ban,
    value: "75%",
    label: "Labeled as 'lazy' or 'slow'",
    description: "Without proper diagnosis, these children face stigma and lose confidence in their abilities.",
  },
];

const challenges = [
  {
    title: "Shortage of Specialists",
    description: "India has fewer than 1 trained learning disability specialist per 500,000 people. Most are concentrated in urban centers.",
    icon: Users,
  },
  {
    title: "Language Barriers",
    description: "Most screening tools are designed for English. They don't account for India's 22 official languages and hundreds of dialects.",
    icon: Globe,
  },
  {
    title: "Stigma & Awareness",
    description: "Learning disabilities are often confused with intellectual disabilities or dismissed as laziness, preventing early intervention.",
    icon: AlertTriangle,
  },
  {
    title: "Resource Constraints",
    description: "Schools in rural and semi-urban areas lack the infrastructure and training for proper SLD identification.",
    icon: School,
  },
  {
    title: "Late Detection",
    description: "Most cases are identified after age 10—missing the critical window for intervention when the brain is most adaptable.",
    icon: TrendingDown,
  },
  {
    title: "Urban-Rural Divide",
    description: "Urban private schools may have some resources, but government and rural schools have almost none.",
    icon: MapPin,
  },
];

const impacts = [
  {
    title: "Academic Struggles",
    description: "Undiagnosed students fall behind peers, struggle with reading and math, and often fail standardized tests.",
  },
  {
    title: "Emotional Toll",
    description: "Years of struggling without understanding why leads to anxiety, depression, and low self-esteem.",
  },
  {
    title: "Economic Impact",
    description: "Unaddressed SLDs cost India billions in lost productivity and unrealized human potential.",
  },
  {
    title: "Generational Cycle",
    description: "Parents with undiagnosed SLDs may not recognize signs in their children, perpetuating the cycle.",
  },
];

export default function WhyItMatters() {
  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 lg:py-24 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Why Early Detection Matters</h1>
            <p className="text-lg text-muted-foreground">
              Millions of Indian children struggle in silence. Understanding the scale of the problem 
              is the first step toward solving it.
            </p>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statistics.map((stat, idx) => (
              <Card key={idx} className="text-center border-border/50">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                    <stat.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
                  <div className="text-sm font-medium text-foreground mb-2">{stat.label}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Challenges */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Challenges in Indian Education</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Multiple systemic barriers prevent early identification of learning disabilities in India.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {challenges.map((challenge, idx) => (
              <Card key={idx} className="border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
                    <challenge.icon className="h-5 w-5 text-destructive" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{challenge.title}</h3>
                  <p className="text-sm text-muted-foreground">{challenge.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Impact */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">The Cost of Inaction</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              When learning disabilities go undetected, the consequences ripple through lives and communities.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {impacts.map((impact, idx) => (
              <div key={idx} className="flex gap-4 p-6 rounded-lg bg-card border border-border/50">
                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent font-bold">{idx + 1}</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{impact.title}</h3>
                  <p className="text-sm text-muted-foreground">{impact.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Voice-First */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Why Voice-First AI is Critical for India</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Linguistic Diversity
                </h3>
                <p className="text-muted-foreground mb-6">
                  India has 22 official languages and hundreds of dialects. A voice-first approach 
                  allows us to build language-specific models that understand the phonemic patterns 
                  unique to each language—something text-based tools cannot achieve.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Accessibility
                </h3>
                <p className="text-muted-foreground mb-6">
                  Many children with learning disabilities struggle with written tests. Voice-based 
                  assessment removes this barrier, allowing us to evaluate their true capabilities 
                  without the confounding factor of writing difficulties.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Scalability
                </h3>
                <p className="text-muted-foreground mb-6">
                  With smartphones reaching even remote villages, voice-based AI can be deployed 
                  at scale without requiring specialized hardware or trained professionals at 
                  every location.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Child-Friendly
                </h3>
                <p className="text-muted-foreground mb-6">
                  Speaking is natural for children. Voice-based tests feel less intimidating than 
                  written exams, leading to more accurate assessments and less test anxiety.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <GraduationCap className="h-16 w-16 text-primary-foreground mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Every Child Deserves a Chance
            </h2>
            <p className="text-primary-foreground/80 mb-8">
              Join us in building a future where no child is left behind due to an undetected 
              learning disability. Together, we can transform Indian education.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="xl" className="bg-background text-foreground hover:bg-background/90">
                <Link to="/login/teacher">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/learn-more">See How It Works</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
