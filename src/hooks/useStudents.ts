import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Student = Tables<"students">;
type StudentInsert = TablesInsert<"students">;

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch students
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setStudents(data || []);
    } catch (err) {
      console.error("Error fetching students:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  // Add student
  const addStudent = async (student: { name: string; grade: string; parentEmail?: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to add students");
        return null;
      }

      const newStudent: StudentInsert = {
        name: student.name,
        grade: student.grade,
        parent_email: student.parentEmail || null,
        teacher_id: user.id,
        status: "normal",
      };

      const { data, error: insertError } = await supabase
        .from("students")
        .insert(newStudent)
        .select()
        .single();

      if (insertError) throw insertError;
      
      toast.success(`${student.name} added successfully!`);
      return data;
    } catch (err) {
      console.error("Error adding student:", err);
      toast.error(err instanceof Error ? err.message : "Failed to add student");
      return null;
    }
  };

  // Delete student
  const deleteStudent = async (studentId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("students")
        .delete()
        .eq("id", studentId);

      if (deleteError) throw deleteError;
      
      toast.success("Student removed successfully");
      return true;
    } catch (err) {
      console.error("Error deleting student:", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete student");
      return false;
    }
  };

  // Real-time subscription
  useEffect(() => {
    fetchStudents();

    const channel = supabase
      .channel("students-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "students",
        },
        (payload) => {
          console.log("Student change:", payload);
          
          if (payload.eventType === "INSERT") {
            setStudents((prev) => [payload.new as Student, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setStudents((prev) =>
              prev.map((s) => (s.id === (payload.new as Student).id ? (payload.new as Student) : s))
            );
          } else if (payload.eventType === "DELETE") {
            setStudents((prev) => prev.filter((s) => s.id !== (payload.old as Student).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    students,
    loading,
    error,
    addStudent,
    deleteStudent,
    refetch: fetchStudents,
  };
}
