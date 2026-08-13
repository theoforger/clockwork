import { test, expect } from "../fixtures/base"

test.describe("Theme toggle", () => {
  test("switching to Dark applies the dark class and persists across a reload", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(page.locator("html")).not.toHaveClass(/dark/)

    await page.getByRole("button", { name: "Toggle theme" }).click()
    await page.getByRole("menuitem", { name: "Dark" }).click()
    await expect(page.locator("html")).toHaveClass(/dark/)

    await page.reload()
    await expect(page.locator("html")).toHaveClass(/dark/)
  })

  test("switching to Light removes the dark class", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Toggle theme" }).click()
    await page.getByRole("menuitem", { name: "Dark" }).click()
    await expect(page.locator("html")).toHaveClass(/dark/)

    await page.getByRole("button", { name: "Toggle theme" }).click()
    await page.getByRole("menuitem", { name: "Light" }).click()
    await expect(page.locator("html")).not.toHaveClass(/dark/)
  })

  test("switching to System follows the emulated (light) OS preference", async ({
    page,
  }) => {
    // playwright.config.ts pins use.colorScheme to "light".
    await page.goto("/")
    await page.getByRole("button", { name: "Toggle theme" }).click()
    await page.getByRole("menuitem", { name: "Dark" }).click()
    await expect(page.locator("html")).toHaveClass(/dark/)

    await page.getByRole("button", { name: "Toggle theme" }).click()
    await page.getByRole("menuitem", { name: "System" }).click()
    await expect(page.locator("html")).not.toHaveClass(/dark/)
  })

  test("the toggle is available from the create-event page, the schedule page, and the 404 page", async ({
    page,
    api,
  }) => {
    await page.goto("/")
    await expect(
      page.getByRole("button", { name: "Toggle theme" })
    ).toBeVisible()

    const created = await api.createEvent({ name: "Theme Everywhere Event" })
    await page.goto(`/${created.id}`)
    await expect(page.getByText("Theme Everywhere Event")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Toggle theme" })
    ).toBeVisible()

    await page.goto("/00000000-0000-0000-0000-000000000000")
    await expect(page.getByText("404 - Page Not Found")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Toggle theme" })
    ).toBeVisible()
  })
})
