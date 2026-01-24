import { Page, Locator } from "@playwright/test";

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
  }

  async signIn(email: string, password: string) {
    // Clear and fill email, then trigger blur to ensure validation runs
    await this.emailInput.clear();
    await this.emailInput.fill(email);
    await this.emailInput.blur();

    // Clear and fill password, then trigger blur
    await this.passwordInput.clear();
    await this.passwordInput.fill(password);
    await this.passwordInput.blur();

    // Wait for form validation to complete and button to be enabled
    // The form validates email format and requires both fields to be valid
    // Wait for the button to become enabled (check every 100ms, timeout after 5s)
    await this.submitButton.waitFor({
      state: "visible",
      timeout: 5000,
    });

    // Wait for button to be enabled by checking its disabled attribute
    await this.page.waitForFunction(
      (buttonSelector) => {
        const button = document.querySelector(buttonSelector) as HTMLButtonElement;
        return button && !button.disabled;
      },
      'button[type="submit"]',
      { timeout: 5000 }
    );

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
