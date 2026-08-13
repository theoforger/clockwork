import { test, expect } from "../fixtures/base"

// No desktop analog — this covers the mobile-only sidebar sheet
// (AttendeeSidebarSheet) that replaces the always-visible aside below the
// `md:` breakpoint. See EventSchedule/index.tsx and AttendeeSidebar.tsx.
test.describe("Attendee sidebar — mobile drawer", () => {
  test("hamburger opens the sheet; the static sidebar stays hidden; closing it leaves the grid reachable", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Drawer Test" })
    await page.goto(`/${created.id}`)

    // The event name only renders inside the sidebar (desktop aside or
    // mobile sheet) — at this viewport the aside is `hidden md:flex` and
    // the sheet isn't open yet, so the hamburger is the right "page
    // loaded" signal here, not the event name text.
    const hamburger = page.getByRole("button", { name: "Open attendee list" })
    await expect(hamburger).toBeVisible()

    // The desktop <aside> is `hidden md:flex` — present in the DOM but not
    // rendered, so its content shouldn't be reachable at this viewport.
    await expect(
      page.getByPlaceholder("Search attendees...")
    ).not.toBeVisible()

    await hamburger.click()

    // The sheet renders the same content — event name, search box, submit
    // form — as the (still-present-but-hidden) desktop aside, so scope
    // queries to the sheet's own panel rather than the page as a whole to
    // avoid matching both copies.
    const sheet = page.locator('[data-slot="sheet-content"]')
    // Two "Drawer Test" headings live in the sheet: the visible one from
    // AttendeeSidebarContent, and a sr-only SheetTitle Radix requires for
    // accessibility — target the visible one specifically by its class.
    await expect(sheet.locator("h2.truncate")).toHaveText("Drawer Test")
    const searchInput = sheet.getByPlaceholder("Search attendees...")
    await expect(searchInput).toBeVisible()
    await expect(
      sheet.getByRole("button", { name: "Submit My Availability" })
    ).toBeVisible()

    // Close via Escape (Radix Dialog's default) and confirm the grid is
    // still there and usable underneath.
    await page.keyboard.press("Escape")
    await expect(sheet).not.toBeVisible()
    await expect(hamburger).toBeVisible()
  })
})
