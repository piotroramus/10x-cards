import { test, expect } from "@playwright/test";
import { SignInPage } from "../pages/SignInPage";
import { HomePage } from "../pages/HomePage";
import { CardsPage } from "../pages/CardsPage";
import { getTestCredentials } from "../helpers/test-credentials";

/**
 * E2E Test: Manual Card Creation Flow
 * Priority: High
 * Tests the complete flow of manually creating a card without AI generation
 */
test.describe("Manual Card Creation", () => {
  let signInPage: SignInPage;
  let homePage: HomePage;
  let cardsPage: CardsPage;

  test.beforeEach(async ({ page }) => {
    signInPage = new SignInPage(page);
    homePage = new HomePage(page);
    cardsPage = new CardsPage(page);
  });

  test("should create a card manually and verify it appears in My Cards", async ({ page }) => {
    const credentials = getTestCredentials();

    // Step 1: Sign in
    await signInPage.goto();
    await signInPage.signIn(credentials.email, credentials.password);
    await page.waitForURL("/", { timeout: 10000 });

    // Step 2: Verify we're on the home page
    await expect(homePage.textInput).toBeVisible();

    // Step 3: Record initial card count
    await cardsPage.goto();
    await cardsPage.waitForCardsToLoad();
    const initialCardCount = await cardsPage.getCardCount();

    // Step 4: Navigate back to home and expand manual form
    await homePage.goto();
    await homePage.expandManualForm();

    // Step 5: Verify form is visible and Save button is disabled (empty form)
    await expect(homePage.manualFrontInput).toBeVisible();
    await expect(homePage.manualBackInput).toBeVisible();
    const isDisabledInitially = await homePage.isManualSaveButtonDisabled();
    expect(isDisabledInitially).toBe(true);

    // Step 6: Fill in front text
    const frontText = "What is photosynthesis?";
    await homePage.manualFrontInput.fill(frontText);

    // Step 7: Verify front character counter updates
    const frontCount = await homePage.getManualFrontCount();
    expect(frontCount).toBe(frontText.length);
    expect(frontCount).toBeLessThanOrEqual(200);

    // Step 8: Fill in back text
    const backText =
      "Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose.";
    await homePage.manualBackInput.fill(backText);

    // Step 9: Verify back character counter updates
    const backCount = await homePage.getManualBackCount();
    expect(backCount).toBe(backText.length);
    expect(backCount).toBeLessThanOrEqual(500);

    // Step 10: Verify Save button is now enabled
    const isDisabledAfterFill = await homePage.isManualSaveButtonDisabled();
    expect(isDisabledAfterFill).toBe(false);

    // Step 11: Save the card
    await homePage.saveManualCard();

    // Step 12: Wait for API call to complete
    await page.waitForTimeout(1000);

    // Step 13: Verify form is reset (empty)
    const frontValue = await homePage.manualFrontInput.inputValue();
    const backValue = await homePage.manualBackInput.inputValue();
    expect(frontValue).toBe("");
    expect(backValue).toBe("");

    // Step 14: Navigate to My Cards
    await cardsPage.goto();
    await cardsPage.waitForCardsToLoad();

    // Step 15: Verify card count increased
    const newCardCount = await cardsPage.getCardCount();
    expect(newCardCount).toBe(initialCardCount + 1);

    // Step 16: Verify card has Manual origin badge
    const firstCardBadge = await cardsPage.getCardOriginBadge(0);
    expect(firstCardBadge).toBe("Manual");

    // Step 17: Verify card content matches what we entered
    const firstCardFront = await cardsPage.getCardFrontText(0);
    expect(firstCardFront).toBe(frontText);

    // Step 18: Expand card and verify back text
    await cardsPage.expandCard(0);
    const firstCardBack = await cardsPage.getCardBackText(0);
    expect(firstCardBack).toBe(backText);
  });

  test("should validate character limits for manual card form", async ({ page }) => {
    const credentials = getTestCredentials();

    // Sign in
    await signInPage.goto();
    await signInPage.signIn(credentials.email, credentials.password);
    await page.waitForURL("/", { timeout: 10000 });

    await homePage.goto();
    await homePage.expandManualForm();

    // Test front character limit (200)
    const frontAtLimit = "a".repeat(200);
    await homePage.manualFrontInput.fill(frontAtLimit);
    let frontCount = await homePage.getManualFrontCount();
    expect(frontCount).toBe(200);

    // Try to exceed limit - should be capped
    await homePage.manualFrontInput.fill("a".repeat(201));
    frontCount = await homePage.getManualFrontCount();
    expect(frontCount).toBe(200); // Should be capped at max

    // Test back character limit (500)
    const backAtLimit = "b".repeat(500);
    await homePage.manualBackInput.fill(backAtLimit);
    let backCount = await homePage.getManualBackCount();
    expect(backCount).toBe(500);

    // Try to exceed limit - should be capped
    await homePage.manualBackInput.fill("b".repeat(501));
    backCount = await homePage.getManualBackCount();
    expect(backCount).toBe(500); // Should be capped at max
  });

  test("should show validation errors for empty fields", async ({ page }) => {
    const credentials = getTestCredentials();

    // Sign in
    await signInPage.goto();
    await signInPage.signIn(credentials.email, credentials.password);
    await page.waitForURL("/", { timeout: 10000 });

    await homePage.goto();
    await homePage.expandManualForm();

    // Initially, both fields are empty - errors should be visible
    const frontError = await homePage.getManualFrontError();
    const backError = await homePage.getManualBackError();
    expect(frontError).toBe("Front is required");
    expect(backError).toBe("Back is required");

    // Fill front - front error should disappear
    await homePage.manualFrontInput.fill("Test front");
    const frontErrorAfter = await homePage.getManualFrontError();
    expect(frontErrorAfter).toBeNull();

    // Fill back - back error should disappear
    await homePage.manualBackInput.fill("Test back");
    const backErrorAfter = await homePage.getManualBackError();
    expect(backErrorAfter).toBeNull();

    // Clear front - error should reappear
    await homePage.manualFrontInput.fill("");
    const frontErrorCleared = await homePage.getManualFrontError();
    expect(frontErrorCleared).toBe("Front is required");
  });

  test("should disable Save button when form is invalid", async ({ page }) => {
    const credentials = getTestCredentials();

    // Sign in
    await signInPage.goto();
    await signInPage.signIn(credentials.email, credentials.password);
    await page.waitForURL("/", { timeout: 10000 });

    await homePage.goto();
    await homePage.expandManualForm();

    // Empty form - should be disabled
    let isDisabled = await homePage.isManualSaveButtonDisabled();
    expect(isDisabled).toBe(true);

    // Only front filled - should be disabled
    await homePage.manualFrontInput.fill("Front only");
    isDisabled = await homePage.isManualSaveButtonDisabled();
    expect(isDisabled).toBe(true);

    // Only back filled - should be disabled
    await homePage.manualFrontInput.fill("");
    await homePage.manualBackInput.fill("Back only");
    isDisabled = await homePage.isManualSaveButtonDisabled();
    expect(isDisabled).toBe(true);

    // Both filled - should be enabled
    await homePage.manualFrontInput.fill("Front");
    await homePage.manualBackInput.fill("Back");
    isDisabled = await homePage.isManualSaveButtonDisabled();
    expect(isDisabled).toBe(false);
  });
});
