# Testing Guide

This project uses **Vitest** for unit and integration tests, and **Playwright** for end-to-end (e2e) tests.

## Unit & Integration Tests (Vitest)

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

Tests should be placed next to the code they test with a `.test.ts` or `.spec.ts` suffix:

```
src/
  lib/
    validations/
      cards.ts
      cards.test.ts  ← Test file here
```

### Example Unit Test

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myFunction';

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Testing React Components

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render successfully', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});
```

### Mocking

```typescript
import { vi } from 'vitest';

// Mock a function
const mockFn = vi.fn();

// Mock a module
vi.mock('./myModule', () => ({
  myFunction: vi.fn(() => 'mocked value'),
}));

// Spy on existing function
const spy = vi.spyOn(object, 'method');
```

## E2E Tests (Playwright)

### Running E2E Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run e2e tests with UI mode
npm run test:e2e:ui

# Run e2e tests in debug mode
npm run test:e2e:debug

# Generate test code by recording actions
npm run test:e2e:codegen
```

### Writing E2E Tests

E2E tests are located in the `e2e/` directory:

```
e2e/
  auth/
    sign-in.spec.ts
    sign-up.spec.ts
  cards/
    create-card.spec.ts
```

### Example E2E Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test('should sign in successfully', async ({ page }) => {
    await page.goto('/auth/sign-in');
    
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/cards');
  });
});
```

### Page Object Model

For better maintainability, use the Page Object Model:

```typescript
// e2e/pages/SignInPage.ts
import { Page } from '@playwright/test';

export class SignInPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/auth/sign-in');
  }

  async signIn(email: string, password: string) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }
}

// Usage in test
import { SignInPage } from './pages/SignInPage';

test('sign in', async ({ page }) => {
  const signInPage = new SignInPage(page);
  await signInPage.goto();
  await signInPage.signIn('user@example.com', 'password123');
  await expect(page).toHaveURL('/cards');
});
```

## Configuration

### Vitest Configuration

The Vitest configuration is in `vitest.config.ts`:

- **Environment**: jsdom (for DOM testing)
- **Setup file**: `test/setup.ts` (global mocks and matchers)
- **Coverage**: v8 provider with HTML/JSON/text reports
- **Test location**: `src/**/*.{test,spec}.{ts,tsx}`

### Playwright Configuration

The Playwright configuration is in `playwright.config.ts`:

- **Browser**: Chromium (Desktop Chrome)
- **Base URL**: http://localhost:4321
- **Test location**: `e2e/**/*.spec.ts`
- **Features**: Screenshots on failure, traces on retry

## CI/CD Integration

Both test suites are designed to run in CI environments:

```yaml
# Example GitHub Actions workflow
- name: Run unit tests
  run: npm test

- name: Run e2e tests
  run: npm run test:e2e
```

## Best Practices

1. **Test naming**: Use descriptive test names that explain what is being tested
2. **Arrange-Act-Assert**: Structure tests clearly with setup, action, and verification
3. **Avoid test interdependencies**: Each test should be independent
4. **Use meaningful assertions**: Prefer specific matchers over generic equality checks
5. **Mock external dependencies**: Keep tests fast and predictable
6. **Test user behavior**: Focus on testing what users do, not implementation details
7. **Keep tests maintainable**: Use helper functions and page objects to reduce duplication

## Debugging

### Vitest

- Use `test.only()` to run a single test
- Use `test.skip()` to temporarily skip a test
- Add `debugger` statements and run with `--inspect-brk`
- Use the Vitest UI for visual debugging: `npm run test:ui`

### Playwright

- Use `--debug` flag to step through tests
- Use `page.pause()` to pause execution
- Use `--ui` flag for visual debugging
- View traces in the HTML report after test failures

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
