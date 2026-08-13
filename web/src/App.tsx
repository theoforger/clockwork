import { Suspense, lazy } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"
import { Toaster } from "./components/ui/sonner"
import { TooltipProvider } from "./components/ui/tooltip"

// Route-level code splitting: keeps CreateEvent's calendar/range-picker
// bits out of the (far more common) shared-link visit to EventSchedule.
const CreateEvent = lazy(() =>
  import("./pages/CreateEvent").then((m) => ({ default: m.CreateEvent }))
)
const EventSchedule = lazy(() =>
  import("./pages/EventSchedule").then((m) => ({ default: m.EventSchedule }))
)
const NotFound = lazy(() =>
  import("./pages/NotFound").then((m) => ({ default: m.NotFound }))
)

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

export function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<CreateEvent />} />
            <Route path="/:eventId" element={<EventSchedule />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster position="top-center" />
      </BrowserRouter>
    </TooltipProvider>
  )
}

export default App
