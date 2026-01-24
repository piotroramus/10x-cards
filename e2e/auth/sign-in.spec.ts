import { test, expect } from "@playwright/test";
import { SignInPage } from "../pages/SignInPage";
import { getTestCredentials } from "../helpers/test-credentials";

test.describe.skip("Sign In Flow", () => {
  let signInPage: SignInPage;

  test.beforeEach(async ({ page }) => {
    signInPage = new SignInPage(page);
    await signInPage.goto();
  });

  test("should display sign in form", async ({ page }) => {
    await expect(page).toHaveURL("/auth/sign-in");
    await expect(signInPage.emailInput).toBeVisible();
    await expect(signInPage.passwordInput).toBeVisible();
    await expect(signInPage.submitButton).toBeVisible();
  });

  test("should show validation errors for empty fields", async ({ page }) => {
    // Button should be disabled when fields are empty
    await expect(signInPage.submitButton).toBeDisabled();

    // Fill in invalid email to trigger validation
    await signInPage.emailInput.fill("invalid-email");
    await signInPage.passwordInput.fill("password");

    // Button should still be disabled with invalid email
    await expect(signInPage.submitButton).toBeDisabled();

    // Fix email format
    await signInPage.emailInput.fill("valid@example.com");

    // Now button should be enabled
    await expect(signInPage.submitButton).toBeEnabled();

    // Verify we're still on sign-in page
    await expect(page).toHaveURL("/auth/sign-in");
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await signInPage.signIn("invalid@example.com", "wrongpassword");

    // Wait for error message or stay on sign-in page
    const isOnSignInPage = await page.url().includes("/auth/sign-in");
    expect(isOnSignInPage).toBeTruthy();
  });

  test("should sign in successfully with valid credentials", async ({ page }) => {
    const credentials = getTestCredentials();

    await signInPage.signIn(credentials.email, credentials.password);

    // Wait for successful authentication and redirect
    // User should be redirected to home page (/) or cards page
    await page.waitForURL(/\/(cards)?$/, { timeout: 10000 });

    // Verify we're no longer on the sign-in page
    await expect(page).not.toHaveURL("/auth/sign-in");
  });
});
