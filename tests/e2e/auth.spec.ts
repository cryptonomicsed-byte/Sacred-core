import { test, expect } from '@playwright/test';

test.describe('Real auth flow (server.ts + SQLite)', () => {
  test('signup via UI -> login -> access protected routes -> logout -> blocked again', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const password = 'correcthorsebattery';

    // Exercise the real signup UI (Create Account toggle on LoginPage), not a direct API call.
    await page.goto('/#/login');
    await page.getByRole('button', { name: /Create Account/i }).click();
    await page.getByPlaceholder('Jane Operative').fill('E2E User');
    await page.getByPlaceholder('agent@company.com').fill(email);
    await page.getByPlaceholder('At least 8 characters').fill(password);
    await page.getByRole('button', { name: /Create Account/i }).click();

    await expect(page).toHaveURL(/\/#\/$/);
    await expect(page.locator('nav')).toBeVisible();

    // Log out and back in through the standard sign-in form to prove the account persisted.
    await page.getByRole('button', { name: /Logout/i }).click();
    await expect(page).toHaveURL(/\/#\/login$/);
    await page.waitForTimeout(500);

    await page.getByPlaceholder('agent@company.com').fill(email);
    await page.getByPlaceholder('••••••••••••').fill(password);
    await page.getByRole('button', { name: /Authorize Link/i }).click();

    await expect(page).toHaveURL(/\/#\/$/);
    await expect(page.locator('nav')).toBeVisible();

    await page.goto('/#/campaigns');
    await expect(page).toHaveURL(/\/#\/campaigns$/);

    await page.getByRole('button', { name: /Logout/i }).click();
    await expect(page).toHaveURL(/\/#\/login$/);

    // Logout is async (API call + store sync); give it a beat before the next
    // navigation so this doesn't race the in-memory auth state.
    await page.waitForTimeout(500);
    await page.goto('/#/campaigns');
    await expect(page).toHaveURL(/\/#\/login$/);

    expect(pageErrors).toEqual([]);
  });

  test('duplicate signup via UI shows an error instead of silently succeeding', async ({ page }) => {
    const email = `e2e-dup-${Date.now()}@example.com`;
    const password = 'correcthorsebattery';

    const signUp = async () => {
      await page.goto('/#/login');
      await page.getByRole('button', { name: /Create Account/i }).click();
      await page.getByPlaceholder('agent@company.com').fill(email);
      await page.getByPlaceholder('At least 8 characters').fill(password);
      await page.getByRole('button', { name: /Create Account/i }).click();
    };

    await signUp();
    await expect(page).toHaveURL(/\/#\/$/);

    await page.getByRole('button', { name: /Logout/i }).click();
    await expect(page).toHaveURL(/\/#\/login$/);
    await page.waitForTimeout(500);

    await signUp();
    await expect(page.getByRole('alert')).toContainText(/already exists/i);
  });
});
