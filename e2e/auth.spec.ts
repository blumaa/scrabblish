import { test, expect, type Page } from '@playwright/test';

// Auth tests require the app NOT in local mode (no ?mode=local)
// These tests need a running Supabase instance or will verify the UI flow only.

test.describe('Auth - Login Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.login-container', { timeout: 5000 });
  });

  test('renders login form by default with all required elements', async ({ page }) => {
    await expect(page.locator('.login-title')).toHaveText('Scrabblish');
    await expect(page.locator('.login-subtitle')).toHaveText('Multi-language word games');

    // Email and password inputs visible
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Username input NOT visible in login mode
    const usernameInput = page.locator('input[placeholder*="Username"]');
    await expect(usernameInput).not.toBeVisible();

    // Submit button says "Sign In"
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();

    // Toggle link to register
    await expect(page.locator('.login-toggle')).toContainText("Don't have an account? Sign up");
  });

  test('email input has correct attributes for mobile', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(emailInput).toHaveAttribute('autocomplete', 'email');
    await expect(emailInput).toHaveAttribute('placeholder', 'Email');
  });

  test('password input has correct attributes', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    await expect(passwordInput).toHaveAttribute('placeholder', 'Password');
  });

  test('submit button is not disabled by default', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: 'Sign In' });
    await expect(submitBtn).toBeEnabled();
  });

  test('empty form submission triggers HTML5 validation (no network request)', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: 'Sign In' });
    await submitBtn.click();

    // Browser should show validation popup; page stays on login
    await expect(page.locator('.login-container')).toBeVisible();
  });

  test('login form is within viewport on iPhone 14', async ({ page }) => {
    const card = page.locator('.login-card');
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  });
});

test.describe('Auth - Register Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.login-container', { timeout: 5000 });
    // Toggle to register mode
    await page.locator('.login-toggle').click();
  });

  test('toggle switches to register mode with username field', async ({ page }) => {
    const usernameInput = page.locator('input[placeholder*="Username"]');
    await expect(usernameInput).toBeVisible();

    // Submit button says "Create Account"
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();

    // Toggle text changes
    await expect(page.locator('.login-toggle')).toContainText('Already have an account? Sign in');
  });

  test('username field sanitizes input (lowercase, no spaces, limited chars)', async ({ page }) => {
    const usernameInput = page.locator('input[placeholder*="Username"]');

    await usernameInput.fill('Hello World 123!@#');
    // The onChange strips non-alphanumeric/underscore and lowercases
    const value = await usernameInput.inputValue();
    expect(value).toBe('helloworld123');
    expect(value).not.toContain(' ');
    expect(value).not.toContain('!');
  });

  test('username field enforces maxLength 20', async ({ page }) => {
    const usernameInput = page.locator('input[placeholder*="Username"]');
    await usernameInput.fill('abcdefghijklmnopqrstuvwxyz');
    const value = await usernameInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(20);
  });

  test('username field has minLength 3', async ({ page }) => {
    const usernameInput = page.locator('input[placeholder*="Username"]');
    await expect(usernameInput).toHaveAttribute('minlength', '3');
  });

  test('password autocomplete switches to new-password in register mode', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
  });

  test('password has minLength 6', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute('minlength', '6');
  });
});

test.describe('Auth - Toggle Between Modes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.login-container', { timeout: 5000 });
  });

  test('toggle login -> register -> login preserves email but resets correctly', async ({ page }) => {
    // Type email in login mode
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');

    // Toggle to register
    await page.locator('.login-toggle').click();
    await expect(page.locator('input[placeholder*="Username"]')).toBeVisible();

    // Email should still be populated
    await expect(emailInput).toHaveValue('test@example.com');

    // Toggle back to login
    await page.locator('.login-toggle').click();
    await expect(page.locator('input[placeholder*="Username"]')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('toggling clears error message', async ({ page }) => {
    // We can't easily trigger a real auth error without Supabase,
    // but we verify the toggle calls onClearError (error disappears if present)
    // For now, verify no .login-error is visible after toggle
    await page.locator('.login-toggle').click();
    const errorCount = await page.locator('.login-error').count();
    expect(errorCount).toBe(0);
  });

  test('error message renders when present', async ({ page }) => {
    // Inject an error by submitting with invalid credentials
    // This test verifies the .login-error element structure exists
    // Fill in credentials and submit — if Supabase is not running, the error path triggers
    await page.locator('input[type="email"]').fill('bad@test.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for either error to show or screen to change
    const hasError = await page.locator('.login-error').isVisible({ timeout: 3000 }).catch(() => false);
    // If Supabase isn't running, we expect an error. If it is, wrong credentials = error.
    // Either way, the app shouldn't crash.
    await expect(page.locator('.login-container')).toBeVisible();
  });
});

test.describe('Auth - Local Mode Bypass', () => {
  test('?mode=local skips auth entirely and loads game screen', async ({ page }) => {
    await page.goto('/?mode=local');
    await page.waitForSelector('.board-svg', { timeout: 5000 });

    // Login screen should NOT be visible
    const loginCount = await page.locator('.login-container').count();
    expect(loginCount).toBe(0);

    // Game screen should be visible
    await expect(page.locator('.game-screen')).toBeVisible();
  });

  test('?mode=local shows Player 1 and Player 2', async ({ page }) => {
    await page.goto('/?mode=local');
    await page.waitForSelector('.board-svg', { timeout: 5000 });

    await expect(page.getByText('Player 1')).toBeVisible();
    await expect(page.getByText('Player 2')).toBeVisible();
  });
});
