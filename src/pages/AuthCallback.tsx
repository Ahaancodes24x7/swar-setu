import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash from URL (Supabase magic link tokens come in hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");
        const error = hashParams.get("error");
        const errorDescription = hashParams.get("error_description");

        if (error) {
          setStatus("error");
          setErrorMessage(errorDescription || error);
          return;
        }

        // If we have tokens in the hash, set the session
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setStatus("error");
            setErrorMessage(sessionError.message);
            return;
          }
        }

        // Get the current session
        const { data: { session }, error: getSessionError } = await supabase.auth.getSession();

        if (getSessionError || !session) {
          setStatus("error");
          setErrorMessage("Failed to verify your session. Please try again.");
          return;
        }

        setStatus("success");

        // Redirect based on user role
        const role = session.user.user_metadata?.role;
        setTimeout(() => {
          if (role === "parent") {
            navigate("/dashboard/parent", { replace: true });
          } else if (role === "teacher") {
            navigate("/dashboard/teacher", { replace: true });
          } else if (role === "principal") {
            navigate("/dashboard/principal", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        }, 1500);
      } catch (err) {
        console.error("Auth callback error:", err);
        setStatus("error");
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-accent/5 to-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {status === "processing" && (
            <>
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <CardTitle>Verifying your login...</CardTitle>
              <CardDescription>Please wait while we authenticate you</CardDescription>
            </>
          )}
          {status === "success" && (
            <>
              <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <CardTitle className="text-success">Login Successful!</CardTitle>
              <CardDescription>Redirecting to your dashboard...</CardDescription>
            </>
          )}
          {status === "error" && (
            <>
              <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Login Failed</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </>
          )}
        </CardHeader>
        {status === "error" && (
          <CardContent className="text-center">
            <Button 
              variant="outline" 
              onClick={() => navigate("/login/parent")}
              className="mt-4"
            >
              Try Again
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
