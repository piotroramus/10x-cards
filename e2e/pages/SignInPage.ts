import { Page, Locator, expect } from "@playwright/test";

/**
 * Page Object Model for Sign In page
 * Encapsulates all interactions with the sign-in page
 */
export class SignInPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(private page: Page) {
    this.emailInput = page.locator("#signin-email");
    this.passwordInput = page.locator("#signin-password");
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[role="alert"]');
  }

  async goto() {
    await this.page.goto("/auth/sign-in");
    // Wait for React to hydrate - ensure inputs are visible and interactive
    await this.emailInput.waitFor({ state: "visible", timeout: 10000 });
    await this.passwordInput.waitFor({ state: "visible", timeout: 10000 });
    // Additional wait for event listeners to attach (handles polling mechanism)
    await this.page.waitForTimeout(300);
  }

  async signIn(email: string, password: string) {
    // Use fill() which works well with React controlled inputs
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    // Wait for form validation to complete
    await expect(this.submitButton).toBeEnabled({ timeout: 10000 });

    await this.submitButton.click();
  }

  async waitForNavigation() {
    await this.page.waitForURL(/\/cards|\/auth\/verify/);
  }

  async getErrorMessage() {
    return await this.errorMessage.textContent();
  }

  async isErrorVisible() {
    return await this.errorMessage.isVisible();
  }
}
