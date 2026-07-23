import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Student = Tables<"students">;

interface StudentTreeProps {
  student: Student;
  testCount?: number;
  averageScore?: number;
  onClick?: () => void;
  className?: string;
}

// Tree stages based on progress
type TreeStage = "sapling" | "growing" | "tree" | "flowering" | "fruiting";

function getTreeStage(testCount: number, averageScore: number): TreeStage {
  if (testCount === 0) return "sapling";
  if (testCount < 3) return "growing";
  if (averageScore < 50) return "tree";
  if (averageScore < 80) return "flowering";
  return "fruiting";
}

function getLeafColor(status: string): string {
  switch (status) {
    case "flagged":
    case "at-risk":
      return "text-destructive"; // Red leaves
    case "normal":
    default:
      return "text-success"; // Green leaves
  }
}

// SVG Tree Components
function Sapling({ leafColor, className }: { leafColor: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 120" className={cn("w-full h-full", className)}>
      {/* Pot */}
      <ellipse cx="50" cy="115" rx="20" ry="5" fill="hsl(25, 60%, 35%)" />
      <path d="M30 115 L35 95 L65 95 L70 115 Z" fill="hsl(25, 55%, 45%)" />
      
      {/* Stem */}
      <path d="M50 95 L50 70" stroke="hsl(25, 40%, 30%)" strokeWidth="3" fill="none" />
      
      {/* Small leaves */}
      <ellipse cx="45" cy="72" rx="8" ry="5" className={cn("fill-current", leafColor)} transform="rotate(-30 45 72)" />
      <ellipse cx="55" cy="68" rx="8" ry="5" className={cn("fill-current", leafColor)} transform="rotate(30 55 68)" />
      <ellipse cx="50" cy="60" rx="6" ry="4" className={cn("fill-current", leafColor)} />
      
      {/* Sparkle for new student */}
      <circle cx="65" cy="55" r="2" fill="hsl(45, 100%, 60%)" className="animate-pulse" />
    </svg>
  );
}

function GrowingTree({ leafColor, className }: { leafColor: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 120" className={cn("w-full h-full", className)}>
      {/* Ground */}
      <ellipse cx="50" cy="118" rx="25" ry="4" fill="hsl(30, 50%, 40%)" />
      
      {/* Trunk */}
      <path d="M47 118 L48 80 L52 80 L53 118 Z" fill="hsl(25, 40%, 30%)" />
      
      {/* Branches */}
      <path d="M50 90 L35 75" stroke="hsl(25, 40%, 30%)" strokeWidth="2" fill="none" />
      <path d="M50 85 L65 70" stroke="hsl(25, 40%, 30%)" strokeWidth="2" fill="none" />
      
      {/* Foliage */}
      <ellipse cx="35" cy="70" rx="12" ry="10" className={cn("fill-current", leafColor)} />
      <ellipse cx="65" cy="65" rx="12" ry="10" className={cn("fill-current", leafColor)} />
      <ellipse cx="50" cy="55" rx="15" ry="12" className={cn("fill-current", leafColor)} />
      <ellipse cx="40" cy="48" rx="10" ry="8" className={cn("fill-current", leafColor)} />
      <ellipse cx="60" cy="50" rx="10" ry="8" className={cn("fill-current", leafColor)} />
    </svg>
  );
}

function FullTree({ leafColor, className }: { leafColor: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 120" className={cn("w-full h-full", className)}>
      {/* Ground */}
      <ellipse cx="50" cy="118" rx="30" ry="5" fill="hsl(30, 50%, 40%)" />
      
      {/* Trunk */}
      <path d="M44 118 L46 70 L54 70 L56 118 Z" fill="hsl(25, 40%, 30%)" />
      
      {/* Main foliage */}
      <ellipse cx="30" cy="60" rx="15" ry="12" className={cn("fill-current", leafColor)} />
      <ellipse cx="70" cy="58" rx="15" ry="12" className={cn("fill-current", leafColor)} />
      <ellipse cx="50" cy="45" rx="20" ry="15" className={cn("fill-current", leafColor)} />
      <ellipse cx="35" cy="38" rx="12" ry="10" className={cn("fill-current", leafColor)} />
      <ellipse cx="65" cy="40" rx="12" ry="10" className={cn("fill-current", leafColor)} />
      <ellipse cx="50" cy="28" rx="15" ry="12" className={cn("fill-current", leafColor)} />
    </svg>
  );
}

function FloweringTree({ leafColor, className }: { leafColor: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 120" className={cn("w-full h-full", className)}>
      {/* Ground */}
      <ellipse cx="50" cy="118" rx="30" ry="5" fill="hsl(30, 50%, 40%)" />
      
      {/* Trunk */}
      <path d="M44 118 L46 70 L54 70 L56 118 Z" fill="hsl(25, 40%, 30%)" />
      
      {/* Main foliage */}
      <ellipse cx="30" cy="60" rx="15" ry="12" className={cn("fill-current", leafColor)} />
      <ellipse cx="70" cy="58" rx="15" ry="12" className={cn("fill-current", leafColor)} />
      <ellipse cx="50" cy="45" rx="20" ry="15" className={cn("fill-current", leafColor)} />
      <ellipse cx="35" cy="38" rx="12" ry="10" className={cn("fill-current", leafColor)} />
      <ellipse cx="65" cy="40" rx="12" ry="10" className={cn("fill-current", leafColor)} />
      <ellipse cx="50" cy="28" rx="15" ry="12" className={cn("fill-current", leafColor)} />
      
      {/* Flowers */}
      <g className="animate-pulse-slow">
        <circle cx="25" cy="55" r="4" fill="hsl(330, 80%, 70%)" />
        <circle cx="40" cy="35" r="4" fill="hsl(45, 90%, 65%)" />
        <circle cx="75" cy="52" r="4" fill="hsl(330, 80%, 70%)" />
        <circle cx="55" cy="25" r="4" fill="hsl(280, 70%, 75%)" />
        <circle cx="60" cy="45" r="3" fill="hsl(45, 90%, 65%)" />
      </g>
    </svg>
  );
}

function FruitingTree({ leafColor, className }: { leafColor: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 120" className={cn("w-full h-full", className)}>
      {/* Ground */}
      <ellipse cx="50" cy="118" rx="30" ry="5" fill="hsl(30, 50%, 40%)" />
      
      {/* Trunk */}
      <path d="M44 118 L46 70 L54 70 L56 118 Z" fill="hsl(25, 40%, 30%)" />
      
      {/* Main foliage */}
      <ellipse cx="30" cy="60" rx="15" ry="12" className={cn("fill-current", leafColor)} />
      <ellipse cx="70" cy="58" rx="15" ry="12" className={cn("fill-current", leafColor)} />
      <ellipse cx="50" cy="45" rx="20" ry="15" className={cn("fill-current", leafColor)} />
      <ellipse cx="35" cy="38" rx="12" ry="10" className={cn("fill-current", leafColor)} />
      <ellipse cx="65" cy="40" rx="12" ry="10" className={cn("fill-current", leafColor)} />
      <ellipse cx="50" cy="28" rx="15" ry="12" className={cn("fill-current", leafColor)} />
      
      {/* Fruits (apples) */}
      <g>
        <circle cx="28" cy="65" r="5" fill="hsl(0, 75%, 50%)" />
        <circle cx="72" cy="62" r="5" fill="hsl(0, 75%, 50%)" />
        <circle cx="45" cy="50" r="5" fill="hsl(35, 90%, 55%)" />
        <circle cx="60" cy="35" r="5" fill="hsl(0, 75%, 50%)" />
        <circle cx="38" cy="32" r="4" fill="hsl(35, 90%, 55%)" />
      </g>
      
      {/* Stars for high performers */}
      <g className="animate-pulse">
        <path d="M50 8 L52 14 L58 14 L53 18 L55 24 L50 20 L45 24 L47 18 L42 14 L48 14 Z" fill="hsl(45, 100%, 55%)" />
      </g>
    </svg>
  );
}

export function StudentTree({ student, testCount = 0, averageScore = 0, onClick, className }: StudentTreeProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const stage = getTreeStage(testCount, averageScore);
  const leafColor = getLeafColor(student.status);
  
  const TreeComponent = {
    sapling: Sapling,
    growing: GrowingTree,
    tree: FullTree,
    flowering: FloweringTree,
    fruiting: FruitingTree,
  }[stage];

  return (
    <div 
      className={cn(
        "relative flex flex-col items-center cursor-pointer transition-transform duration-300",
        isHovered && "scale-110",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="w-20 h-30 md:w-24 md:h-36">
        <TreeComponent leafColor={leafColor} />
      </div>
      
      {/* Student name label */}
      <div className={cn(
        "mt-1 px-2 py-0.5 rounded-full text-xs font-medium text-center truncate max-w-[80px] md:max-w-[96px] transition-all",
        isHovered ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"
      )}>
        {student.name.split(' ')[0]}
      </div>
      
      {/* Tooltip on hover */}
      {isHovered && (
        <div className="absolute bottom-full mb-2 px-3 py-2 bg-card border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
          <p className="font-medium text-sm">{student.name}</p>
          <p className="text-xs text-muted-foreground">Grade {student.grade}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs">Tests: {testCount}</span>
            {averageScore > 0 && (
              <span className="text-xs">Avg: {averageScore}%</span>
            )}
          </div>
          {student.status === "flagged" && (
            <span className="text-xs text-destructive font-medium">⚠️ Needs attention</span>
          )}
        </div>
      )}
    </div>
  );
}
