/**
 * Test credentials helper
 * Reads credentials from environment variables for e2e tests
 */

export function getTestCredentials() {
  const email = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  const userId = process.env.E2E_USERNAME_ID;

  if (!email || !password) {
    throw new Error(
      'E2E test credentials not found. Please set E2E_USERNAME and E2E_PASSWORD in your .env file.'
    );
  }

  return {
    email,
    password,
    userId: userId || undefined,
  };
}
