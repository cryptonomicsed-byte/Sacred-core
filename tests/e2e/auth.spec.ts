import { test, expect } from '@playwright/test';

test.describe('Real auth flow (server.ts + SQLite)', () => {
  test('signup -> login -> access protected routes -> logout -> blocked again', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // No signup UI exists yet (LoginPage only has a login form), so the account
    // is created directly against the real API, then the actual login UI is
    // exercised end-to-end.
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const password = 'correcthorsebattery';
    const signupRes = await page.request.post('http://localhost:4000/api/auth/signup', {
      data: { email, password, name: 'E2E User' }
    });
    expect(signupRes.ok()).toBeTruthy();

    await page.goto('/#/login');
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

  test('duplicate signup is rejected', async ({ page }) => {
    const email = `e2e-dup-${Date.now()}@example.com`;
    const first = await page.request.post('http://localhost:4000/api/auth/signup', {
      data: { email, password: 'correcthorsebattery' }
    });
    expect(first.ok()).toBeTruthy();

    const second = await page.request.post('http://localhost:4000/api/auth/signup', {
      data: { email, password: 'correcthorsebattery' }
    });
    expect(second.status()).toBe(409);
  });
});
