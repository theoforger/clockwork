import { useNavigate, useParams } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import { FileNotFoundIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ModeToggle } from "@/components/mode-toggle"
import { clearLastEventId, getLastEventId } from "@/lib/session"

export function NotFound() {
  const navigate = useNavigate()
  // Still resolves when this 404 came from EventSchedule rendering us for a
  // bad/deleted event id (route "/:eventId") — undefined for the catch-all
  // "*" route, where there's no specific event to compare against.
  const { eventId } = useParams<{ eventId?: string }>()

  const handleBackToHome = () => {
    // The home page redirects straight back into the last-visited event —
    // if that's the very event that got us to this 404, going "home"
    // would just bounce back here. Clear it first so home actually shows
    // the create-event form instead of looping.
    if (eventId && getLastEventId() === eventId) {
      clearLastEventId()
    }
    navigate("/")
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="fixed top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex w-full flex-col items-center gap-2">
            <HugeiconsIcon
              icon={FileNotFoundIcon}
              size={40}
              className="text-muted-foreground"
            />
            <CardTitle className="text-2xl font-bold">
              404 - Page Not Found
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or may have been
            moved.
          </p>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button className="w-full" onClick={handleBackToHome}>
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
