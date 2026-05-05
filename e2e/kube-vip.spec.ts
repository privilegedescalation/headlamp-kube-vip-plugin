import { test, expect } from '@playwright/test';

async function waitForSidebar(page: import('@playwright/test').Page) {
  const sidebar = page.getByRole('navigation', { name: 'Navigation' });
  await expect(sidebar).toBeVisible({ timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  return sidebar;
}

test.describe('kube-vip plugin smoke tests', () => {
  test('sidebar contains kube-vip entry', async ({ page }) => {
    await page.goto('/');
    const sidebar = await waitForSidebar(page);
    await expect(sidebar.getByRole('button', { name: /kube.vip/i })).toBeVisible();
  });

  test('kube-vip sidebar entry navigates to kube-vip view', async ({ page }) => {
    await page.goto('/');
    const sidebar = await waitForSidebar(page);

    const entry = sidebar.getByRole('button', { name: /kube.vip/i });
    await expect(entry).toBeVisible();
    await entry.click();

    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/kube-vip/);
    await expect(page.getByRole('heading', { name: /kube.vip/i })).toBeVisible();
  });

  test('kube-vip page renders content', async ({ page }) => {
    await page.goto('/c/main/kube-vip');
    await waitForSidebar(page);

    await expect(page.getByRole('heading', { name: /kube.vip/i })).toBeVisible({
      timeout: 15_000,
    });

    const hasTable = await page.locator('table').first().isVisible().catch(() => false);
    const hasContent = await page.locator('[class*="Mui"]').first().isVisible().catch(() => false);
    expect(hasTable || hasContent).toBe(true);
  });

  test('plugin settings page shows kube-vip plugin entry', async ({ page }) => {
    await page.goto('/settings/plugins');
    await page.waitForLoadState('networkidle');

    const pluginEntry = page.locator('text=/kube.vip/i').first();
    await expect(pluginEntry).toBeVisible({ timeout: 30_000 });
  });
});
