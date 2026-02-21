import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import LearnMore from "./pages/LearnMore";
import WhyItMatters from "./pages/WhyItMatters";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import ParentDashboard from "./pages/dashboard/ParentDashboard";
import TeacherDashboard from "./pages/dashboard/TeacherDashboard";
import PrincipalDashboard from "./pages/dashboard/PrincipalDashboard";
import TeacherLearningResources from "./pages/dashboard/TeacherLearningResources";
import VoiceTestPage from "./pages/VoiceTestPage";
import LearningResources from "./pages/LearningResources";
import NotFound from "./pages/NotFound";
import {
  AboutPage,
  CareersPage,
  PartnershipsPage,
  PressPage,
  ResearchPage,
  BlogPage,
  FAQPage,
  PrivacyPage,
  TermsPage,
  CookiesPage,
  AccessibilityPage,
} from "./pages/InfoPages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
              <Route path="/dashboard/principal" element={<ProtectedRoute><PrincipalDashboard /></ProtectedRoute>} />
              <Route path="/voice-test" element={<ProtectedRoute><VoiceTestPage /></ProtectedRoute>} />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
