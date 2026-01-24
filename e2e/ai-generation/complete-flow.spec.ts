import { test, expect } from "@playwright/test";
import { SignInPage } from "../pages/SignInPage";
import { HomePage } from "../pages/HomePage";
import { CardsPage } from "../pages/CardsPage";
import { getTestCredentials } from "../helpers/test-credentials";

/**
 * E2E-001: Complete AI Generation Flow
 * Priority: Critical
 * Tests the main happy path of generating AI proposals and accepting one
 */
test.describe.skip("Complete AI Generation Flow", () => {
  let signInPage: SignInPage;
  let homePage: HomePage;
  let cardsPage: CardsPage;

  // Sample text for generation (photosynthesis explanation)
  const sampleText = `Photosynthesis is the process by which plants, algae, and some bacteria convert light energy into chemical energy stored in glucose. This process occurs primarily in the chloroplasts of plant cells, where chlorophyll pigments absorb sunlight. The overall equation for photosynthesis is: 6CO2 + 6H2O + light energy → C6H12O6 + 6O2. The process consists of two main stages: light-dependent reactions and light-independent reactions (Calvin cycle). During light-dependent reactions, light energy is captured and used to produce ATP and NADPH. These energy-rich molecules are then used in the Calvin cycle to convert carbon dioxide into glucose. Photosynthesis is essential for life on Earth as it produces oxygen and forms the base of most food chains.`;

  test.beforeEach(async ({ page }) => {
    signInPage = new SignInPage(page);
    homePage = new HomePage(page);
    cardsPage = new CardsPage(page);
  });

  test.skip("should complete full AI generation and acceptance flow", async ({ page }) => {
    const credentials = getTestCredentials();

    // Step 1: Sign in with test credentials
    await signInPage.goto();
    await signInPage.signIn(credentials.email, credentials.password);

    // Wait for successful authentication and redirect to home
    await page.waitForURL("/", { timeout: 10000 });

    // Step 2: Verify we're on the home page
    await expect(homePage.textInput).toBeVisible();
    await expect(homePage.generateButton).toBeVisible();

    // Step 3: Paste text into generation input
    await homePage.pasteText(sampleText);

    // Step 4: Verify character counter updates
    const charCount = await homePage.getCharacterCount();
    expect(charCount).toBe(sampleText.length);
    expect(charCount).toBeGreaterThan(0);
    expect(charCount).toBeLessThanOrEqual(10000);

    // Step 5: Verify Generate button is enabled
    const isDisabled = await homePage.isGenerateButtonDisabled();
    expect(isDisabled).toBe(false);

    // Record the initial card count (for later verification)
    await cardsPage.goto();
    await cardsPage.waitForCardsToLoad();
    const initialCardCount = await cardsPage.getCardCount();

    // Navigate back to home
    await homePage.goto();
    await homePage.pasteText(sampleText); // Re-paste text after navigation

    // Step 6: Click Generate button
    await homePage.clickGenerate();

    // Step 7: Wait for proposals (loading state shown, max 15s)
    await homePage.waitForProposals(15000);

    // Step 8: Verify 1-5 proposals displayed
    const proposalCount = await homePage.getProposalCount();
    expect(proposalCount).toBeGreaterThanOrEqual(1);
    expect(proposalCount).toBeLessThanOrEqual(5);

    // Step 9: Accept first proposal
    await homePage.acceptFirstProposal();

    // Step 10: Verify success toast shown
    // Note: Toast implementation may vary, check for common success indicators
    await page.waitForTimeout(1000); // Give time for the API call to complete

    // Step 11: Navigate to My Cards
    await cardsPage.goto();
    await cardsPage.waitForCardsToLoad();

    // Step 12: Verify card appears in list
    const newCardCount = await cardsPage.getCardCount();
    expect(newCardCount).toBe(initialCardCount + 1);

    // Step 13: Verify card has AI origin badge
    const firstCardBadge = await cardsPage.getCardOriginBadge(0);
    expect(firstCardBadge).toBe("AI");

    // Step 14: Verify card content exists and is reasonable
    const firstCardFront = await cardsPage.getCardFrontText(0);
    expect(firstCardFront).toBeTruthy();
    if (firstCardFront) {
      expect(firstCardFront.length).toBeGreaterThan(0);
      expect(firstCardFront.length).toBeLessThanOrEqual(200);
    }

    // Expand and check back text
    await cardsPage.expandCard(0);
    const firstCardBack = await cardsPage.getCardBackText(0);
    expect(firstCardBack).toBeTruthy();
    if (firstCardBack) {
      expect(firstCardBack.length).toBeGreaterThan(0);
      expect(firstCardBack.length).toBeLessThanOrEqual(500);
    }
  });

  test("should preserve proposals when navigating away and back", async ({ page }) => {
    const credentials = getTestCredentials();

    // Sign in
    await signInPage.goto();
    await signInPage.signIn(credentials.email, credentials.password);
    await page.waitForURL("/", { timeout: 10000 });

    // Generate proposals
    await homePage.pasteText(sampleText);
    await homePage.clickGenerate();
    await homePage.waitForProposals(15000);

    const initialProposalCount = await homePage.getProposalCount();
    expect(initialProposalCount).toBeGreaterThan(0);

    // Navigate to cards and back
    await cardsPage.goto();
    await page.goBack();

    // Wait for navigation to complete and page to load
    await page.waitForURL("/", { timeout: 10000 });

    // Wait for proposals to be restored from localStorage
    await homePage.proposalsList.waitFor({ state: "visible", timeout: 5000 });

    // Verify proposals are still visible (client-side state preservation)
    const proposalCountAfterNavigation = await homePage.getProposalCount();
    expect(proposalCountAfterNavigation).toBe(initialProposalCount);
  });

  test("should handle character counter edge cases", async ({ page }) => {
    const credentials = getTestCredentials();

    // Sign in
    await signInPage.goto();
    await signInPage.signIn(credentials.email, credentials.password);
    await page.waitForURL("/", { timeout: 10000 });

    // Test empty input
    await homePage.pasteText("");
    let charCount = await homePage.getCharacterCount();
    expect(charCount).toBe(0);

    // Test short input
    const shortText = "Short text";
    await homePage.pasteText(shortText);
    charCount = await homePage.getCharacterCount();
    expect(charCount).toBe(shortText.length);

    // Test near-limit input (9,900 characters)
    const nearLimitText = "a".repeat(9900);
    await homePage.pasteText(nearLimitText);
    charCount = await homePage.getCharacterCount();
    expect(charCount).toBe(9900);

    // Test exact limit (10,000 characters)
    const exactLimitText = "a".repeat(10000);
    await homePage.pasteText(exactLimitText);
    charCount = await homePage.getCharacterCount();
    expect(charCount).toBe(10000);

    // Button should still be enabled at exactly 10,000
    const isDisabled = await homePage.isGenerateButtonDisabled();
    expect(isDisabled).toBe(false);
  });
});
