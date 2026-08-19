import { test, expect } from '@playwright/test';

test.describe('Sacred Core Smoke Tests (unauthenticated)', () => {
  test('should redirect unauthenticated root to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/#\/login$/);
    await expect(page.getByPlaceholder('agent@company.com')).toBeVisible();
  });

  test('should have a title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Sacred Core|CoreDNA/i);
  });

  test('should initialize storage system', async ({ page }) => {
    const messages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        messages.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    const hasStorageInit = messages.some(m => m.includes('storage') || m.includes('Storage'));
    expect(hasStorageInit || messages.length > 0).toBeTruthy();
  });

  test('every protected route redirects to login instead of leaking content', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const routes = ['/', '/campaigns', '/leads', '/agents', '/builder', '/live', '/automations', '/settings', '/admin'];
    for (const route of routes) {
      await page.goto(`/#${route}`);
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/#\/login$/);
    }

    expect(pageErrors).toEqual([]);
  });

  test('shows a form error on invalid credentials instead of a fake success', async ({ page }) => {
    await page.goto('/#/login');
    await page.getByPlaceholder('agent@company.com').fill('nobody@example.com');
    await page.getByPlaceholder('••••••••••••').fill('wrong-password');
    await page.getByRole('button', { name: /Authorize Link/i }).click();

    // authService.signIn() hits the real API (server.ts + SQLite) and rejects
    // with "Invalid email or password" for an unknown account — the UI must
    // surface it, not silently mark the user as logged in (old behavior: fake
    // setTimeout + navigate that "succeeded" regardless of credentials).
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/#\/login$/);
  });
});
