import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import loginPath from "@/assets/login-path.webp";
import { BrandLogo } from "@/components/brand/BrandLogo";

/** Split sign-in layout: cobalt artwork panel on the left, cream workspace on the right. */
export function AuthShell({ back, children }: { back: { to: string; label: string }; children: ReactNode }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="min-h-[100svh] lg:grid lg:grid-cols-[42fr_58fr]">
      <aside className="relative flex flex-col overflow-hidden bg-hero text-hero-foreground lg:sticky lg:top-0 lg:h-[100svh]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,hsl(222_85%_40%/0.5),transparent_60%)]" />
        <div className="relative z-10 flex items-center justify-between px-6 pt-6 sm:px-10 sm:pt-8">
          <Link to="/" className="transition-transform hover:scale-105 hover:-rotate-1">
            <BrandLogo tone="dark" />
          </Link>
        </div>
        <h1 className="relative z-10 animate-fade-in px-6 pt-8 pb-6 text-3xl font-bold leading-tight tracking-tight sm:px-10 sm:text-4xl lg:pt-16 xl:text-5xl">
          A shared path.
          <br />
          A different role<span className="text-accent">.</span>
        </h1>

        {/* artwork: hidden on small phones to get people to the form faster */}
        <div className="relative mt-auto hidden sm:block">
          <div className="auth-art relative">
            <img
              src={loginPath}
              alt="A paper path leading through a glowing arch, with an amber marble resting beside it"
              width={655}
              height={565}
              className="block w-full h-auto select-none [mask-image:linear-gradient(to_bottom,transparent,black_18%)]"
              draggable={false}
            />
            {/* the light inside the arch breathes */}
            <span aria-hidden className="auth-arch-glow pointer-events-none absolute rounded-full" style={{ left: "46%", top: "22%", width: "22%", height: "40%" }} />
            {/* glint that rolls across the marble */}
            <span aria-hidden className="auth-marble-glint pointer-events-none absolute rounded-full" style={{ left: "11.3%", top: "49.9%", width: "14.7%", aspectRatio: "1" }} />
          </div>
          <p className="absolute bottom-6 left-6 text-sm text-hero-foreground/90 sm:left-10">Room for every mind.</p>
        </div>
      </aside>

      <main className="flex min-h-[100svh] flex-col bg-cream/60 dark:bg-background">
        <div className="flex items-center justify-between px-6 pt-6 sm:px-12 sm:pt-8">
          <Link to={back.to} className="group inline-flex items-center gap-2 text-sm font-medium hover:text-primary">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            {back.label}
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium hover:bg-muted">
              {language.native}
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-y-auto">
              {languages.map((lang) => (
                <DropdownMenuItem key={lang.code} onClick={() => setLanguage(lang)} className={language.code === lang.code ? "bg-muted" : ""}>
                  <span className="font-medium">{lang.native}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{lang.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-1 items-center px-6 py-10 sm:px-12 lg:px-20">
          <div className="w-full max-w-2xl">{children}</div>
        </div>

        <footer className="flex justify-end gap-8 px-6 pb-6 text-sm sm:px-12">
          <Link to="/privacy" className="hover:text-primary hover:underline underline-offset-4">Privacy</Link>
          <Link to="/terms" className="hover:text-primary hover:underline underline-offset-4">Terms</Link>
        </footer>
      </main>
    </div>
  );
}
