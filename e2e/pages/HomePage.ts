import { Page, Locator, expect } from "@playwright/test";

/**
 * Page Object Model for Home/Generate page
 * Encapsulates all interactions with the AI generation flow and manual card creation
 */
export class HomePage {
  readonly textInput: Locator;
  readonly generateButton: Locator;
  readonly characterCounter: Locator;
  readonly proposalsList: Locator;
  readonly loadingState: Locator;
  readonly errorBanner: Locator;
  // Manual card form locators
  readonly manualFormToggle: Locator;
  readonly manualFrontInput: Locator;
  readonly manualBackInput: Locator;
  readonly manualSaveButton: Locator;
  readonly manualFrontCounter: Locator;
  readonly manualBackCounter: Locator;

  constructor(private page: Page) {
    this.textInput = page.locator("#text-input");
    // Use aria-label to avoid matching dev tools or other buttons with "Generate" text
    this.generateButton = page.getByRole("button", { name: "Generate card proposals" });
    // Scope character counter to text input container to avoid matching Front/Back counters
    this.characterCounter = page.locator("#text-input").locator("..").locator("text=/\\d+ \\/ \\d+/");
    this.proposalsList = page.locator('[role="list"][aria-label="Card proposals"]');
    this.loadingState = page.locator("text=Generating...");
    this.errorBanner = page.locator('[role="alert"]');

    // Manual card form locators
    this.manualFormToggle = page.locator("button").filter({ hasText: "Create Card Manually" });
    this.manualFrontInput = page.locator("#manual-front");
    this.manualBackInput = page.locator("#manual-back");
    this.manualSaveButton = page.locator('button[type="submit"]', { hasText: "Save Card" });
    // Scope counters to manual form to avoid matching other counters
    this.manualFrontCounter = page.locator("#manual-front").locator("..").locator("text=/\\d+ \\/ \\d+/").first();
    this.manualBackCounter = page.locator("#manual-back").locator("..").locator("text=/\\d+ \\/ \\d+/").first();
  }

  async goto() {
    await this.page.goto("/");
    // Wait for React to hydrate - ensure key elements are visible and interactive
    await this.textInput.waitFor({ state: "visible", timeout: 10000 });
    await this.generateButton.waitFor({ state: "visible", timeout: 10000 });
    // Additional wait for event listeners to attach
    // Increased for CI reliability (slower than local environment)
    await this.page.waitForTimeout(500);
  }

  async pasteText(text: string) {
    // Clear the textarea first
    await this.textInput.clear();
    // Use fill() which should trigger React's onChange properly
    await this.textInput.fill(text);
    // Wait for React to process the change
    await this.page.waitForTimeout(500);
    // Verify the value was set
    await expect(this.textInput).toHaveValue(text, { timeout: 5000 });
  }

  async clickGenerate() {
    // Wait for the generate button to be enabled before clicking
    // The button is disabled when text is empty, too long, user is not authenticated, or generation is in progress
    await expect(this.generateButton).toBeEnabled({ timeout: 10000 });
    await this.generateButton.click();
  }

  async waitForProposals(timeout = 15000) {
    // Wait for loading state to appear
    await this.loadingState.waitFor({ state: "visible", timeout: 5000 });
    // Wait for loading state to disappear
    await this.loadingState.waitFor({ state: "hidden", timeout });
    // Wait for proposals to be visible
    await this.proposalsList.waitFor({ state: "visible", timeout: 5000 });
  }

  async getProposalCount() {
    const proposals = await this.page.locator('[role="listitem"]').count();
    return proposals;
  }

  async acceptFirstProposal() {
    // Find the first proposal and click its Accept button
    const firstProposal = this.page.locator('[role="listitem"]').first();
    const acceptButton = firstProposal.locator("button", { hasText: "Accept" });
    await acceptButton.click();
  }

  async waitForToast(message: string) {
    const toast = this.page.locator('[role="status"]', { hasText: message });
    await toast.waitFor({ state: "visible", timeout: 5000 });
  }

  async getCharacterCount() {
    const counterText = await this.characterCounter.textContent();
    const match = counterText?.match(/(\d+) \/ \d+/);
    return match ? parseInt(match[1]) : 0;
  }

  async isGenerateButtonDisabled() {
    return await this.generateButton.isDisabled();
  }

  // Manual card form methods
  async expandManualForm() {
    const isExpanded = await this.manualFormToggle.getAttribute("aria-expanded");
    if (isExpanded === "false") {
      await this.manualFormToggle.click();
    }
    // Wait for form to be visible
    await this.manualFrontInput.waitFor({ state: "visible", timeout: 2000 });
  }

  async fillManualCard(front: string, back: string) {
    await this.expandManualForm();
    await this.manualFrontInput.clear();
    await this.manualFrontInput.fill(front);
    await this.manualBackInput.clear();
    await this.manualBackInput.fill(back);
    // Wait for React to propagate changes to button state
    await this.page.waitForTimeout(500);
  }

  async saveManualCard() {
    await this.manualSaveButton.click();
  }

  async getManualFrontCount() {
    const counterText = await this.manualFrontCounter.textContent();
    const match = counterText?.match(/(\d+) \/ \d+/);
    return match ? parseInt(match[1]) : 0;
  }

  async getManualBackCount() {
    const counterText = await this.manualBackCounter.textContent();
    const match = counterText?.match(/(\d+) \/ \d+/);
    return match ? parseInt(match[1]) : 0;
  }

  async isManualSaveButtonDisabled() {
    return await this.manualSaveButton.isDisabled();
  }

  async getManualFrontError() {
    const error = this.page.locator("#manual-front-error");
    if (await error.isVisible()) {
      return await error.textContent();
    }
    return null;
  }

  async getManualBackError() {
    const error = this.page.locator("#manual-back-error");
    if (await error.isVisible()) {
      return await error.textContent();
    }
    return null;
  }
}
