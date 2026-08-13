import { test, expect } from "../fixtures/base"
import { apiDateAt, slotSelector } from "../utils/time"

// The API stores/accepts naive (timezone-less) datetimes; the frontend's
// parseAPIDate forces UTC interpretation by appending "Z" (see
// web/src/lib/date-utils.ts). This is the one spot that scheme could
// silently drift: a slot on the US DST "fall back" day (2026-11-01, when
// America/New_York goes from EDT to EST at 2am local) needs to round-trip
// through submit -> reload -> display at the same local time it was
// entered at, without the offset being applied incorrectly for that day.

test.describe("Timezone / DST", () => {
  test("a slot on the DST transition day round-trips at the correct local time", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({
      name: "DST Event",
      starts_after: apiDateAt("2026-10-31 00:00:00"),
      ends_before: apiDateAt("2026-11-03 00:00:00"),
    })
    await api.submitTimeSlots(created.id, {
      name: "Alice",
      emoji: "🦊",
      time_slots: [
        {
          start_time: apiDateAt("2026-11-01 09:00:00"),
          end_time: apiDateAt("2026-11-01 09:30:00"),
        },
      ],
    })

    await page.goto(`/${created.id}`)
    await expect(page.getByText("DST Event")).toBeVisible()

    // starts_after (Oct 31, a Saturday) puts the initial week at Oct
    // 25 – 31; Nov 1 is in the following week.
    await expect(page.getByRole("heading", { name: "Oct 25 – Oct 31, 2026" })).toBeVisible()
    await page.locator("header").getByRole("button").nth(1).click()
    await expect(page.getByRole("heading", { name: "Nov 1 – Nov 7, 2026" })).toBeVisible()

    const cell = page.locator(slotSelector("2026-11-01 09:00:00"))
    await expect(cell.getByText("🦊")).toBeVisible()

    // Scoped to this cell: every day's 9:00 column renders the same
    // (mostly hidden) tooltip text, so an unscoped getByText would match
    // several at once.
    await cell.hover()
    await expect(cell.getByText("9:00 AM – 9:30 AM")).toBeVisible()
  })
})
