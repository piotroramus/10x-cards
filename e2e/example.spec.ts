import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check if the page loads
    await expect(page).toHaveTitle(/10x Cards/i);
  });

  test('should display welcome message for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    
    // Add assertions based on your actual homepage content
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});
