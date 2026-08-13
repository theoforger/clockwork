import { test, expect } from "../fixtures/base"
import { apiDateAt, slotSelector } from "../utils/time"

test.describe("Editing and deleting own submission", () => {
  test("a returning browser sees its submission locked to the form", async ({
    page,
    api,
    rememberSubmission,
  }) => {
    const created = await api.createEvent({ name: "Locked Submission" })
    const submitted = await api.submitTimeSlots(created.id, {
      name: "Alice",
      emoji: "🦊",
      comment: "Prefer mornings",
      time_slots: [
        {
          start_time: apiDateAt("2026-08-09 02:00:00"),
          end_time: apiDateAt("2026-08-09 02:30:00"),
        },
      ],
    })
    await rememberSubmission(created.id, submitted.attendee_id, submitted.token)

    await page.goto(`/${created.id}`)
    await expect(page.getByText("Locked Submission")).toBeVisible()

    await expect(page.getByPlaceholder("Your name")).toHaveValue("Alice")
    await expect(page.getByPlaceholder("Your name")).toBeDisabled()
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible()
  })

  test("Edit seeds the form and grid from the existing submission; Cancel discards changes", async ({
    page,
    api,
    rememberSubmission,
  }) => {
    const created = await api.createEvent({ name: "Edit Then Cancel" })
    const submitted = await api.submitTimeSlots(created.id, {
      name: "Alice",
      emoji: "🦊",
      time_slots: [
        {
          start_time: apiDateAt("2026-08-09 02:00:00"),
          end_time: apiDateAt("2026-08-09 02:30:00"),
        },
      ],
    })
    await rememberSubmission(created.id, submitted.attendee_id, submitted.token)

    await page.goto(`/${created.id}`)
    await expect(page.getByText("Edit Then Cancel")).toBeVisible()

    const cell = page.locator(slotSelector("2026-08-09 02:00:00"))
    await page.getByRole("button", { name: "Edit" }).click()

    const nameInput = page.getByPlaceholder("Your name")
    await expect(nameInput).toBeEnabled()
    await expect(nameInput).toHaveValue("Alice")
    await expect(cell).toHaveClass(/bg-primary /)

    await nameInput.fill("Alice Draft Edit")
    await page.getByRole("button", { name: "Cancel" }).click()

    // Reverts to the locked view with the original data, not the draft.
    await expect(page.getByPlaceholder("Your name")).toHaveValue("Alice")
    await expect(page.getByPlaceholder("Your name")).toBeDisabled()
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible()
  })

  test("Save Changes persists new fields and replaces the slots", async ({
    page,
    api,
    rememberSubmission,
  }) => {
    const created = await api.createEvent({ name: "Save Changes Event" })
    const submitted = await api.submitTimeSlots(created.id, {
      name: "Alice",
      emoji: "🦊",
      time_slots: [
        {
          start_time: apiDateAt("2026-08-09 02:00:00"),
          end_time: apiDateAt("2026-08-09 02:30:00"),
        },
      ],
    })
    await rememberSubmission(created.id, submitted.attendee_id, submitted.token)

    await page.goto(`/${created.id}`)
    await expect(page.getByText("Save Changes Event")).toBeVisible()

    await page.getByRole("button", { name: "Edit" }).click()
    await page.getByPlaceholder("Your name").fill("Alice Updated")
    await page.getByPlaceholder("Comment (Optional)").fill("Now afternoons")

    // Replace the slot entirely: drop the seeded 2:00 one, add a new one.
    await page.locator(slotSelector("2026-08-09 02:00:00")).click()
    const newSlot = page.locator(slotSelector("2026-08-09 03:00:00"))
    await newSlot.click()

    await page.getByRole("button", { name: "Save Changes" }).click()
    await expect(page.getByText("Submission updated!")).toBeVisible()

    await expect(page.getByText("Alice Updated")).toBeVisible()
    await expect(page.getByPlaceholder("Your name")).toBeDisabled()

    const updated = await api.getEvent(created.id)
    expect(updated.attendees).toHaveLength(1)
    expect(updated.attendees[0].name).toBe("Alice Updated")
    expect(updated.attendees[0].comment).toBe("Now afternoons")
    expect(updated.attendees[0].time_slots).toHaveLength(1)
    expect(updated.attendees[0].time_slots[0].start_time).toBe(
      apiDateAt("2026-08-09 03:00:00")
    )
  })

  test("Delete removes the attendee and unlocks the form", async ({
    page,
    api,
    rememberSubmission,
  }) => {
    const created = await api.createEvent({ name: "Delete Submission" })
    const submitted = await api.submitTimeSlots(created.id, {
      name: "Alice",
      emoji: "🦊",
      time_slots: [
        {
          start_time: apiDateAt("2026-08-09 02:00:00"),
          end_time: apiDateAt("2026-08-09 02:30:00"),
        },
      ],
    })
    await rememberSubmission(created.id, submitted.attendee_id, submitted.token)

    await page.goto(`/${created.id}`)
    await expect(page.getByText("Delete Submission")).toBeVisible()

    await page.getByRole("button", { name: "Delete" }).click()
    await expect(page.getByText("Submission deleted")).toBeVisible()

    await expect(page.getByText("Alice")).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: "Submit My Availability" })
    ).toBeVisible()
    await expect(page.getByPlaceholder("Your name")).toBeEnabled()

    const afterDelete = await api.getEvent(created.id)
    expect(afterDelete.attendees).toHaveLength(0)
  })

  test("a stale/mismatched submission cookie doesn't lock the form", async ({
    page,
    api,
    rememberSubmission,
  }) => {
    const created = await api.createEvent({ name: "Stale Cookie Event" })
    // This attendee id was never actually created on this event.
    await rememberSubmission(
      created.id,
      "99999999-9999-9999-9999-999999999999",
      "88888888-8888-8888-8888-888888888888"
    )

    await page.goto(`/${created.id}`)
    await expect(page.getByText("Stale Cookie Event")).toBeVisible()

    await expect(
      page.getByRole("button", { name: "Submit My Availability" })
    ).toBeVisible()
    await expect(page.getByPlaceholder("Your name")).toBeEnabled()
  })
})
