import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteSeoManager } from "@/components/common/RouteSeoManager";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import ApiDocs from "./pages/ApiDocs";
import NotFound from "./pages/NotFound";
import ClientDashboard from "./pages/ClientDashboard";
import ClientSettings from "./pages/ClientSettings";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Assistant from "./pages/Assistant";
import CookiesPolicy from "./pages/CookiesPolicy";
import DocumentationHub from "./pages/DocumentationHub";
import KnowledgeBaseEntryPage from "./pages/KnowledgeBaseEntryPage";

function LegacyClientInvitation() {
  const { token } = useParams();
  return <Navigate replace to={`/auth?type=client&invitation=${encodeURIComponent(token ?? '')}`} />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && error.message.includes('4')) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
    mutations: {
      retry: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <RouteSeoManager />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/api-docs" element={<ApiDocs />} />
                  <Route path="/docs" element={<DocumentationHub />} />
                  <Route path="/docs/:slug" element={<KnowledgeBaseEntryPage />} />
                  <Route path="/articles/:slug" element={<KnowledgeBaseEntryPage />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/cookies" element={<CookiesPolicy />} />
                  <Route path="/assistant" element={<Assistant />} />
                  <Route path="/client" element={<ClientDashboard />} />
                  <Route path="/client/:token" element={<LegacyClientInvitation />} />
                  <Route path="/client/settings" element={<ClientSettings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
