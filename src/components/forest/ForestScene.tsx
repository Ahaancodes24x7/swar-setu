import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { StudentTree } from "./StudentTree";
import type { Tables } from "@/integrations/supabase/types";

type Student = Tables<"students">;

interface StudentWithStats extends Student {
  testCount: number;
  averageScore: number;
}

interface ForestSceneProps {
  students: StudentWithStats[];
  onStudentClick: (student: Student) => void;
  className?: string;
  // Weather effects based on teacher activity
  sunlight?: number; // 0-100 (engagement)
  water?: number; // 0-100 (assignments)
  rain?: boolean; // parent interaction
}

// Background elements
function Sun({ intensity = 50 }: { intensity?: number }) {
  const opacity = Math.max(0.3, intensity / 100);
  return (
    <div 
      className="absolute top-4 right-8 transition-all duration-1000"
      style={{ opacity }}
    >
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 animate-pulse-slow" 
        style={{ boxShadow: `0 0 ${20 + intensity / 2}px hsl(45, 100%, 60%)` }} 
      />
      {/* Sun rays */}
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '30s' }}>
        {[...Array(8)].map((_, i) => (
          <div 
            key={i} 
            className="absolute w-1 h-6 bg-yellow-300 left-1/2 -translate-x-1/2 -top-4 origin-bottom"
            style={{ transform: `rotate(${i * 45}deg)`, opacity: 0.6 }}
          />
        ))}
      </div>
    </div>
  );
}

function Cloud({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return (
    <div 
      className="absolute transition-all duration-[3000ms]"
      style={{ left: `${x}%`, top: `${y}%`, transform: `scale(${size})` }}
    >
      <div className="flex items-center">
        <div className="w-8 h-6 bg-white/80 rounded-full" />
        <div className="w-10 h-8 bg-white/90 rounded-full -ml-3" />
        <div className="w-8 h-6 bg-white/80 rounded-full -ml-3" />
      </div>
    </div>
  );
}

function RainDrop({ delay }: { delay: number }) {
  return (
    <div 
      className="absolute w-0.5 h-4 bg-gradient-to-b from-info/40 to-info/80 rounded-full animate-bounce"
      style={{ 
        left: `${Math.random() * 100}%`, 
        animationDelay: `${delay}ms`,
        animationDuration: '1s'
      }}
    />
  );
}

function WateringCan({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute bottom-20 left-8 text-4xl animate-bounce-slow">
      💧
    </div>
  );
}

export function ForestScene({ 
  students, 
  onStudentClick, 
  className,
  sunlight = 50,
  water = 0,
  rain = false
}: ForestSceneProps) {
  // Arrange trees in a natural forest pattern
  const arrangedStudents = useMemo(() => {
    return students.map((student, index) => {
      // Create a natural distribution pattern
      const row = Math.floor(index / 6);
      const col = index % 6;
      const xOffset = row % 2 === 0 ? 0 : 8; // Stagger rows
      const yJitter = Math.sin(index * 1.5) * 5;
      
      return {
        ...student,
        x: 8 + col * 14 + xOffset + Math.random() * 5,
        y: 20 + row * 25 + yJitter,
      };
    });
  }, [students]);

  return (
    <div className={cn(
      "relative w-full min-h-[400px] rounded-2xl overflow-hidden",
      "bg-gradient-to-b from-info/20 via-success/10 to-success/30",
      className
    )}>
      {/* Sky */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 to-sky-100 dark:from-sky-900 dark:to-sky-800" />
      
      {/* Sun */}
      <Sun intensity={sunlight} />
      
      {/* Clouds */}
      <Cloud x={15} y={8} size={0.8} />
      <Cloud x={45} y={5} size={1} />
      <Cloud x={75} y={10} size={0.7} />
      
      {/* Rain effect */}
      {rain && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <RainDrop key={i} delay={i * 100} />
          ))}
        </div>
      )}
      
      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-success/40 to-transparent" />
      
      {/* Grass texture */}
      <div className="absolute bottom-0 left-0 right-0 h-8 flex items-end justify-around overflow-hidden">
        {[...Array(40)].map((_, i) => (
          <div 
            key={i} 
            className="w-1 bg-success/60 rounded-t-full"
            style={{ 
              height: `${8 + Math.random() * 12}px`,
              transform: `rotate(${(Math.random() - 0.5) * 20}deg)`
            }}
          />
        ))}
      </div>
      
      {/* Water can animation */}
      <WateringCan visible={water > 50} />
      
      {/* Trees */}
      <div className="relative w-full h-full p-4">
        {arrangedStudents.map((student) => (
          <div
            key={student.id}
            className="absolute transition-all duration-500"
            style={{ 
              left: `${student.x}%`, 
              top: `${student.y}%`,
              zIndex: Math.floor(student.y)
            }}
          >
            <StudentTree
              student={student}
              testCount={student.testCount}
              averageScore={student.averageScore}
              onClick={() => onStudentClick(student)}
            />
          </div>
        ))}
        
        {/* Empty state */}
        {students.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">Your forest is empty</p>
              <p className="text-sm text-muted-foreground">Add students to grow your learning forest!</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Forest stats overlay */}
      <div className="absolute top-4 left-4 flex gap-2">
        <div className="px-3 py-1 bg-card/80 backdrop-blur rounded-full text-xs font-medium flex items-center gap-1">
          🌳 {students.length} Trees
        </div>
        <div className="px-3 py-1 bg-card/80 backdrop-blur rounded-full text-xs font-medium flex items-center gap-1">
          ☀️ {sunlight}%
        </div>
      </div>
    </div>
  );
}
