import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, LogIn, UserPlus } from "lucide-react";

export function ParentAuthForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (isSignUp && password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const cleanEmail = email.toLowerCase().trim();

    try {
      // Multi-tier link verification
      let isLinked = false;
      let studentName = "";

      // Tier 1: Try Edge Function
      try {
        const { data: verifyResult, error: verifyError } = await supabase.functions.invoke("verify-parent-email", {
          body: { email: cleanEmail },
        });
        if (!verifyError && verifyResult?.isLinked) {
          isLinked = true;
          studentName = verifyResult.studentName;
        }
      } catch (e) {
        console.warn("Edge function check bypassed:", e);
      }

      // Tier 2: Direct DB query (case insensitive ilike)
      if (!isLinked) {
        try {
          const { data: directStudents } = await supabase
            .from("students")
            .select("id, name, parent_email")
            .ilike("parent_email", cleanEmail)
            .limit(1);

          if (directStudents && directStudents.length > 0) {
            isLinked = true;
            studentName = directStudents[0].name;
          }
        } catch (e) {
          console.warn("Direct DB check warning:", e);
        }
      }

      // Tier 3: Local storage fallback
      if (!isLinked) {
        try {
          const localData = localStorage.getItem("swar_setu_local_students_v1");
          if (localData) {
            const parsed = JSON.parse(localData);
            const match = parsed.find(
              (s: any) => s.parent_email && s.parent_email.toLowerCase().trim() === cleanEmail
            );
            if (match) {
              isLinked = true;
              studentName = match.name;
            }
          }
        } catch (e) {
          console.warn("Local storage check warning:", e);
        }
      }

      // For sign up mode, require a linked student; for sign in mode, allow trying password auth
      if (!isLinked && isSignUp) {
        toast.error("This email is not linked to any student. Please contact your child's teacher.");
        setLoading(false);
        return;
      }

      if (isSignUp) {
        // Sign up with password
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              role: "parent",
              full_name: studentName ? `Parent of ${studentName}` : "Parent",
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("An account with this email already exists. Please sign in instead.");
            setIsSignUp(false);
          } else {
            toast.error(error.message);
          }
        } else {
          // Link parent_id if user object exists
          if (signUpData?.user) {
            try {
              await supabase
                .from("students")
                .update({ parent_id: signUpData.user.id })
                .ilike("parent_email", cleanEmail);
            } catch (e) {
              console.warn("Could not update parent_id in DB:", e);
            }
          }
          toast.success("Account created successfully!");
          navigate("/dashboard/parent");
        }
      } else {
        // Sign in with password
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password. If you're new, please sign up first.");
          } else {
            toast.error(error.message);
          }
        } else {
          // Link parent_id if user object exists
          if (signInData?.user) {
            try {
              await supabase
                .from("students")
                .update({ parent_id: signInData.user.id })
                .ilike("parent_email", cleanEmail);
            } catch (e) {
              console.warn("Could not update parent_id in DB:", e);
            }
          }
          toast.success("Signed in successfully!");
          navigate("/dashboard/parent");
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      toast.error("An unexpected error occurred");
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleAuth} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Parent Email Address</Label>
        <Input 
          id="email" 
          type="email" 
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Enter the email linked to your child by the teacher
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input 
          id="password" 
          type="password" 
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {isSignUp && (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input 
            id="confirmPassword" 
            type="password" 
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      )}

      <Button 
        type="submit"
        variant="accent" 
        className="w-full"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {isSignUp ? "Creating Account..." : "Signing In..."}
          </>
        ) : (
          <>
            {isSignUp ? <UserPlus className="h-4 w-4 mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
            {isSignUp ? "Create Account" : "Sign In"}
          </>
        )}
      </Button>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setConfirmPassword("");
          }}
          className="text-sm text-primary hover:underline"
        >
          {isSignUp 
            ? "Already have an account? Sign in" 
            : "Don't have an account? Sign up"}
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Your email must be linked to your child by their teacher before you can access the portal.
      </p>
    </form>
  );
}
