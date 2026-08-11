import { BrowserRouter, Routes, Route } from "react-router-dom"
import { CreateEvent } from "./pages/CreateEvent"
import { EventSchedule } from "./pages/EventSchedule"
import { Toaster } from "./components/ui/sonner"
import { TooltipProvider } from "./components/ui/tooltip"
import { useThemeShortcut } from "./hooks/use-theme-shortcut"

export function App() {
  useThemeShortcut()

  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CreateEvent />} />
          <Route path="/:eventId" element={<EventSchedule />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </TooltipProvider>
  )
}

export default App
