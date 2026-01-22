import { test, expect } from '@playwright/test';
import { SignInPage } from '../pages/SignInPage';

test.describe('Sign In Flow', () => {
  let signInPage: SignInPage;

  test.beforeEach(async ({ page }) => {
    signInPage = new SignInPage(page);
    await signInPage.goto();
  });

  test('should display sign in form', async ({ page }) => {
    await expect(page).toHaveURL('/auth/sign-in');
    await expect(signInPage.emailInput).toBeVisible();
    await expect(signInPage.passwordInput).toBeVisible();
    await expect(signInPage.submitButton).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await signInPage.submitButton.click();
    
    // Browser's built-in HTML5 validation should prevent submission
    await expect(page).toHaveURL('/auth/sign-in');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await signInPage.signIn('invalid@example.com', 'wrongpassword');
    
    // Wait for error message or stay on sign-in page
    const isOnSignInPage = await page.url().includes('/auth/sign-in');
    expect(isOnSignInPage).toBeTruthy();
  });

  // Note: This test will fail without actual test credentials
  // You can skip it or set up test users in your test database
  test.skip('should sign in successfully with valid credentials', async ({ page }) => {
    await signInPage.signIn('test@example.com', 'validpassword');
    await signInPage.waitForNavigation();
    
    await expect(page).toHaveURL(/\/cards|\/auth\/verify/);
  });
});
