import { test, expect } from '@playwright/test';

// Home screen tests require authentication.
// Similar to profile tests, these document expected structure and behavior.

test.describe('Home Screen - UI Structure', () => {
  test.skip('placeholder - requires auth setup', () => {});

  /*
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.home-container', { timeout: 5000 });
  });

  test('header shows app title and profile avatar button', async ({ page }) => {
    await expect(page.locator('.home-title')).toHaveText('Scrabblish');
    const profileBtn = page.locator('.home-profile-btn');
    await expect(profileBtn).toBeVisible();
    // Avatar shows first letter of username (uppercased)
    const text = await profileBtn.textContent();
    expect(text).toMatch(/^[A-Z?]$/);
  });

  test('profile button navigates to profile screen', async ({ page }) => {
    await page.locator('.home-profile-btn').click();
    await expect(page.locator('.profile-container')).toBeVisible({ timeout: 3000 });
  });

  test('header fits within viewport without scroll', async ({ page }) => {
    const header = page.locator('.home-header');
    const box = await header.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  });
  */
});

test.describe('Home Screen - Active Games List', () => {
  test.skip('placeholder - requires auth setup', () => {});

  /*
  test.use({ storageState: 'e2e/.auth/user-with-games.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.home-container', { timeout: 5000 });
  });

  test('active games section shows when games exist', async ({ page }) => {
    const section = page.locator('.home-games-section').filter({ hasText: 'Active Games' });
    await expect(section).toBeVisible();
  });

  test('game row shows opponent name, languages, and turn indicator', async ({ page }) => {
    const gameRow = page.locator('.home-game-row').first();
    if (await gameRow.count() > 0) {
      await expect(gameRow.locator('.home-game-opponent')).toBeVisible();
      await expect(gameRow.locator('.home-game-langs')).toBeVisible();
      // Either "Your turn" or "Their turn" or "Waiting"
      const status = gameRow.locator('.home-game-status');
      await expect(status).toBeVisible();
    }
  });

  test('your-turn games have active styling', async ({ page }) => {
    const myTurnGames = page.locator('.home-game-my-turn');
    if (await myTurnGames.count() > 0) {
      // Should have the your-turn indicator
      await expect(myTurnGames.first().locator('.home-game-your-turn')).toHaveText('Your turn');
    }
  });

  test('tapping a game row navigates to game screen', async ({ page }) => {
    const gameRow = page.locator('.home-game-row').first();
    if (await gameRow.count() > 0) {
      await gameRow.click();
      // Should navigate to game screen (loading or actual)
      await page.waitForTimeout(1000);
      const onGameScreen = await page.locator('.game-screen').isVisible();
      expect(onGameScreen).toBe(true);
    }
  });

  test('whole game row is clickable (not just text)', async ({ page }) => {
    const gameRow = page.locator('.home-game-row').first();
    if (await gameRow.count() > 0) {
      const box = await gameRow.boundingBox();
      expect(box).not.toBeNull();
      // Click near the edge of the row
      await page.mouse.click(box!.x + 5, box!.y + box!.height / 2);
      await page.waitForTimeout(500);
      // Should still navigate
    }
  });
  */
});

test.describe('Home Screen - Friends List', () => {
  test.skip('placeholder - requires auth setup', () => {});

  /*
  test.use({ storageState: 'e2e/.auth/user-with-friends.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.home-container', { timeout: 5000 });
  });

  test('friends section is visible', async ({ page }) => {
    const section = page.locator('.home-games-section').filter({ hasText: 'Friends' });
    await expect(section).toBeVisible();
  });

  test('friend row shows avatar, name, username, and Play button', async ({ page }) => {
    const friendRow = page.locator('.home-friend-row').first();
    if (await friendRow.count() > 0) {
      await expect(friendRow.locator('.home-friend-avatar')).toBeVisible();
      await expect(friendRow.locator('.home-friend-name')).toBeVisible();
      await expect(friendRow.locator('.home-friend-username')).toBeVisible();
      await expect(friendRow.locator('.home-play-btn')).toBeVisible();
    }
  });

  test('Play button navigates to new game flow', async ({ page }) => {
    const playBtn = page.locator('.home-play-btn').first();
    if (await playBtn.count() > 0) {
      await playBtn.click();
      // Should show the language picker (NewGameWithFriend component)
      await expect(page.getByText('New Game with')).toBeVisible({ timeout: 3000 });
    }
  });
  */
});

test.describe('Home Screen - Empty State', () => {
  test.skip('placeholder - requires auth setup', () => {});

  /*
  test.use({ storageState: 'e2e/.auth/new-user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.home-container', { timeout: 5000 });
  });

  test('empty state shows when no games and no friends', async ({ page }) => {
    await expect(page.locator('.home-empty-state')).toBeVisible();
    await expect(page.locator('.home-tile-icon')).toHaveText('S');
    await expect(page.locator('.home-empty-title')).toContainText('Play words in any language');
    await expect(page.locator('.home-empty-text')).toContainText('Add a friend');
  });

  test('empty friends shows add friends prompt', async ({ page }) => {
    const emptyFriends = page.locator('.home-empty-friends');
    if (await emptyFriends.isVisible()) {
      await expect(emptyFriends).toContainText('No friends yet');
      await expect(page.locator('.home-add-friend-btn')).toBeVisible();
    }
  });

  test('add friends button navigates to profile', async ({ page }) => {
    const addBtn = page.locator('.home-add-friend-btn');
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await expect(page.locator('.profile-container')).toBeVisible({ timeout: 3000 });
    }
  });
  */
});

test.describe('Home Screen - Loading State', () => {
  test.skip('placeholder - requires auth setup', () => {});

  /*
  test('loading indicator shown while games load', async ({ page }) => {
    await page.goto('/');
    // Briefly, loading indicator should appear
    // (May be too fast to catch in test, but verify no crash)
    await page.waitForSelector('.home-container', { timeout: 5000 });
  });
  */
});

test.describe('Home Screen - New Game Flow', () => {
  test.skip('placeholder - requires auth setup', () => {});

  /*
  test.use({ storageState: 'e2e/.auth/user-with-friends.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.home-container', { timeout: 5000 });
  });

  test('language picker shows EN and DE options', async ({ page }) => {
    // Navigate to new game
    await page.locator('.home-play-btn').first().click();
    await page.waitForSelector('text=New Game with', { timeout: 3000 });

    await expect(page.getByRole('button', { name: 'English' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'German' })).toBeVisible();
  });

  test('both languages selected by default', async ({ page }) => {
    await page.locator('.home-play-btn').first().click();
    await page.waitForSelector('text=New Game with', { timeout: 3000 });

    // Both should have selected styling (border color #2c1810)
    const enBtn = page.getByRole('button', { name: 'English' });
    const deBtn = page.getByRole('button', { name: 'German' });

    const enWeight = await enBtn.evaluate((el) => getComputedStyle(el).fontWeight);
    const deWeight = await deBtn.evaluate((el) => getComputedStyle(el).fontWeight);
    expect(Number(enWeight)).toBeGreaterThanOrEqual(600);
    expect(Number(deWeight)).toBeGreaterThanOrEqual(600);
  });

  test('cannot deselect all languages (at least one required)', async ({ page }) => {
    await page.locator('.home-play-btn').first().click();
    await page.waitForSelector('text=New Game with', { timeout: 3000 });

    // Deselect English
    await page.getByRole('button', { name: 'English' }).click();
    // Try to deselect German (should not work — last one)
    await page.getByRole('button', { name: 'German' }).click();

    // German should still be selected (fontWeight >= 600)
    const deWeight = await page.getByRole('button', { name: 'German' }).evaluate(
      (el) => getComputedStyle(el).fontWeight
    );
    expect(Number(deWeight)).toBeGreaterThanOrEqual(600);
  });

  test('back button returns to home', async ({ page }) => {
    await page.locator('.home-play-btn').first().click();
    await page.waitForSelector('text=New Game with', { timeout: 3000 });

    await page.getByRole('button', { name: /Back/ }).click();
    await expect(page.locator('.home-container')).toBeVisible({ timeout: 3000 });
  });

  test('start game button exists and is clickable', async ({ page }) => {
    await page.locator('.home-play-btn').first().click();
    await page.waitForSelector('text=New Game with', { timeout: 3000 });

    const startBtn = page.getByRole('button', { name: 'Start Game' });
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();
  });
  */
});
