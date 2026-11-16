import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProductTour } from "@/components/tour/ProductTour";
import Index from "./pages/Index";
const LearnMore = lazy(() => import("./pages/LearnMore"));
const WhyItMatters = lazy(() => import("./pages/WhyItMatters"));
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ParentDashboard = lazy(() => import("./pages/dashboard/ParentDashboard"));
const TeacherDashboard = lazy(() => import("./pages/dashboard/TeacherDashboard"));
const PrincipalDashboard = lazy(() => import("./pages/dashboard/PrincipalDashboard"));
const TeacherLearningResources = lazy(() => import("./pages/dashboard/TeacherLearningResources"));
const TeacherHelp = lazy(() => import("./pages/dashboard/teacher/TeacherHelp"));
const VoiceTestPage = lazy(() => import("./pages/VoiceTestPage"));
const LearningResources = lazy(() => import("./pages/LearningResources"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
import { useTapSparkles } from "@/hooks/useTapSparkles";

// development-only screen previews (tree-shaken from production builds)
const TestPreview = import.meta.env.DEV ? lazy(() => import("./pages/dev/TestPreview")) : null;
const AboutPage = lazy(() => import("./pages/InfoPages").then((m) => ({ default: m.AboutPage })));
const CareersPage = lazy(() => import("./pages/InfoPages").then((m) => ({ default: m.CareersPage })));
const PartnershipsPage = lazy(() => import("./pages/InfoPages").then((m) => ({ default: m.PartnershipsPage })));
const PressPage = lazy(() => import("./pages/InfoPages").then((m) => ({ default: m.PressPage })));
const ResearchPage = lazy(() => import("./pages/InfoPages").then((m) => ({ default: m.ResearchPage })));
const BlogPage = lazy(() => import("./pages/InfoPages").then((m) => ({ default: m.BlogPage })));
const FAQPage = lazy(() => import("./pages/InfoPages").then((m) => ({ default: m.FAQPage })));
const PrivacyPage = lazy(() => import("./pages/InfoPages").then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("./pages/InfoPages").then((m) => ({ default: m.TermsPage })));
const CookiesPage = lazy(() => import("./pages/InfoPages").then((m) => ({ default: m.CookiesPage })));
const AccessibilityPage = lazy(() => import("./pages/InfoPages").then((m) => ({ default: m.AccessibilityPage })));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="grid min-h-[100svh] place-items-center" aria-label="Loading">
      <span className="h-10 w-10 animate-bounce rounded-full" style={{ background: "radial-gradient(circle at 34% 30%, #fff8e1 0 7%, #ffc94d 16%, #f29a0d 46%, #b85a00 82%)" }} />
    </div>
  );
}

function TapSparkles() {
  useTapSparkles();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <TapSparkles />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/learn-more" element={<LearnMore />} />
              <Route path="/why-it-matters" element={<WhyItMatters />} />
              <Route path="/login" element={<Login />} />
              <Route path="/login/:type" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/dashboard/parent" element={<ProtectedRoute><ParentDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/teacher" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/teacher/resources" element={<ProtectedRoute><TeacherLearningResources /></ProtectedRoute>} />
              <Route path="/dashboard/teacher/help" element={<ProtectedRoute><TeacherHelp /></ProtectedRoute>} />
              <Route path="/dashboard/principal" element={<ProtectedRoute><PrincipalDashboard /></ProtectedRoute>} />
              <Route path="/voice-test" element={<ProtectedRoute><VoiceTestPage /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/learning-resources" element={<ProtectedRoute><LearningResources /></ProtectedRoute>} />
              {/* Footer content pages */}
              <Route path="/about" element={<AboutPage />} />
              <Route path="/careers" element={<CareersPage />} />
              <Route path="/partnerships" element={<PartnershipsPage />} />
              <Route path="/press" element={<PressPage />} />
              <Route path="/research" element={<ResearchPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/cookies" element={<CookiesPage />} />
              <Route path="/accessibility" element={<AccessibilityPage />} />
              {TestPreview && <Route path="/dev/test-preview" element={<TestPreview />} />}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            <ProductTour />
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
