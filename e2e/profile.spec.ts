import { test, expect } from '@playwright/test';

// Profile tests require authentication. These tests verify UI structure
// and interaction patterns. Against a real Supabase, they would do full E2E.
// We test what we can: navigating to profile screen, UI elements, edit flow.

// Helper: In a real test env, we'd seed a test user and sign in.
// For now, these tests document the expected behavior with selectors.

test.describe('Profile Screen - UI Structure', () => {
  // NOTE: These tests require a logged-in user. In CI, you'd use a
  // storageState fixture or API login. Here we document the expected structure.

  test.skip('placeholder - requires auth setup', () => {});

  // The following tests are written for when auth is available.
  // Uncomment and configure storageState when Supabase test env is ready.

  /*
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.home-container', { timeout: 5000 });
    // Navigate to profile by tapping avatar button
    await page.locator('.home-profile-btn').click();
    await page.waitForSelector('.profile-container', { timeout: 3000 });
  });

  test('profile screen shows avatar, username, and back button', async ({ page }) => {
    await expect(page.locator('.profile-back')).toBeVisible();
    await expect(page.locator('.profile-avatar')).toBeVisible();
    await expect(page.locator('.profile-name')).toBeVisible();
  });

  test('back button returns to home screen', async ({ page }) => {
    await page.locator('.profile-back').click();
    await expect(page.locator('.home-container')).toBeVisible({ timeout: 3000 });
  });

  test('edit username button opens edit form', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit Username' }).click();
    await expect(page.locator('.profile-edit-form')).toBeVisible();
    await expect(page.locator('.profile-input')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('cancel edit returns to display mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit Username' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.profile-edit-form')).not.toBeVisible();
    await expect(page.locator('.profile-name')).toBeVisible();
  });

  test('username edit validates minimum 3 characters', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit Username' }).click();
    const input = page.locator('.profile-edit-form .profile-input');
    await input.clear();
    await input.fill('ab');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('.profile-error')).toHaveText('Username must be at least 3 characters');
  });

  test('username edit sanitizes input', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit Username' }).click();
    const input = page.locator('.profile-edit-form .profile-input');
    await input.clear();
    await input.fill('Test User!');
    const value = await input.inputValue();
    expect(value).toBe('testuser');
  });
  */
});

test.describe('Profile Screen - Friends Management', () => {
  test.skip('placeholder - requires auth setup', () => {});

  /*
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.home-container', { timeout: 5000 });
    await page.locator('.home-profile-btn').click();
    await page.waitForSelector('.profile-container', { timeout: 3000 });
  });

  test('friends section shows count in title', async ({ page }) => {
    const title = page.locator('.profile-section-title').filter({ hasText: 'Friends' });
    await expect(title).toBeVisible();
    // Should contain count like "Friends (3)"
    const text = await title.textContent();
    expect(text).toMatch(/Friends \(\d+\)/);
  });

  test('empty friends shows helpful message', async ({ page }) => {
    // If no friends, should show empty state
    const emptyMsg = page.locator('.profile-empty');
    if (await emptyMsg.isVisible()) {
      await expect(emptyMsg).toContainText('No friends yet');
    }
  });

  test('friend row shows avatar, name, username, play and remove buttons', async ({ page }) => {
    const friendRows = page.locator('.profile-friend-row');
    if (await friendRows.count() > 0) {
      const firstFriend = friendRows.first();
      await expect(firstFriend.locator('.profile-friend-avatar')).toBeVisible();
      await expect(firstFriend.locator('.profile-friend-name')).toBeVisible();
      await expect(firstFriend.locator('.profile-friend-username')).toBeVisible();
      // Play and remove buttons
      await expect(firstFriend.getByRole('button', { name: 'Play' })).toBeVisible();
      // Remove button is the x button
      await expect(firstFriend.locator('.profile-btn-danger')).toBeVisible();
    }
  });

  test('search input requires minimum 2 characters', async ({ page }) => {
    const searchInput = page.locator('.profile-search .profile-input');
    await searchInput.fill('a');
    const searchBtn = page.locator('.profile-search').getByRole('button', { name: 'Search' });
    await expect(searchBtn).toBeDisabled();

    await searchInput.fill('ab');
    await expect(searchBtn).toBeEnabled();
  });

  test('search by username shows results', async ({ page }) => {
    const searchInput = page.locator('.profile-search .profile-input');
    await searchInput.fill('testuser');
    await page.locator('.profile-search').getByRole('button', { name: 'Search' }).click();

    // Wait for results or empty state
    await page.waitForTimeout(1000);
    // Results would appear as profile-friend-row elements after the search section
  });

  test('search can be triggered by Enter key', async ({ page }) => {
    const searchInput = page.locator('.profile-search .profile-input');
    await searchInput.fill('testuser');
    await searchInput.press('Enter');
    // Should trigger search (no crash)
    await page.waitForTimeout(500);
  });

  test('add friend button appears on search results', async ({ page }) => {
    const searchInput = page.locator('.profile-search .profile-input');
    await searchInput.fill('testuser');
    await page.locator('.profile-search').getByRole('button', { name: 'Search' }).click();
    await page.waitForTimeout(1000);

    // If results exist, they should have an "Add" button
    const addBtns = page.getByRole('button', { name: 'Add' });
    if (await addBtns.count() > 0) {
      await expect(addBtns.first()).toBeVisible();
    }
  });

  test('sign out button is visible and styled as danger', async ({ page }) => {
    const signOutBtn = page.getByRole('button', { name: 'Sign Out' });
    await expect(signOutBtn).toBeVisible();
    // Should have red-ish color
    const color = await signOutBtn.evaluate((el) => getComputedStyle(el).color);
    // #c0392b or similar red
    expect(color).toBeTruthy();
  });

  test('sign out returns to login screen', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await expect(page.locator('.login-container')).toBeVisible({ timeout: 5000 });
  });

  test('all touch targets are at least 44px', async ({ page }) => {
    const buttons = page.locator('.profile-container button');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        const minDim = Math.min(box.width, box.height);
        expect(minDim).toBeGreaterThanOrEqual(44);
      }
    }
  });
  */
});
