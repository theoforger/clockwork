import { test, expect } from "../fixtures/base"
import { slotSelector } from "../utils/time"
import { SUBMITTED_CLASS } from "../utils/colors"

test.describe("Submitting availability", () => {
  test("submitting with no name shows a toast and doesn't submit", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "No Name" })
    await page.goto(`/${created.id}`)
    await expect(page.getByText("No Name")).toBeVisible()

    await page.locator(slotSelector("2026-08-09 02:00:00")).click()
    await page.getByRole("button", { name: "🦊" }).click()
    await page
      .getByRole("button", { name: "Submit My Availability" })
      .click()

    await expect(page.getByText("Please enter your name")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Submit My Availability" })
    ).toBeVisible()
  })

  test("submitting with no emoji shows a toast and doesn't submit", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "No Emoji" })
    await page.goto(`/${created.id}`)
    await expect(page.getByText("No Emoji")).toBeVisible()

    await page.locator(slotSelector("2026-08-09 02:00:00")).click()
    await page.getByPlaceholder("Your name").fill("Alice")
    await page
      .getByRole("button", { name: "Submit My Availability" })
      .click()

    await expect(page.getByText("Please pick an emoji")).toBeVisible()
  })

  test("submitting with no slots selected shows a toast and doesn't submit", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "No Slots" })
    await page.goto(`/${created.id}`)
    await expect(page.getByText("No Slots")).toBeVisible()

    await page.getByPlaceholder("Your name").fill("Alice")
    await page.getByRole("button", { name: "🦊" }).click()
    await page
      .getByRole("button", { name: "Submit My Availability" })
      .click()

    await expect(
      page.getByText("Please select at least one time slot")
    ).toBeVisible()
  })

  test("a successful submission shows the attendee and locks the form", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Successful Submit" })
    await page.goto(`/${created.id}`)
    await expect(page.getByText("Successful Submit")).toBeVisible()

    const cell = page.locator(slotSelector("2026-08-09 02:00:00"))
    await cell.click()
    await page.getByPlaceholder("Your name").fill("Alice")
    await page.getByRole("button", { name: "🦊" }).click()
    await page.getByPlaceholder("Comment (Optional)").fill("Prefer mornings")

    await page
      .getByRole("button", { name: "Submit My Availability" })
      .click()

    await expect(page.getByText("Selection submitted!")).toBeVisible()
    await expect(page.getByText("Alice")).toBeVisible()
    await expect(cell).toHaveClass(SUBMITTED_CLASS)

    // Locked: fields disabled, Submit gone, Edit/Delete shown instead.
    await expect(page.getByPlaceholder("Your name")).toBeDisabled()
    await expect(
      page.getByRole("button", { name: "Submit My Availability" })
    ).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible()
  })
})
