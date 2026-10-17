import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * Against the catalogue `npm run build:catalog` produced, not the fixture: catches
 * data the fixture does not have. Skipped when there is no built catalogue.
 */
const path = new URL('../dist/data/catalog.json', import.meta.url);
const catalog = existsSync(path)
  ? (JSON.parse(readFileSync(path, 'utf8')) as { stories: { id: string; title: string }[] })
  : null;

test.skip(catalog === null, 'No dist/data/catalog.json: run build:catalog and build first.');
test.use({ serviceWorkers: 'block' });

test('the real catalogue loads every story without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  const total = catalog?.stories.length ?? 0;
  await page.goto('/');
  await expect(
    page.getByText(`${String(total)} ${total === 1 ? 'story' : 'stories'}`, { exact: true }),
  ).toBeVisible();

  const first = catalog?.stories[0];
  if (first) {
    await page.goto(`/stories/${first.id}`);
    await expect(
      page.getByRole('article').getByRole('heading', { name: first.title }),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
});
