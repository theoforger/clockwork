import { test, expect, pinClock } from "../fixtures/base"
import { apiDateAt, slotSelector } from "../utils/time"

test.describe("Schedule grid — viewing", () => {
  test("cells outside the event's date range are disabled, cells inside aren't", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({
      name: "Bounded Event",
      starts_after: apiDateAt("2026-08-12 08:00:00"),
      ends_before: apiDateAt("2026-08-12 18:00:00"),
    })

    await page.goto(`/${created.id}`)
    await expect(page.getByText("Bounded Event")).toBeVisible()

    const before = page.locator(slotSelector("2026-08-12 06:00:00"))
    const inside = page.locator(slotSelector("2026-08-12 10:00:00"))

    await expect(before).toHaveClass(/cursor-not-allowed/)
    await expect(inside).not.toHaveClass(/cursor-not-allowed/)
  })

  test("the initial visible week is the one containing starts_after", async ({
    page,
    api,
  }) => {
    // Oct 31 2026 is a Saturday, so its week (date-fns default, Sunday
    // start) is Oct 25 – Oct 31.
    const created = await api.createEvent({
      name: "Starts Bound Event",
      starts_after: apiDateAt("2026-10-31 00:00:00"),
      ends_before: apiDateAt("2026-11-05 00:00:00"),
    })

    await page.goto(`/${created.id}`)
    await expect(page.getByText("Starts Bound Event")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Oct 25 – Oct 31, 2026" })).toBeVisible()
  })

  test("with no date bounds, the initial visible week is the earliest submitted slot's", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Unbounded Event" })
    await api.submitTimeSlots(created.id, {
      name: "Alice",
      emoji: "🦊",
      time_slots: [
        {
          start_time: apiDateAt("2026-03-12 10:00:00"),
          end_time: apiDateAt("2026-03-12 10:30:00"),
        },
      ],
    })

    await page.goto(`/${created.id}`)
    await expect(page.getByText("Unbounded Event")).toBeVisible()
    // Mar 12 2026 is a Thursday -> week of Mar 8 – Mar 14.
    await expect(page.getByRole("heading", { name: "Mar 8 – Mar 14, 2026" })).toBeVisible()
  })

  test("with no date bounds and no attendees, the initial visible week is the current one", async ({
    page,
    api,
  }) => {
    await pinClock(page)
    const created = await api.createEvent({ name: "Empty Event" })

    await page.goto(`/${created.id}`)
    await expect(page.getByText("Empty Event")).toBeVisible()
    // FIXED_NOW is Wed Aug 12 2026 -> week of Aug 9 – Aug 15.
    await expect(page.getByRole("heading", { name: "Aug 9 – Aug 15, 2026" })).toBeVisible()
  })

  test("prev/next week buttons move the visible week", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({
      name: "Nav Event",
      starts_after: apiDateAt("2026-08-12 00:00:00"),
      ends_before: apiDateAt("2026-08-20 00:00:00"),
    })

    await page.goto(`/${created.id}`)
    await expect(page.getByRole("heading", { name: "Aug 9 – Aug 15, 2026" })).toBeVisible()

    const header = page.locator("header")
    await header.getByRole("button").nth(1).click() // next week
    await expect(page.getByRole("heading", { name: "Aug 16 – Aug 22, 2026" })).toBeVisible()

    await header.getByRole("button").nth(0).click() // prev week
    await expect(page.getByRole("heading", { name: "Aug 9 – Aug 15, 2026" })).toBeVisible()
  })

  test("copy link copies the current URL and shows a toast", async ({
    page,
    api,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
    const created = await api.createEvent({ name: "Copy Link Event" })

    await page.goto(`/${created.id}`)
    await expect(page.getByText("Copy Link Event")).toBeVisible()

    await page.locator("input[readonly] + button").click()
    await expect(page.getByText("Link copied to clipboard!")).toBeVisible()

    const clipboard = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboard).toBe(page.url())
  })

  test("a long description shows a Read more / Show less toggle; a short one doesn't", async ({
    page,
    api,
  }) => {
    const long = await api.createEvent({
      name: "Long Description Event",
      description: Array.from({ length: 30 }, (_, i) => `Line ${i + 1}`).join(
        "\n"
      ),
    })
    await page.goto(`/${long.id}`)
    await expect(page.getByText("Long Description Event")).toBeVisible()

    const toggle = page.getByRole("button", { name: "Read more" })
    await expect(toggle).toBeVisible()
    await toggle.click()
    await expect(page.getByRole("button", { name: "Show less" })).toBeVisible()

    const short = await api.createEvent({
      name: "Short Description Event",
      description: "One short line",
    })
    await page.goto(`/${short.id}`)
    await expect(page.getByText("Short Description Event")).toBeVisible()
    await expect(page.getByRole("button", { name: "Read more" })).toHaveCount(
      0
    )
  })
})
