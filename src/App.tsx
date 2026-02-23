import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import ImmobiliPage from "@/pages/ImmobiliPage";
import PersonePage from "@/pages/PersonePage";
import ContrattiPage from "@/pages/ContrattiPage";
import ContabilitaPage from "@/pages/ContabilitaPage";
import ManutenzioniPage from "@/pages/ManutenzioniPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/immobili" element={<ImmobiliPage />} />
              <Route path="/persone" element={<PersonePage />} />
              <Route path="/contratti" element={<ContrattiPage />} />
              <Route path="/contabilita" element={<ContabilitaPage />} />
              <Route path="/manutenzioni" element={<ManutenzioniPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
