import { cn } from "@/lib/utils";
import mark from "@/assets/logo-mark.webp";

interface BrandLogoProps {
  /** "light" = on cream/white surfaces, "dark" = on cobalt/dark surfaces (mark sits in a cream badge). */
  tone?: "light" | "dark" | "auto";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

const SIZES = {
  sm: { mark: "h-8 w-8", badge: "h-9 w-9", text: "text-base", tag: "text-[8px]" },
  md: { mark: "h-10 w-10", badge: "h-11 w-11", text: "text-lg", tag: "text-[9px]" },
  lg: { mark: "h-14 w-14", badge: "h-16 w-16", text: "text-2xl", tag: "text-[10px]" },
};

/** Compact lockup: transparent brain mark + typeset wordmark, crisp at any size and in both themes. */
export function BrandLogo({ tone = "auto", size = "md", showTagline = false, className }: BrandLogoProps) {
  const s = SIZES[size];
  const onDark = tone === "dark";
  const badge = cn(
    "brand-mark grid shrink-0 place-items-center rounded-2xl",
    s.badge,
    onDark ? "bg-cream shadow-[0_6px_18px_-6px_rgb(0_0_0/0.45)] ring-1 ring-white/30" : tone === "auto" ? "dark:bg-cream dark:ring-1 dark:ring-white/20" : ""
  );
  return (
    <span className={cn("group/logo inline-flex items-center gap-2.5", className)}>
      <span className={badge}>
        <img src={mark} alt="" width={64} height={64} className={cn(s.mark, "select-none object-contain")} draggable={false} />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "whitespace-nowrap font-extrabold tracking-[0.06em]",
            s.text,
            onDark ? "text-hero-foreground" : "text-[hsl(226_60%_16%)] dark:text-foreground"
          )}
        >
          SWAR<span className="text-accent">-</span>SETU
        </span>
        {showTagline && (
          <span className={cn("mt-1 font-semibold tracking-[0.18em] opacity-70", s.tag, onDark ? "text-hero-foreground" : "text-foreground")}>
            DETECT · SUPPORT · INCLUDE
          </span>
        )}
      </span>
      <span className="sr-only">Swar-Setu home</span>
    </span>
  );
}
