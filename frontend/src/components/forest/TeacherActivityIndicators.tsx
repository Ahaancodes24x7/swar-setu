import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sun, Droplets, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeacherActivityIndicatorsProps {
  sunlight: number; // Engagement - tests conducted this week
  water: number; // Assignments given
  parentInteraction: number; // Number of parent communications
  className?: string;
}

export function TeacherActivityIndicators({
  sunlight,
  water,
  parentInteraction,
  className
}: TeacherActivityIndicatorsProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>
      <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border-yellow-200 dark:border-yellow-800">
        <CardContent className="pt-4 pb-3 px-3">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="h-4 w-4 text-yellow-500" />
            <span className="text-xs font-medium">Sunlight</span>
          </div>
          <Progress value={sunlight} className="h-2 bg-yellow-100 dark:bg-yellow-900" />
          <p className="text-[10px] text-muted-foreground mt-1">
            {sunlight}% engagement
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4 pb-3 px-3">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium">Water</span>
          </div>
          <Progress value={water} className="h-2 bg-blue-100 dark:bg-blue-900" />
          <p className="text-[10px] text-muted-foreground mt-1">
            {water}% assignments
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30 border-gray-200 dark:border-gray-800">
        <CardContent className="pt-4 pb-3 px-3">
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium">Rain</span>
          </div>
          <Progress value={parentInteraction} className="h-2 bg-gray-100 dark:bg-gray-900" />
          <p className="text-[10px] text-muted-foreground mt-1">
            {parentInteraction}% parent contact
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
