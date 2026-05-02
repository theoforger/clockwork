import { BrowserRouter, Routes, Route } from "react-router-dom"
import { CreateEvent } from "./pages/CreateEvent"
import { TooltipProvider } from "./components/ui/tooltip"
import { Toaster } from "./components/ui/sonner"

export function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CreateEvent />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </TooltipProvider>
  )
}

export default App
