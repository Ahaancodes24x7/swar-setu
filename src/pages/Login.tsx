import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, School, ArrowLeft } from "lucide-react";
import { TeacherAuthForm } from "@/components/auth/TeacherAuthForm";
import { ParentAuthForm } from "@/components/auth/ParentAuthForm";
import { ImaginativeHeroBackground } from "@/components/home/ImaginativeHeroBackground";

export default function Login() {
  const { type } = useParams<{ type?: string }>();
  const navigate = useNavigate();

  // Disable body scroll for all login views while mounted
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, []);

  // If no type specified, show selection
  if (!type) {
    return (
        <Layout hideFooter={true} hideHeader={true}>
        <section className="relative overflow-hidden min-h-screen flex items-center">
          <ImaginativeHeroBackground />
          <div className="container mx-auto px-4 relative z-10 py-24">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                Choose your portal to continue
              </h1>
              <p className="text-muted-foreground">
                Sign in as a parent or teacher to access SWARSETU features
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card 
                className="cursor-pointer transform hover:-translate-y-2 transition-all duration-300 border border-accent/30 bg-gradient-to-br from-white/60 to-accent/5 backdrop-blur-sm"
                onClick={() => navigate("/login/parent")}
              >
                <CardContent className="pt-10 pb-10 text-center">
                  <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-accent-foreground" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">Parent</h2>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Track your child's progress, practice with the AI chatbot, and view reports.
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer transform hover:-translate-y-2 transition-all duration-300 border border-secondary/30 bg-gradient-to-br from-white/60 to-secondary/5 backdrop-blur-sm"
                onClick={() => navigate("/login/teacher")}
              >
                <CardContent className="pt-10 pb-10 text-center">
                  <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center mx-auto mb-4">
                    <School className="h-8 w-8 text-secondary-foreground" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">Teacher</h2>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Manage students, run assessments, and generate tailored reports.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  // Parent Login
  if (type === "parent") {
    return (
        <Layout hideFooter={true} hideHeader={true}>
        <section className="relative overflow-hidden min-h-screen flex items-center justify-center">
          <ImaginativeHeroBackground />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-md mx-auto">
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft className="h-4 w-4" />
                Back to selection
              </Link>
              <Card className="bg-white/60 dark:bg-card/70 backdrop-blur-sm border border-accent/20">
                <CardHeader className="text-center pt-8">
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-7 w-7 text-accent-foreground" />
                  </div>
                  <CardTitle>Parent Login</CardTitle>
                  <CardDescription>
                    Access linked by your child's teacher
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ParentAuthForm />
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Parent access must be linked by your child's teacher. Contact the school if you haven't received access.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  // Teacher Login
  return (
       <Layout hideFooter={true} hideHeader={true}>
      <section className="relative overflow-hidden min-h-screen flex items-center justify-center">
        <ImaginativeHeroBackground />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-md mx-auto">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="h-4 w-4" />
              Back to selection
            </Link>
            <Card className="bg-white/60 dark:bg-card/70 backdrop-blur-sm border border-secondary/20">
              <CardHeader className="text-center pt-8">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center mx-auto mb-4">
                  <School className="h-7 w-7 text-secondary-foreground" />
                </div>
                <CardTitle>Teacher Login</CardTitle>
                <CardDescription>
                  Sign in or create an account to manage your classroom
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TeacherAuthForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </Layout>
  );
}
