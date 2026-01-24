import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for My Cards page
 * Encapsulates all interactions with the cards list
 */
export class CardsPage {
  readonly pageTitle: Locator;
  readonly cardsList: Locator;
  readonly emptyState: Locator;
  readonly backToGenerateLink: Locator;
  readonly totalCount: Locator;

  constructor(private page: Page) {
    this.pageTitle = page.locator("h1", { hasText: "My Cards" });
    this.cardsList = page.locator(".rounded-lg.border.bg-card");
    this.emptyState = page.locator("text=No cards yet");
    this.backToGenerateLink = page.locator('a[href="/"]');
    this.totalCount = page.locator("text=/\\d+ cards? total/");
  }

  async goto() {
    await this.page.goto("/cards");
    // Wait for React to hydrate - ensure page title is visible
    await this.pageTitle.waitFor({ state: "visible", timeout: 10000 });
    // Additional wait for event listeners to attach
    await this.page.waitForTimeout(300);
  }

  async waitForCardsToLoad() {
    // Wait for either cards or empty state to appear
    await this.page.waitForSelector('h1:has-text("My Cards")', { timeout: 5000 });
    // Wait a moment for the data to load
    await this.page.waitForTimeout(1000);
  }

  async getCardCount() {
    return await this.cardsList.count();
  }

  async getCardByIndex(index: number) {
    return this.cardsList.nth(index);
  }

  async getCardOriginBadge(cardIndex: number) {
    const card = await this.getCardByIndex(cardIndex);
    const badge = card.locator("span", { hasText: /^(AI|Manual)$/ });
    return await badge.textContent();
  }

  async getCardFrontText(cardIndex: number) {
    const card = await this.getCardByIndex(cardIndex);
    // Find the front text (p element with text-base font-medium class)
    const frontText = card.locator("p.text-base.font-medium").first();
    return await frontText.textContent();
  }

  async expandCard(cardIndex: number) {
    const card = await this.getCardByIndex(cardIndex);
    const expandButton = card.locator("button", { hasText: "Show answer" });
    await expandButton.click();
  }

  async getCardBackText(cardIndex: number) {
    const card = await this.getCardByIndex(cardIndex);
    // The back text appears after expanding in the muted background section
    const backText = card.locator(".bg-muted\\/50 p.text-sm");
    return await backText.textContent();
  }

  async hasCard(frontText: string) {
    const card = this.page.locator(".rounded-lg.border.bg-card", {
      has: this.page.locator(`text="${frontText}"`),
    });
    return await card.isVisible();
  }

  async getTotalCount() {
    const countText = await this.totalCount.textContent();
    const match = countText?.match(/(\d+) cards? total/);
    return match ? parseInt(match[1]) : 0;
  }
}
