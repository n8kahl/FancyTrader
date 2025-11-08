import { test, expect } from "@playwright/test";

test.describe("Fancy Trader happy path", () => {
  test("enables mock data, manages watchlist, and renders trades", async ({ page }) => {
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      const jsonHeaders = { "content-type": "application/json" };

      if (url.includes("/api/watchlist") && method === "GET") {
        return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify({ watchlist: [] }) });
      }

      if (url.endsWith("/api/watchlist") && method === "POST") {
        return route.fulfill({
          status: 200,
          headers: jsonHeaders,
          body: JSON.stringify({ ok: true, item: { symbol: "TEST" } }),
        });
      }

      if (url.includes("/api/watchlist/") && method === "DELETE") {
        return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify({ ok: true }) });
      }

      if (url.includes("/api/setups")) {
        return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify({ setups: [] }) });
      }

      return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify({ ok: true }) });
    });

    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Fancy Trader/i })).toBeVisible();

    const mockToggle = page.getByRole("button", { name: /mock/i });
    await mockToggle.click();
    await expect(page.getByRole("button", { name: /go live/i })).toBeVisible();

    await page.getByRole("button", { name: /watchlist/i }).click();
    const watchlistDialog = page.getByRole("dialog", { name: /watchlist manager/i });
    await expect(watchlistDialog).toBeVisible();

    await page.getByTestId("watchlist-symbol-input").fill("TEST");
    await page.getByTestId("watchlist-add-button").click();
    const removeTestButton = watchlistDialog.getByRole("button", { name: /remove TEST/i });
    await expect(removeTestButton).toBeVisible();

    await removeTestButton.click();
    await expect(watchlistDialog.getByRole("button", { name: /remove TEST/i })).toHaveCount(0);

    await watchlistDialog.getByRole("button", { name: /done/i }).click();
    await expect(page.getByText(/SPY/).first()).toBeVisible();
  });
});
