import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should redirect unauthenticated users to sign-in', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to sign-in page
    await expect(page).toHaveURL(/\/auth\/sign-in/);
    await expect(page).toHaveTitle(/Sign in/i);
  });

  test('should display sign-in form for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    
    // Should show sign-in form after redirect
    await expect(page).toHaveURL(/\/auth\/sign-in/);
    const heading = page.locator('h1', { hasText: 'Sign in' });
    await expect(heading).toBeVisible();
  });
});
