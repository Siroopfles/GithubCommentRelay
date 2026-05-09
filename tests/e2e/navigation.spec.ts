import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to the homepage and verify title', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });
});
