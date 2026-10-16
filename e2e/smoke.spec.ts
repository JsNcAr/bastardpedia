import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const sample = readFileSync(
  new URL('../src/test/fixtures/catalog.sample.json', import.meta.url),
  'utf8',
);

// The service worker would answer /data/catalog.json itself; block it so the
// fixture route below is what the app sees.
test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.route('**/data/catalog.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: sample }),
  );
});

const results = (page: Page) => page.getByRole('list', { name: 'Stories' });

/**
 * Router navigation is async, so a controlled checkbox reflects the URL a tick
 * after the click: click, then wait for the state, instead of locator.check().
 */
async function tick(page: Page, name: RegExp) {
  const box = page.getByRole('checkbox', { name });
  await box.click();
  await expect(box).toBeChecked();
}

/** On narrow screens the filters live in a drawer. */
async function withFilters(page: Page, isMobile: boolean, act: () => Promise<void>) {
  if (isMobile) await page.getByRole('button', { name: /^Filters/ }).click();
  await act();
  if (isMobile) await page.getByRole('button', { name: /^Show \d+ stor/ }).click();
}

test('loads the catalogue', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The catalogue' })).toBeVisible();
  await expect(page.getByText('8 stories', { exact: true })).toBeVisible();
  await expect(page).toHaveTitle('Bastardpedia');
});

test('Victorian explorers: filters, URL, reload, story detail', async ({ page, isMobile }) => {
  await page.goto('/');
  await withFilters(page, isMobile, async () => {
    await tick(page, /^Victorian era/);
    await page.getByText('Who they were', { exact: true }).click();
    await tick(page, /^Explorer \/ adventurer/);
  });

  await expect(page).toHaveURL(/\?era=victorian&role=explorer-adventurer$/);
  await expect(results(page).getByRole('link')).toHaveCount(2);
  await expect(results(page)).toContainText('Heinrich Schliemann');
  await expect(results(page)).toContainText('Henry Morton Stanley');
  await expect(results(page)).not.toContainText('Percy Fawcett');

  await page.reload();
  await expect(results(page).getByRole('link')).toHaveCount(2);
  await expect(
    page.getByRole('button', { name: 'Remove filter: Victorian era (UK)' }),
  ).toBeVisible();

  await results(page)
    .getByRole('link', { name: /Heinrich Schliemann/ })
    .click();
  await expect(page).toHaveURL(
    /\/stories\/sample-heinrich-schliemann\?era=victorian&role=explorer-adventurer$/,
  );
  const story = page.getByRole('article');
  await expect(story.getByRole('heading', { name: /Heinrich Schliemann/ })).toBeVisible();
  await expect(story).toContainText('1846 to 1890');
});

test('a story opened directly works and links back', async ({ page, isMobile }) => {
  await page.goto('/stories/sample-percy-fawcett');
  await expect(
    page.getByRole('article').getByRole('heading', { name: /Percy Fawcett/ }),
  ).toBeVisible();
  if (isMobile) {
    await page.getByRole('link', { name: 'Back to results' }).click();
    await expect(page.getByRole('heading', { name: 'The catalogue' })).toBeVisible();
  }
});

test('unknown paths show the not-found page', async ({ page }) => {
  await page.goto('/no/such/page');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
