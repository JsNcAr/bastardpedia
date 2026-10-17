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
  await page.route('**/data/catalog*.json', (route) =>
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
  await expect(results(page).getByRole('link')).toHaveCount(3);
  await expect(results(page)).toContainText('Heinrich Schliemann');
  await expect(results(page)).toContainText('Henry Morton Stanley');
  await expect(results(page)).toContainText('Percy Fawcett');
  await expect(results(page)).not.toContainText('L. Ron Hubbard');

  await page.reload();
  await expect(results(page).getByRole('link')).toHaveCount(3);
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

test('reviewed-only switch and the unreviewed marker', async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(results(page).getByText('Unreviewed', { exact: true })).toHaveCount(4);
  await withFilters(page, isMobile, async () => {
    await tick(page, /^Reviewed by a person only/);
  });
  await expect(page).toHaveURL(/\?reviewed=1$/);
  await expect(results(page).getByRole('link')).toHaveCount(4);
  await expect(results(page).getByText('Unreviewed', { exact: true })).toHaveCount(0);
});

test('year range: typed years, then a slider back to the edge', async ({ page, isMobile }) => {
  await page.goto('/');
  await withFilters(page, isMobile, async () => {
    await page.getByLabel('From', { exact: true }).fill('1926');
    await page.getByLabel('From', { exact: true }).press('Enter');
    await expect(page).toHaveURL(/\?from=1926$/);
    await page.getByLabel('To', { exact: true }).fill('1950');
    await page.getByLabel('To', { exact: true }).press('Enter');
    await expect(page).toHaveURL(/\?from=1926&to=1950$/);
  });
  await expect(results(page).getByRole('link')).toHaveCount(2);
  await expect(results(page)).toContainText('L. Ron Hubbard');
  await expect(page.getByRole('button', { name: /^Remove filter: Years/ })).toBeVisible();

  await withFilters(page, isMobile, async () => {
    await page.getByRole('slider', { name: 'Earliest year' }).press('Home');
    await expect(page).toHaveURL(/\?to=1950$/);
  });
});

test('library: mark a story, export it, import it back', async ({ page }) => {
  await page.goto('/stories/sample-percy-fawcett');
  const want = page.getByRole('button', { name: 'Want to listen' });
  await want.click();
  await expect(want).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/library');
  await expect(page.getByRole('region', { name: 'Want to listen' })).toContainText('Percy Fawcett');

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export to a file' }).click();
  const file = await (await downloading).path();
  await expect(page.getByRole('status').filter({ hasText: 'Exported 1 entries.' })).toBeVisible();

  await page.locator('input[type=file]').setInputFiles(file);
  await expect(
    page.getByRole('status').filter({ hasText: /Imported 0 of 1 entries/ }),
  ).toBeVisible();
});

/** The bits of a scrollable element the e2e tests read (e2e has no DOM types). */
interface Scroller {
  scrollTop: number;
  scrollHeight: number;
  scrollTo(x: number, y: number): void;
}

test('the story pane starts each story at its top', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The pane exists only in the wide layout.');
  await page.goto('/stories/sample-l-ron-hubbard');
  const pane = page.getByRole('region', { name: 'Story' });
  await expect(pane.getByRole('heading', { name: /Hubbard/ })).toBeVisible();
  await pane.evaluate((el: Scroller) => el.scrollTo(0, el.scrollHeight));
  const scrollTop = () => pane.evaluate((el: Scroller) => el.scrollTop);
  await expect.poll(scrollTop).toBeGreaterThan(0);
  await results(page)
    .getByRole('link', { name: /Percy Fawcett/ })
    .click();
  await expect(pane.getByRole('heading', { name: /Percy Fawcett/ })).toBeVisible();
  expect(await scrollTop()).toBe(0);
});

test('tapping outside the filter drawer closes it', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The drawer exists only in the narrow layout.');
  await page.goto('/');
  await page.getByRole('button', { name: /^Filters/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Filters' });
  await expect(drawer).toBeVisible();
  await page.mouse.click(8, 400);
  await expect(drawer).toBeHidden();
});

test('phones search above the results without opening the drawer', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Wide screens keep the search in the rail.');
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Search stories' }).fill('Fawcett');
  await expect(results(page).getByRole('link')).toHaveCount(1);
  await expect(page.getByRole('dialog', { name: 'Filters' })).toBeHidden();
});

test('the year range has two working handles on one track', async ({ page, isMobile }) => {
  await page.goto('/');
  await withFilters(page, isMobile, async () => {
    const latest = page.getByRole('slider', { name: 'Latest year' });
    await latest.focus();
    // One step must be enough, even on the fixture's narrow range where the curved
    // scale used to round it back to the maximum and snap the handle back.
    await latest.press('PageDown');
    await expect(page).toHaveURL(/[?&]to=-?\d+/);

    const earliest = page.getByRole('slider', { name: 'Earliest year' });
    const box = await earliest.boundingBox();
    if (!box) throw new Error('slider not laid out');
    await page.mouse.move(box.x + 10, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(page).toHaveURL(/[?&]from=-?\d+/);
  });
});
