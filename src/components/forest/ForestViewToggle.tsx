import { Button } from "@/components/ui/button";
import { TreeDeciduous, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface ForestViewToggleProps {
  view: "forest" | "classic";
  onViewChange: (view: "forest" | "classic") => void;
  className?: string;
}

export function ForestViewToggle({ view, onViewChange, className }: ForestViewToggleProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 bg-muted rounded-lg", className)}>
      <Button
        variant={view === "forest" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("forest")}
        className="gap-2"
      >
        <TreeDeciduous className="h-4 w-4" />
        <span className="hidden sm:inline">Forest View</span>
      </Button>
      <Button
        variant={view === "classic" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("classic")}
        className="gap-2"
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">Classic View</span>
      </Button>
    </div>
  );
}
