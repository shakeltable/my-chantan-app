import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect } from "react"
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom"
import { initPixels, trackPage } from "./lib/tracking"
import { initAdsense } from "./lib/ads"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import ScrollToTop from "./components/ScrollToTop"
import Index from "./pages/Index"
import NotFound from "./pages/NotFound"
import Room from "./pages/Room"
import Admin from "./pages/Admin"

const queryClient = new QueryClient()

function RouteTracker() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname.startsWith("/me-as-admin")) return
    initPixels().then(() => trackPage(pathname))
    initAdsense()
  }, [pathname])
  return null
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <RouteTracker />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/room/:code" element={<Room />} />
          <Route path="/me-as-admin" element={<Admin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
)

export default App
