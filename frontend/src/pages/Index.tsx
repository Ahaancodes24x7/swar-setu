import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { HeroPath } from "@/components/home/HeroPath";

export default function Index() {
  return (
    <Layout hideFooter={true}>
      <section className="relative overflow-hidden bg-hero text-hero-foreground">
        {/* soft light from the upper right, like the artwork */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,hsl(222_85%_45%/0.55),transparent_60%)]" />

        <div className="container relative mx-auto grid min-h-[100svh] items-center gap-6 px-4 pb-24 pt-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-0">
          <div className="relative z-10 max-w-xl">
            <h1 className="animate-fade-in text-6xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl xl:text-8xl">
              Room for <br />every mind<span className="text-accent">.</span>
            </h1>
            <p className="animate-fade-in mt-6 text-lg sm:text-xl text-hero-foreground/90" style={{ animationDelay: "0.1s" }}>
              A clearer start for children who learn differently.
            </p>
            <div className="animate-fade-in mt-10" style={{ animationDelay: "0.2s" }}>
              <Button
                asChild
                size="xl"
                className="group rounded-md bg-cream px-8 text-hero shadow-lg hover:bg-white hover:shadow-glow"
                data-tour="hero-cta"
              >
                <Link to="/login">
                  Discover Swar-Setu
                  <ArrowUpRight className="!size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <p className="mt-3 text-sm text-hero-foreground/80">
                Early learning support ·{" "}
                <Link to="/learn-more" className="underline decoration-accent decoration-2 underline-offset-4 hover:text-accent">
                  how it works
                </Link>
              </p>
            </div>
          </div>

          <div className="relative -mx-4 sm:mx-0 lg:-mr-16">
            <HeroPath />
          </div>
        </div>

        <div className="container absolute inset-x-0 bottom-0 mx-auto px-4">
          <div className="flex items-center justify-between gap-4 border-t border-hero-foreground/30 py-5 text-sm">
            <span>Different ways of learning. A shared way forward.</span>
            <Link to="/learn-more" className="group hidden shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] hover:text-accent sm:flex">
              Explore how it works <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-1" />
            </Link>
          </div>
        </div>
      </section>

    </Layout>
  );
}
