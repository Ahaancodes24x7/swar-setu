import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BadgeDefinition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  points_awarded: number;
}

interface UserBadge {
  id: string;
  badge_id: string;
  student_id: string | null;
  earned_at: string;
  badge?: BadgeDefinition;
}

interface BadgeProgress {
  badge: BadgeDefinition;
  earned: boolean;
  earnedAt?: string;
  currentProgress?: number;
}

export function useBadges(studentId?: string) {
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBadges = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch all badge definitions
      const { data: definitions, error: defError } = await supabase
        .from("badge_definitions")
        .select("*")
        .order("criteria_value", { ascending: true });

      if (defError) throw defError;

      // Fetch earned badges for this student
      let query = supabase.from("user_badges").select("*");
      
      if (studentId) {
        query = query.eq("student_id", studentId);
      } else {
        query = query.eq("user_id", user.id);
      }

      const { data: earnedBadges, error: earnedError } = await query;

      if (earnedError) throw earnedError;

      // Combine definitions with earned status
      const badgeProgress: BadgeProgress[] = (definitions || []).map((def) => {
        const earned = (earnedBadges || []).find((eb) => eb.badge_id === def.id);
        return {
          badge: def,
          earned: !!earned,
          earnedAt: earned?.earned_at,
        };
      });

      setBadges(badgeProgress);
    } catch (error) {
      console.error("Error fetching badges:", error);
    } finally {
      setLoading(false);
    }
  }, [user, studentId]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  // Subscribe to realtime badge updates
  useEffect(() => {
    if (!studentId && !user) return;

    const channel = supabase
      .channel("user_badges_updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_badges",
          filter: studentId ? `student_id=eq.${studentId}` : `user_id=eq.${user?.id}`,
        },
        () => {
          fetchBadges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, user, fetchBadges]);

  const awardBadge = useCallback(
    async (badgeCode: string) => {
      if (!user) return { success: false };

      try {
        // Find badge definition
        const { data: badgeDef, error: defError } = await supabase
          .from("badge_definitions")
          .select("*")
          .eq("code", badgeCode)
          .single();

        if (defError || !badgeDef) return { success: false };

        // Check if already earned
        const existingBadge = badges.find(
          (b) => b.badge.code === badgeCode && b.earned
        );
        if (existingBadge) return { success: true, alreadyEarned: true };

        // Award the badge
        const { error: insertError } = await supabase.from("user_badges").insert({
          user_id: user.id,
          student_id: studentId || null,
          badge_id: badgeDef.id,
        });

        if (insertError) throw insertError;

        // Update points if student
        if (studentId) {
          const { data: student } = await supabase
            .from("students")
            .select("total_points")
            .eq("id", studentId)
            .single();

          if (student) {
            await supabase
              .from("students")
              .update({
                total_points: (student.total_points || 0) + badgeDef.points_awarded,
              })
              .eq("id", studentId);
          }
        }

        return { success: true, badge: badgeDef };
      } catch (error) {
        console.error("Error awarding badge:", error);
        return { success: false };
      }
    },
    [user, studentId, badges]
  );

  // Check and award badges based on criteria
  const checkAndAwardBadges = useCallback(
    async (
      criteria: {
        testsCompleted?: number;
        streakDays?: number;
        latestScore?: number;
        previousScore?: number;
        resourcesCompleted?: number;
        resourceType?: "reading" | "number" | "phonics";
        engagementCount?: number;
      }
    ) => {
      const awarded: BadgeDefinition[] = [];

      // First test completed
      if (criteria.testsCompleted === 1) {
        const result = await awardBadge("first_test");
        if (result.success && !result.alreadyEarned && result.badge) {
          awarded.push(result.badge);
        }
      }

      // Streak badges
      if (criteria.streakDays && criteria.streakDays >= 5) {
        const result = await awardBadge("five_day_streak");
        if (result.success && !result.alreadyEarned && result.badge) {
          awarded.push(result.badge);
        }
      }

      if (criteria.streakDays && criteria.streakDays >= 10) {
        const result = await awardBadge("ten_day_streak");
        if (result.success && !result.alreadyEarned && result.badge) {
          awarded.push(result.badge);
        }
      }

      // Perfect score
      if (criteria.latestScore === 100) {
        const result = await awardBadge("perfect_score");
        if (result.success && !result.alreadyEarned && result.badge) {
          awarded.push(result.badge);
        }
      }

      // Score improvement
      if (
        criteria.latestScore &&
        criteria.previousScore &&
        criteria.latestScore - criteria.previousScore >= 10
      ) {
        const result = await awardBadge("improvement_star");
        if (result.success && !result.alreadyEarned && result.badge) {
          awarded.push(result.badge);
        }
      }

      // Resource badges
      if (criteria.resourcesCompleted === 1) {
        const result = await awardBadge("first_resource");
        if (result.success && !result.alreadyEarned && result.badge) {
          awarded.push(result.badge);
        }
      }

      if (criteria.resourcesCompleted && criteria.resourcesCompleted >= 5) {
        if (criteria.resourceType === "reading") {
          const result = await awardBadge("speed_reader");
          if (result.success && !result.alreadyEarned && result.badge) {
            awarded.push(result.badge);
          }
        }
        if (criteria.resourceType === "number") {
          const result = await awardBadge("math_whiz");
          if (result.success && !result.alreadyEarned && result.badge) {
            awarded.push(result.badge);
          }
        }
        if (criteria.resourceType === "phonics") {
          const result = await awardBadge("phonics_pro");
          if (result.success && !result.alreadyEarned && result.badge) {
            awarded.push(result.badge);
          }
        }
      }

      // Parent engagement
      if (criteria.engagementCount && criteria.engagementCount >= 3) {
        const result = await awardBadge("parent_engaged");
        if (result.success && !result.alreadyEarned && result.badge) {
          awarded.push(result.badge);
        }
      }

      return awarded;
    },
    [awardBadge]
  );

  return { badges, loading, awardBadge, checkAndAwardBadges, refetch: fetchBadges };
}
