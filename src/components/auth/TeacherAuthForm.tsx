import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const grades = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
  "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
  "Grade 11", "Grade 12",
];

export function TeacherAuthForm() {
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"teacher" | "principal">("teacher");
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  
  const [signUpData, setSignUpData] = useState({
    name: "",
    institute: "",
    email: "",
    password: "",
  });
  
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  // Fetch user role from database and redirect accordingly
  const redirectBasedOnRole = async (userId: string) => {
    try {
      // Fetch role from the secure user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleError) {
        console.error("Error fetching role:", roleError);
      }

      let userRole = roleData?.role;

      // If no role in table, check metadata and sync
      if (!userRole) {
        const { data: { user } } = await supabase.auth.getUser();
        userRole = user?.user_metadata?.role;

        if (userRole && user) {
          // Sync to user_roles table
          await supabase
            .from("user_roles")
            .upsert({ user_id: user.id, role: userRole }, { onConflict: "user_id,role" });
        }
      }

      // Redirect based on role
      switch (userRole) {
        case "principal":
          navigate("/dashboard/principal");
          break;
        case "teacher":
          navigate("/dashboard/teacher");
          break;
        case "parent":
          navigate("/dashboard/parent");
          break;
        default:
          navigate("/dashboard/teacher"); // Default for teacher portal
      }
    } catch (err) {
      console.error("Error in redirect:", err);
      navigate("/dashboard/teacher");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpData.name || !signUpData.email || !signUpData.password) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    const { error } = await signUp(signUpData.email, signUpData.password, {
      full_name: signUpData.name,
      role: role,
      institute_name: signUpData.institute,
      grades: role === "teacher" ? selectedGrades : null,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! You can now sign in.");
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInData.email || !signInData.password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    const { error } = await signIn(signInData.email, signInData.password);

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success("Welcome back!");
      
      // Get the current user and redirect based on their actual role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await redirectBasedOnRole(user.id);
      } else {
        navigate("/dashboard/teacher");
      }
      setLoading(false);
    }
  };

  const addGrade = (grade: string) => {
    if (!selectedGrades.includes(grade)) {
      setSelectedGrades([...selectedGrades, grade]);
    }
  };

  const removeGrade = (grade: string) => {
    setSelectedGrades(selectedGrades.filter(g => g !== grade));
  };

  return (
    <Tabs defaultValue="signin" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="signin">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>

      <TabsContent value="signin">
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email">Email Address</Label>
            <Input 
              id="signin-email" 
              type="email" 
              placeholder="your@school.edu"
              value={signInData.email}
              onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signin-password">Password</Label>
            <Input 
              id="signin-password" 
              type="password" 
              placeholder="••••••••"
              value={signInData.password}
              onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
            />
          </div>

          <Button 
            type="submit"
            variant="secondary" 
            className="w-full"
            disabled={loading}
          >
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing In...</> : "Sign In"}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="signup">
        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Role Selection */}
          <div className="space-y-3">
            <Label>Select Role</Label>
            <RadioGroup 
              value={role} 
              onValueChange={(v) => setRole(v as "teacher" | "principal")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="teacher" id="teacher" />
                <Label htmlFor="teacher" className="font-normal cursor-pointer">Teacher</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="principal" id="principal" />
                <Label htmlFor="principal" className="font-normal cursor-pointer">Principal</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input 
              id="name" 
              placeholder="Your full name"
              value={signUpData.name}
              onChange={(e) => setSignUpData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="institute">Institute Name</Label>
            <Input 
              id="institute" 
              placeholder="School/Institution name"
              value={signUpData.institute}
              onChange={(e) => setSignUpData(prev => ({ ...prev, institute: e.target.value }))}
            />
          </div>

          {role === "teacher" && (
            <div className="space-y-2">
              <Label>Grade(s) You Teach</Label>
              <Select onValueChange={addGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grades" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedGrades.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedGrades.map((g) => (
                    <span 
                      key={g} 
                      className="text-xs bg-muted px-2 py-1 rounded-full cursor-pointer hover:bg-destructive/20"
                      onClick={() => removeGrade(g)}
                    >
                      {g} ×
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="signup-email">Email Address *</Label>
            <Input 
              id="signup-email" 
              type="email" 
              placeholder="your@school.edu"
              value={signUpData.email}
              onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password">Password *</Label>
            <Input 
              id="signup-password" 
              type="password" 
              placeholder="••••••••"
              value={signUpData.password}
              onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
            />
          </div>

          <Button 
            type="submit"
            variant="secondary" 
            className="w-full"
            disabled={loading}
          >
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating Account...</> : "Create Account"}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
