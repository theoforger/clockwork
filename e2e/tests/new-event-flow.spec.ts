import { test, expect } from "../fixtures/base"

test.describe("New event flow", () => {
  test("clicking New Event opens a confirmation dialog", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Confirm Dialog Event" })
    await page.goto(`/${created.id}`)
    await expect(page.getByText("Confirm Dialog Event")).toBeVisible()

    await page.getByRole("button", { name: "New Event" }).click()
    await expect(page.getByText("Start a new event?")).toBeVisible()
    await expect(
      page.getByText(/Make sure you've saved this event's URL/)
    ).toBeVisible()
  })

  test("Cancel closes the dialog and stays on the event", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Cancel Dialog Event" })
    await page.goto(`/${created.id}`)
    await expect(page.getByText("Cancel Dialog Event")).toBeVisible()

    await page.getByRole("button", { name: "New Event" }).click()
    await page.getByRole("button", { name: "Cancel" }).click()

    await expect(page.getByText("Start a new event?")).toHaveCount(0)
    await expect(page).toHaveURL(`/${created.id}`)
    await expect(page.getByText("Cancel Dialog Event")).toBeVisible()
  })

  test("confirming clears the last-event cookie and returns to the create form", async ({
    page,
    api,
  }) => {
    const created = await api.createEvent({ name: "Confirmed New Event" })
    await page.goto(`/${created.id}`)
    await expect(page.getByText("Confirmed New Event")).toBeVisible()

    await page.getByRole("button", { name: "New Event" }).click()
    await page
      .getByRole("button", { name: "I've saved it, continue" })
      .click()

    await expect(page).toHaveURL("/")
    await expect(page.getByText("Create an event")).toBeVisible()

    // Not just a one-time render: revisiting "/" doesn't redirect back
    // into the old event, confirming the cookie was actually cleared.
    await page.goto("/")
    await expect(page).toHaveURL("/")
    await expect(page.getByText("Create an event")).toBeVisible()
  })
})
