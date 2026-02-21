import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "parent" | "teacher" | "principal" | null;

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch role from the secure user_roles table
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        // Fallback to metadata if role table fails (for backwards compatibility)
        const metaRole = user.user_metadata?.role as AppRole;
        setRole(metaRole || null);
      } else if (data) {
        setRole(data.role as AppRole);
      } else {
        // No role in table, check metadata and potentially sync
        const metaRole = user.user_metadata?.role as AppRole;
        if (metaRole) {
          // Sync the role to the table for future use
          await supabase
            .from("user_roles")
            .upsert({ user_id: user.id, role: metaRole }, { onConflict: "user_id,role" })
            .single();
          setRole(metaRole);
        } else {
          setRole(null);
        }
      }
    } catch (err) {
      console.error("Error in fetchRole:", err);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchRole();
    }
  }, [authLoading, fetchRole]);

  // Re-fetch role on auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (!authLoading) {
        fetchRole();
      }
    });

    return () => subscription.unsubscribe();
  }, [authLoading, fetchRole]);

  const getDashboardPath = useCallback(() => {
    switch (role) {
      case "principal":
        return "/dashboard/principal";
      case "teacher":
        return "/dashboard/teacher";
      case "parent":
        return "/dashboard/parent";
      default:
        return "/login";
    }
  }, [role]);

  return { role, loading: loading || authLoading, getDashboardPath, refetchRole: fetchRole };
}
