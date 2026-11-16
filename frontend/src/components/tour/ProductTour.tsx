import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { Compass } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TOURS, TOUR_UI, type TourDefinition } from "./tours";

const storageKey = (tour: TourDefinition) => `swarsetu.tour.${tour.id}.v${tour.version}`;

function seen(tour: TourDefinition): boolean {
  try {
    return localStorage.getItem(storageKey(tour)) === "done";
  } catch {
    return false;
  }
}

function markSeen(tour: TourDefinition) {
  try {
    localStorage.setItem(storageKey(tour), "done");
  } catch {
    /* storage unavailable: the tour may show again, which is harmless */
  }
}

function isVisible(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
}

/** Route-aware product tour: auto-starts once per page, replayable from the floating button. */
export function ProductTour() {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const lang: "en" | "hi" = language.code === "hi" ? "hi" : "en";
  const tour = TOURS.find((t) => t.match(pathname));
  const driverRef = useRef<Driver | null>(null);
  const [ready, setReady] = useState(false);

  const buildSteps = useCallback((): DriveStep[] => {
    if (!tour) return [];
    return tour.steps
      .map((s) => ({ s, el: document.querySelector(`[data-tour="${s.target}"]`) }))
      .filter(({ el }) => isVisible(el))
      .map(({ s, el }) => ({
        element: el as HTMLElement,
        popover: { title: s.title[lang], description: s.body[lang], side: s.side ?? "bottom", align: "start" },
      }));
  }, [tour, lang]);

  const start = useCallback(() => {
    if (!tour) return;
    const steps = buildSteps();
    if (!steps.length) return;
    driverRef.current?.destroy();
    const ui = TOUR_UI[lang];
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    driverRef.current = driver({
      steps,
      showProgress: steps.length > 1,
      progressText: ui.progress,
      nextBtnText: ui.next,
      prevBtnText: ui.prev,
      doneBtnText: ui.done,
      animate: !reduceMotion,
      smoothScroll: !reduceMotion,
      allowClose: true,
      overlayOpacity: 0.55,
      stagePadding: 6,
      popoverClass: "swarsetu-tour",
      onDestroyed: () => markSeen(tour),
    });
    driverRef.current.drive();
  }, [tour, buildSteps, lang]);

  // Wait until the page has rendered at least one tour target, then auto-start once.
  useEffect(() => {
    setReady(false);
    if (!tour) return;
    let cancelled = false;
    const deadline = Date.now() + 6000;
    const poll = () => {
      if (cancelled) return;
      const anyTarget = tour.steps.some((s) => isVisible(document.querySelector(`[data-tour="${s.target}"]`)));
      if (anyTarget) {
        setReady(true);
        if (!seen(tour)) setTimeout(() => !cancelled && start(), 600);
      } else if (Date.now() < deadline) {
        setTimeout(poll, 250);
      }
    };
    poll();
    return () => {
      cancelled = true;
      driverRef.current?.destroy();
    };
    // start is intentionally excluded: re-running on language change would restart the tour
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour]);

  if (!tour || !ready) return null;
  return (
    <button
      type="button"
      onClick={start}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-md transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={TOUR_UI[lang].replay}
    >
      <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
      {TOUR_UI[lang].replay}
    </button>
  );
}
