import { BrowserRouter, Routes, Route } from "react-router-dom"
import { CreateEvent } from "./pages/CreateEvent"
import { EventSchedule } from "./pages/EventSchedule"
import { NotFound } from "./pages/NotFound"
import { Toaster } from "./components/ui/sonner"
import { TooltipProvider } from "./components/ui/tooltip"

export function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CreateEvent />} />
          <Route path="/:eventId" element={<EventSchedule />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster position="top-center" />
      </BrowserRouter>
    </TooltipProvider>
  )
}

export default App
