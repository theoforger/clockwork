import { test, expect } from "../fixtures/base"
import { apiDateAt, slotSelector } from "../utils/time"
import { SUBMITTED_CLASS } from "../utils/colors"
import type { ApiClient } from "../fixtures/api"

async function seedTwoOverlappingAttendees(api: ApiClient, eventId: string) {
  const alice = await api.submitTimeSlots(eventId, {
    name: "Alice Fox",
    emoji: "🦊",
    time_slots: [
      {
        start_time: apiDateAt("2026-08-09 02:00:00"),
        end_time: apiDateAt("2026-08-09 02:30:00"),
      },
    ],
  })
  const bob = await api.submitTimeSlots(eventId, {
    name: "Bob Dog",
    emoji: "🐶",
    time_slots: [
      {
        start_time: apiDateAt("2026-08-09 02:00:00"),
        end_time: apiDateAt("2026-08-09 02:30:00"),
      },
    ],
  })
  return { alice, bob }
}

test.describe("Attendee filtering", () => {
  test("search narrows the sidebar list but not the grid", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Search Filter Event" })
    await seedTwoOverlappingAttendees(api, created.id)

    await page.goto(`/${created.id}`)
    await expect(page.getByText("Search Filter Event")).toBeVisible()

    await page.getByPlaceholder("Search attendees...").fill("Alice")
    await expect(page.getByText("Alice Fox")).toBeVisible()
    await expect(page.getByText("Bob Dog")).toHaveCount(0)

    // The grid still reflects everyone (search doesn't touch selection).
    const cell = page.locator(slotSelector("2026-08-09 02:00:00"))
    await expect(cell.getByText("🦊")).toBeVisible()
    await expect(cell.getByText("🐶")).toBeVisible()
  })

  test("toggling an attendee off removes them from the grid but not the sidebar list", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Toggle Filter Event" })
    await seedTwoOverlappingAttendees(api, created.id)

    await page.goto(`/${created.id}`)
    await expect(page.getByText("Toggle Filter Event")).toBeVisible()

    const cell = page.locator(slotSelector("2026-08-09 02:00:00"))
    await expect(cell.getByText("🦊")).toBeVisible()
    await expect(cell.getByText("🐶")).toBeVisible()

    await page
      .locator("label", { hasText: "Bob Dog" })
      .getByRole("checkbox")
      .click()

    await expect(cell.getByText("🐶")).toHaveCount(0)
    await expect(cell.getByText("🦊")).toBeVisible()
    // Still listed in the sidebar, just visually deselected.
    await expect(page.getByText("Bob Dog")).toBeVisible()
  })

  test("Select all / Select none work and disable themselves appropriately", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Select All None Event" })
    await seedTwoOverlappingAttendees(api, created.id)

    await page.goto(`/${created.id}`)
    await expect(page.getByText("Select All None Event")).toBeVisible()

    const selectAll = page.getByRole("button", { name: "Select all" })
    const selectNone = page.getByRole("button", { name: "Select none" })
    const cell = page.locator(slotSelector("2026-08-09 02:00:00"))

    await expect(selectAll).toBeDisabled()
    await expect(selectNone).toBeEnabled()

    await selectNone.click()
    await expect(selectNone).toBeDisabled()
    await expect(selectAll).toBeEnabled()
    await expect(cell.getByText("🦊")).toHaveCount(0)
    await expect(cell.getByText("🐶")).toHaveCount(0)

    await selectAll.click()
    await expect(selectAll).toBeDisabled()
    await expect(selectNone).toBeEnabled()
    await expect(cell.getByText("🦊")).toBeVisible()
    await expect(cell.getByText("🐶")).toBeVisible()
  })

  test("hovering a slot highlights exactly the attendees available then", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Hover Highlight Event" })
    const { alice } = await seedTwoOverlappingAttendees(api, created.id)
    // A slot only Alice is in, to make the highlight set unambiguous.
    await api.updateAttendee(
      created.id,
      alice.attendee_id,
      alice.token,
      {
        name: "Alice Fox",
        emoji: "🦊",
        time_slots: [
          {
            start_time: apiDateAt("2026-08-09 03:00:00"),
            end_time: apiDateAt("2026-08-09 03:30:00"),
          },
        ],
      }
    )

    await page.goto(`/${created.id}`)
    await expect(page.getByText("Hover Highlight Event")).toBeVisible()

    const aliceOnlyCell = page.locator(slotSelector("2026-08-09 03:00:00"))
    await aliceOnlyCell.hover()

    const aliceRow = page.locator("label", { hasText: "Alice Fox" })
    const bobRow = page.locator("label", { hasText: "Bob Dog" })
    await expect(aliceRow).toHaveClass(/border-primary/)
    await expect(bobRow).not.toHaveClass(/border-primary/)
  })

  test("multiple attendees available in the same slot both show up on it", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Overlap Event" })
    await seedTwoOverlappingAttendees(api, created.id)

    await page.goto(`/${created.id}`)
    await expect(page.getByText("Overlap Event")).toBeVisible()

    const overlapCell = page.locator(slotSelector("2026-08-09 02:00:00"))
    await expect(overlapCell.getByText("🦊")).toBeVisible()
    await expect(overlapCell.getByText("🐶")).toBeVisible()

    // A slot nobody submitted shows neither the green base nor an emoji.
    const emptyCell = page.locator(slotSelector("2026-08-09 05:00:00"))
    await expect(emptyCell).not.toHaveClass(SUBMITTED_CLASS)
  })
})
