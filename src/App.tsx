import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Clients from "./pages/Clients";
import Services from "./pages/Services";
import Quotes from "./pages/Quotes";
import Contracts from "./pages/Contracts";
import Invoices from "./pages/Invoices";
import Campaigns from "./pages/Campaigns";
import Expenses from "./pages/Expenses";
import Remittances from "./pages/Remittances";
import Flows from "./pages/Flows";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import ProductAnalysis from "./pages/ProductAnalysis";
import TestPostgres from "./pages/TestPostgres";
import Auth from "./pages/Auth";
import Setup from "./pages/Setup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/test-postgres" element={<TestPostgres />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/campaigns" element={<Campaigns />} />
                      <Route path="/contacts" element={<Contacts />} />
                      <Route path="/clients" element={<Clients />} />
                      <Route path="/services" element={<Services />} />
                      <Route path="/quotes" element={<Quotes />} />
                      <Route path="/contracts" element={<Contracts />} />
                      <Route path="/invoices" element={<Invoices />} />
                      <Route path="/remittances" element={<Remittances />} />
                      <Route path="/expenses" element={<Expenses />} />
                      <Route path="/product-analysis" element={<ProductAnalysis />} />
                      <Route path="/flows" element={<Flows />} />
                      <Route path="/calendar" element={<Calendar />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
