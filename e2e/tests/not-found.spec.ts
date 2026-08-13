import { test, expect } from "../fixtures/base"

test.describe("Not found", () => {
  test("a well-formed but nonexistent event id shows the 404 page", async ({
    page,
  }) => {
    await page.goto("/00000000-0000-0000-0000-000000000000")
    await expect(page.getByText("404 - Page Not Found")).toBeVisible()
  })

  test("an unmatched route shows the 404 page", async ({ page }) => {
    await page.goto("/foo/bar")
    await expect(page.getByText("404 - Page Not Found")).toBeVisible()
  })

  test("'Back to Home' from the last-visited event's own 404 clears it, landing on the create form", async ({
    page,
    rememberLastEvent,
  }) => {
    const badId = "11111111-1111-1111-1111-111111111111"
    await rememberLastEvent(badId)

    await page.goto(`/${badId}`)
    await expect(page.getByText("404 - Page Not Found")).toBeVisible()
    await page.getByRole("button", { name: "Back to Home" }).click()

    // If the cookie hadn't been cleared, home would redirect straight
    // back into badId instead of showing the form.
    await expect(page).toHaveURL("/")
    await expect(page.getByText("Create an event")).toBeVisible()
  })

  test("'Back to Home' from an unrelated 404 still returns to the real last-visited event", async ({
    page,
    api,
    rememberLastEvent,
  }) => {
    const real = await api.createEvent({ name: "Real Last Event" })
    await rememberLastEvent(real.id)

    const badId = "22222222-2222-2222-2222-222222222222"
    await page.goto(`/${badId}`)
    await expect(page.getByText("404 - Page Not Found")).toBeVisible()
    await page.getByRole("button", { name: "Back to Home" }).click()

    await expect(page).toHaveURL(`/${real.id}`)
    await expect(page.getByText("Real Last Event")).toBeVisible()
  })
})
