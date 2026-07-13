import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Okay from "./pages/Okay";
import NotFound from "./pages/NotFound";
import InstallPrompt from "./components/InstallPrompt";
import FunctionBox from "./pages/FunctionBox";
import ProductionReady from "./pages/ProductionReady";
import MemoryConsole from "./pages/MemoryConsole";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<Okay />} />
        <Route path="/functionbox" element={<FunctionBox />} />
        <Route path="/production-ready" element={<ProductionReady />} />
        <Route path="/prod-readiness" element={<ProductionReady />} />
        <Route path="/memory" element={<MemoryConsole />} />
        <Route path="*" element={<NotFound />} />
        </Routes>
        <InstallPrompt />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
