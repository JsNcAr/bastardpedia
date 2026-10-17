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

test('more like this leads to another story', async ({ page }) => {
  await page.goto('/stories/sample-heinrich-schliemann');
  const section = page.getByRole('region', { name: 'More like this' });
  const first = section.getByRole('link').first();
  const href = await first.getAttribute('href');
  await first.click();
  await expect(page).toHaveURL(new RegExp(`${href ?? 'missing'}$`));
  await expect(
    page
      .getByRole('article')
      .getByRole('heading', { level: 1 })
      .or(page.getByRole('article').getByRole('heading', { level: 2 }).first()),
  ).toBeVisible();
});

test('surprise me opens a story that matches the filters', async ({ page }) => {
  await page.goto('/?role=explorer-adventurer');
  await page.getByRole('button', { name: 'Surprise me' }).click();
  await expect(page).toHaveURL(/\/stories\/[^?]+\?role=explorer-adventurer$/);
  await expect(page.getByRole('article')).toContainText(/Schliemann|Stanley|Fawcett/);
});

test('search marks matches, and / and j work from the keyboard', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard shortcuts are for desktop keyboards.');
  await page.goto('/');
  await page.locator('body').click({ position: { x: 600, y: 140 } });
  await page.keyboard.press('/');
  const search = page.getByRole('searchbox', { name: 'Search stories' });
  await expect(search).toBeFocused();
  await search.fill('troy');
  await expect(results(page).locator('mark.hit').first()).toHaveText(/troy/i);
  await page.locator('body').click({ position: { x: 600, y: 140 } });
  await page.keyboard.press('j');
  await expect(results(page).getByRole('link').first()).toBeFocused();
});

test('timeline: drag across the density strip to choose years', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('group', { name: 'Show results as' })
    .getByRole('button', { name: 'Timeline' })
    .click();
  await expect(page).toHaveURL(/view=timeline/);
  const chart = page.getByRole('img', { name: /^Stories per / });
  const box = await chart.boundingBox();
  if (!box) throw new Error('The density strip has no box.');
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.25, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, y, { steps: 4 });
  await page.mouse.move(box.x + box.width * 0.75, y, { steps: 4 });
  await page.mouse.up();
  await expect(page).toHaveURL(/from=18\d\d&to=19\d\d/);
  const url = new URL(page.url());
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';
  await expect(
    page.getByRole('button', { name: `Remove filter: Years: ${from} to ${to}` }),
  ).toBeVisible();
  expect(url.searchParams.get('view')).toBe('timeline');
});

test('timeline: a row opens its story and Escape returns to it', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The pane exists only in the wide layout.');
  await page.goto('/?view=timeline');
  const row = page.locator('a[data-story="sample-percy-fawcett"]');
  await row.click();
  const pane = page.getByRole('article');
  await expect(pane.getByRole('heading', { name: /Percy Fawcett/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pane).toHaveCount(0);
  await expect(row).toBeFocused();
  await expect(page).toHaveURL(/\/\?view=timeline$/);
});

test('timeline: phones get full-width bars under the titles', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Checks the narrow layout.');
  await page.goto('/?view=timeline');
  const row = page.locator('a[data-story="sample-percy-fawcett"]');
  await expect(row).toBeVisible();
  const title = await row.locator('.timeline-title').boundingBox();
  const bar = await row.locator('.timeline-bar').boundingBox();
  const list = await page.getByRole('list', { name: 'Stories' }).boundingBox();
  if (!title || !bar || !list) throw new Error('Missing a timeline box.');
  expect(bar.y).toBeGreaterThan(title.y + title.height - 1);
  // Full width apart from the row's mark at the end.
  const mark = await row.locator('xpath=..').locator('.row-mark').boundingBox();
  if (!mark) throw new Error('Missing the row mark.');
  expect(bar.x + bar.width).toBeGreaterThan(mark.x - 16);
  expect(bar.width).toBeGreaterThan(list.width * 0.8);
});

test('catch-up: mark everything up to a month, then browse the rest', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('link', { name: 'Catch up' }).click();
  await expect(page.getByRole('heading', { name: 'Catch up' })).toBeVisible();
  await page.getByRole('radio', { name: 'Everything up to a month' }).check();
  await page.getByLabel('Up to', { exact: true }).fill('2021-07');
  await expect(page.getByText(/^4 stories, 7 episodes/)).toBeVisible();
  await page.getByRole('button', { name: 'Mark 4 stories as listened' }).click();
  await expect(page.getByText('Marked 4 stories as listened.')).toBeVisible();
  await page.getByRole('link', { name: 'Browse with listened stories hidden' }).click();
  await expect(page).toHaveURL(/hide-listened=1/);
  await expect(page.getByText('4 stories of 8', { exact: true })).toBeVisible();
});

test('select mode: mark a search result, then undo', async ({ page }) => {
  await page.goto('/?q=nestle');
  await page.getByRole('button', { name: 'Select', exact: true }).click();
  await page
    .getByRole('checkbox', { name: /^Select: / })
    .first()
    .check();
  const bar = page.getByRole('region', { name: 'Selection' });
  await expect(bar.getByText('1 selected')).toBeVisible();
  await bar.getByRole('button', { name: 'Mark listened' }).click();
  await expect(page.getByText('Marked 1 story as listened.')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Undone.')).toBeVisible();
});

test('phones mark a story listened with one tap', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Checks the touch target on a phone.');
  await page.goto('/');
  const mark = page.getByRole('button', { name: /^Listened: .*Percy Fawcett/ });
  const box = await mark.boundingBox();
  if (!box) throw new Error('The row mark has no box.');
  expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
  await mark.tap();
  await expect(mark).toHaveAttribute('aria-pressed', 'true');
});
