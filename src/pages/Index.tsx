import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { ImaginativeHeroBackground } from "@/components/home/ImaginativeHeroBackground";

export default function Index() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, []);
  return (
    <Layout hideFooter={true}>
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-center justify-center">
        <ImaginativeHeroBackground />
        <div className="container mx-auto px-4 relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-8 animate-fade-in">
              <Sparkles className="h-3.5 w-3.5" />
              DETECT • SUPPORT • INCLUDE
            </div>
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-foreground mb-6 animate-fade-in leading-[1.1]" style={{ animationDelay: "0.1s" }}>
              Welcome to{" "}
              <span className="block mt-4 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-pulse">
                SWARSETU
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto animate-fade-in leading-relaxed font-medium" style={{ animationDelay: "0.2s" }}>
              AI-Powered learning difference assessment platform for every child's success
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <Button asChild size="lg" className="rounded-lg font-semibold px-8 py-6 text-base">
                <Link to="/login" className="gap-2">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-lg font-semibold px-8 py-6 text-base">
                <Link to="/learn-more">Learn How It Works</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

    </Layout>
  );
}
