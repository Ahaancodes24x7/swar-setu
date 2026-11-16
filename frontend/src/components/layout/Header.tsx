import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Menu, X, ChevronDown, ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useTranslations } from "@/hooks/useTranslations";

export function Header() {
  const t = useTranslations();
  const navLinks = [
    { path: "/", label: t.home },
    { path: "/learn-more", label: t.learnMore },
    { path: "/why-it-matters", label: t.whyItMatters },
  ];

  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const location = useLocation();
  // on the home page the header floats over the cobalt hero, like the artwork's nav
  const onHero = location.pathname === "/";

  return (
    <header
      className={
        onHero
          ? "absolute top-0 z-50 w-full text-hero-foreground"
          : "sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      }
    >
      <div className={`container mx-auto flex items-center justify-between px-4 ${onHero ? "h-20" : "h-16"}`}>
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-105 hover:-rotate-1" data-tour="brand">
          <BrandLogo tone={onHero ? "dark" : "auto"} />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 md:flex" data-tour="nav">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`relative text-sm font-medium transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform hover:after:scale-x-100 ${
                onHero
                  ? location.pathname === link.path ? "text-hero-foreground after:scale-x-100" : "text-hero-foreground/80 hover:text-hero-foreground"
                  : location.pathname === link.path ? "text-primary after:scale-x-100" : "text-muted-foreground hover:text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="hidden items-center gap-3 md:flex">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={`gap-2 ${onHero ? "hover:bg-white/10 hover:text-hero-foreground" : ""}`} data-tour="language">
                <Globe className="h-4 w-4" />
                <span>{language.native}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-y-auto">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setLanguage(lang)}
                  className={language.code === lang.code ? "bg-muted" : ""}
                >
                  <span className="font-medium">{lang.native}</span>
                  <span className="ml-auto text-muted-foreground text-xs">
                    {lang.name}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <span data-tour="theme" className={onHero ? "[&_button:hover]:bg-white/10 [&_button:hover]:text-hero-foreground" : ""}><ThemeToggle /></span>

          {onHero ? (
            <Button asChild variant="outline" className="group border border-hero-foreground/80 text-hero-foreground hover:bg-hero-foreground hover:text-hero">
              <Link to="/login">
                {t.getStarted}
                <ArrowUpRight className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="hero" size="default">
              <Link to="/login">{t.getStarted}</Link>
            </Button>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden border-t border-border bg-background text-foreground animate-fade-in rounded-b-2xl shadow-lg">
          <nav className="container mx-auto flex flex-col gap-2 px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`py-2 text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <Globe className="h-4 w-4" />
                    <span>{language.native}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 max-h-60 overflow-y-auto">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang)}
                    >
                      <span className="font-medium">{lang.native}</span>
                      <span className="ml-auto text-muted-foreground text-xs">
                        {lang.name}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button asChild variant="hero" className="w-full">
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  Get Started
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
