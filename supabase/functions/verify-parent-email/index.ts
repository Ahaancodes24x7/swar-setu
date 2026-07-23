import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required", isLinked: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query students table with service role (bypasses RLS)
    const { data: students, error } = await supabase
      .from("students")
      .select("id, name")
      .ilike("parent_email", email.trim())
      .limit(1);

    if (error) {
      console.error("Database query error:", error);
      throw error;
    }

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({ 
          isLinked: false, 
          message: "This email is not linked to any student" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        isLinked: true, 
        studentName: students[0].name,
        studentId: students[0].id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error verifying parent email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", isLinked: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
