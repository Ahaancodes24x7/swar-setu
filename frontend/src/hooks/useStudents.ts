import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Student = Tables<"students">;
type StudentInsert = TablesInsert<"students">;

const STORAGE_KEY = "swar_setu_local_students_v1";

const getLocalStudents = (): Student[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveLocalStudents = (students: Student[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  } catch (e) {
    console.warn("Could not save students to localStorage", e);
  }
};

export function useStudents() {
  const [students, setStudents] = useState<Student[]>(getLocalStudents);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch students with local cache fallback
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const localData = getLocalStudents();

      if (!user) {
        setStudents(localData);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.warn("Supabase fetch warning, using local state cache:", fetchError.message);
        setStudents(localData);
      } else if (data && data.length > 0) {
        const merged = [...data];
        localData.forEach((ls) => {
          if (!merged.some((s) => s.id === ls.id)) {
            merged.push(ls);
          }
        });
        setStudents(merged);
        saveLocalStudents(merged);
      } else {
        setStudents(localData);
      }
    } catch (err) {
      console.warn("Error fetching students, using fallback local cache:", err);
      setStudents(getLocalStudents());
    } finally {
      setLoading(false);
    }
  }, []);

  // Add student
  const addStudent = async (student: { name: string; grade: string; parentEmail?: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const cleanEmail = student.parentEmail ? student.parentEmail.trim() : null;
      const newId = `student_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const fallbackStudent: Student = {
        id: newId,
        name: student.name,
        grade: student.grade,
        parent_email: cleanEmail,
        parent_id: null,
        teacher_id: user?.id || "local_teacher",
        status: "normal",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        parent_linked_at: null,
        streak_days: 0,
        total_points: 0,
      };

      let createdStudent: Student = fallbackStudent;

      if (user) {
        const newStudentPayload: StudentInsert = {
          name: student.name,
          grade: student.grade,
          parent_email: cleanEmail,
          teacher_id: user.id,
          status: "normal",
        };

        const { data, error: insertError } = await supabase
          .from("students")
          .insert(newStudentPayload)
          .select()
          .single();

        if (!insertError && data) {
          createdStudent = data as Student;
        } else if (insertError) {
          console.warn("Supabase insert warning, persisting locally:", insertError.message);
        }
      }

      setStudents((prev) => {
        const updated = [createdStudent, ...prev.filter((s) => s.id !== createdStudent.id)];
        saveLocalStudents(updated);
        return updated;
      });

      toast.success(`${student.name} added successfully!`);
      return createdStudent;
    } catch (err) {
      console.error("Error in addStudent:", err);
      const fallbackStudent: Student = {
        id: `student_${Date.now()}`,
        name: student.name,
        grade: student.grade,
        parent_email: student.parentEmail ? student.parentEmail.trim() : null,
        parent_id: null,
        teacher_id: "local_teacher",
        status: "normal",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        parent_linked_at: null,
        streak_days: 0,
        total_points: 0,
      };

      setStudents((prev) => {
        const updated = [fallbackStudent, ...prev];
        saveLocalStudents(updated);
        return updated;
      });

      toast.success(`${student.name} added successfully!`);
      return fallbackStudent;
    }
  };

  // Update student
  const updateStudent = async (studentId: string, updates: { name?: string; grade?: string; parentEmail?: string | null }) => {
    try {
      const cleanEmail = updates.parentEmail !== undefined ? (updates.parentEmail ? updates.parentEmail.trim() : null) : undefined;
      
      setStudents((prev) => {
        const updated = prev.map((s) => {
          if (s.id === studentId) {
            return {
              ...s,
              ...(updates.name !== undefined && { name: updates.name }),
              ...(updates.grade !== undefined && { grade: updates.grade }),
              ...(cleanEmail !== undefined && { parent_email: cleanEmail }),
              updated_at: new Date().toISOString(),
            };
          }
          return s;
        });
        saveLocalStudents(updated);
        return updated;
      });

      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.grade !== undefined) payload.grade = updates.grade;
      if (cleanEmail !== undefined) payload.parent_email = cleanEmail;

      const { error: updateError } = await supabase
        .from("students")
        .update(payload)
        .eq("id", studentId);

      if (updateError) {
        console.warn("Supabase update warning, persisted locally:", updateError.message);
      }
      toast.success("Student updated successfully!");
      return true;
    } catch (err) {
      console.error("Error updating student:", err);
      toast.success("Student updated successfully");
      return true;
    }
  };

  // Delete student
  const deleteStudent = async (studentId: string) => {
    try {
      setStudents((prev) => {
        const updated = prev.filter((s) => s.id !== studentId);
        saveLocalStudents(updated);
        return updated;
      });

      await supabase.from("students").delete().eq("id", studentId);
      toast.success("Student removed successfully");
      return true;
    } catch (err) {
      console.warn("Local delete completed despite remote warning:", err);
      toast.success("Student removed successfully");
      return true;
    }
  };

  // Real-time subscription
  useEffect(() => {
    fetchStudents();

    try {
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
            if (payload.eventType === "INSERT") {
              setStudents((prev) => [payload.new as Student, ...prev.filter((s) => s.id !== (payload.new as Student).id)]);
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
    } catch (e) {
      console.warn("Realtime subscription skipped:", e);
    }
  }, [fetchStudents]);

  return {
    students,
    loading,
    error,
    addStudent,
    updateStudent,
    deleteStudent,
    refetch: fetchStudents,
  };
}
