/**
 * Browser smoke pass over the Wear It member and admin journeys.
 *
 *   BASE_URL=http://localhost:3005 API_URL=http://localhost:4100/api node qa/browser.mjs
 *
 * Requires a running frontend and backend, and `npx playwright install chromium`.
 * Set SHOTS=<dir> to save a screenshot at each milestone.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const API = process.env.API_URL || 'http://localhost:4000/api';
const ADMIN = { email: process.env.ADMIN_EMAIL || 'admin@wearit.local', password: process.env.ADMIN_PASSWORD || 'WearIt123!' };
const SHOTS = process.env.SHOTS || '';
/** Served by wear-it-backend/qa/openai-stub.mjs; the backend needs IMAGE_IMPORT_ALLOW_LOOPBACK=true. */
const LINK_IMAGE = process.env.LINK_IMAGE_URL || 'http://127.0.0.1:4999/__image.png';

let passed = 0;
const failures = [];
const consoleErrors = [];
/**
 * A few steps deliberately provoke a rejected request. Console noise is ignored only
 * inside those, so a genuine error anywhere else still fails the run.
 */
let expectingRejection = false;
async function whileExpectingRejection(work) {
  expectingRejection = true;
  try {
    return await work();
  } finally {
    expectingRejection = false;
  }
}

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}
const section = (title) => console.log(`\n${title}`);

/** Solid-colour PNGs written to a temp dir so the file chooser has something real to pick. */
function makeImages() {
  const dir = mkdtempSync(join(tmpdir(), 'wear-it-qa-'));
  const png = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const size = 48;
    const raw = Buffer.alloc(size * size * 3);
    for (let i = 0; i < size * size; i += 1) {
      raw.writeUInt8(r, i * 3);
      raw.writeUInt8(g, i * 3 + 1);
      raw.writeUInt8(b, i * 3 + 2);
    }
    return encodePng(size, size, raw);
  };
  const files = {};
  for (const [name, hex] of Object.entries({
    tee: '#d8cdbb',
    tee2: '#ffffff',
    pants: '#2f3a44',
    jacket: '#1d2b22',
    person: '#c39a7b',
  })) {
    const path = join(dir, `${name}.png`);
    writeFileSync(path, png(hex));
    files[name] = path;
  }
  return files;
}

/** Minimal uncompressed-deflate PNG encoder — avoids pulling an image library into the frontend. */
function encodePng(width, height, rgb) {
  const zlib = require('zlib');
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function shot(page, name) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

async function addItem(page, { name, type, file }) {
  await page.getByRole('button', { name: /Add item|Add your first item/ }).first().click();
  await page.getByRole('dialog').waitFor();
  const chooser = page.waitForEvent('filechooser');
  await page.locator('.imageDropZone').click();
  await (await chooser).setFiles(file);
  await page.locator('.imageDropZone.filled').waitFor({ timeout: 15000 });
  await page.getByLabel('Name').fill(name);
  await page.locator('.modal select').first().selectOption({ label: type });
  await page.getByRole('button', { name: 'Add to closet' }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15000 });
}

/** The footer repeats the member links, so navigation is always driven from the header nav. */
const navLink = (page, name) => page.locator('header nav').getByRole('link', { name });
const adminLink = (page, name) => page.locator('.adminSidebar nav').getByRole('link', { name });

/** Adds an item through the "From a link" tab instead of the file picker. */
async function addItemFromLink(page, { name, type, url }) {
  await page.getByRole('button', { name: /Add item|Add your first item/ }).first().click();
  await page.getByRole('dialog').waitFor();
  await page.locator('.sourceTabs').getByRole('button', { name: 'From a link' }).click();
  await page.locator('.linkRow input').fill(url);
  await page.getByRole('button', { name: 'Fetch' }).click();
  await page.locator('.imageDropZone.filled').waitFor({ timeout: 30000 });
  await page.getByLabel('Name').fill(name);
  await page.locator('.modal select').first().selectOption({ label: type });
  await page.getByRole('button', { name: 'Add to closet' }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15000 });
}

async function run() {
  const files = makeImages();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  // This suite selects by visible English text, so the journey below runs with the
  // language pinned. Arabic — the default — is checked separately at the end.
  await context.addInitScript((key) => {
    try {
      window.localStorage.setItem(key, 'en');
    } catch {
      /* storage refused; the default locale still applies */
    }
  }, 'wear_it_locale');
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error' && !expectingRejection) consoleErrors.push(`${page.url()} :: ${message.text()}`);
  });
  page.on('pageerror', (error) => consoleErrors.push(`${page.url()} :: ${error.message}`));

  const stamp = Date.now().toString(36);
  const member = { name: 'QA Browser', email: `qa-ui-${stamp}@wearit.test`, password: 'WearItQA123!' };

  section('Landing page');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  check('hero renders a headline', (await page.locator('h1').first().innerText()).length > 5);
  check('how-it-works lists three steps', (await page.locator('.stepCard').count()) === 3);
  await shot(page, '01-landing');

  section('Registration');
  await page.getByRole('link', { name: /Build my closet|Get started|Open my closet/ }).first().click();
  await page.waitForURL('**/register');
  await page.getByLabel('Name').fill(member.name);
  await page.getByLabel('Email').fill(member.email);
  await page.getByLabel('Password').fill(member.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/closet', { timeout: 20000 });
  check('registration lands in the closet', page.url().endsWith('/closet'));
  await page.getByText('Your closet is empty').waitFor({ timeout: 20000 });
  check('an empty closet explains what to do', true);
  await shot(page, '02-empty-closet');

  section('Building the closet');
  await addItem(page, { name: 'Sand tee', type: 'T-shirt', file: files.tee });
  await page.locator('.itemCard').first().waitFor({ timeout: 15000 });
  check('the first item appears', (await page.locator('.itemCard').count()) === 1);
  await addItem(page, { name: 'White tee', type: 'T-shirt', file: files.tee2 });
  await addItem(page, { name: 'Navy pants', type: 'Pants', file: files.pants });
  await addItem(page, { name: 'Green jacket', type: 'Jacket', file: files.jacket });
  await page.locator('.itemCard').nth(3).waitFor({ timeout: 15000 });
  check('all four items are listed', (await page.locator('.itemCard').count()) === 4);
  await shot(page, '03-closet');

  await page.locator('.filterSelect').selectOption({ label: 'Pants' });
  await page.waitForTimeout(700);
  check('the clothing-type filter narrows the closet', (await page.locator('.itemCard').count()) === 1);
  await page.locator('.filterSelect').selectOption('');
  await page.locator('.searchBox input').fill('jacket');
  await page.waitForTimeout(700);
  check('search finds an item by name', (await page.locator('.itemCard').count()) === 1);
  await page.locator('.searchBox input').fill('');
  await page.waitForTimeout(700);

  section('Adding an item from a link');
  await page.getByRole('button', { name: 'Add item' }).first().click();
  await page.getByRole('dialog').waitFor();
  check('the item form offers both sources', (await page.locator('.sourceTabs button').count()) === 2);
  await page.locator('.sourceTabs').getByRole('button', { name: 'From a link' }).click();
  check(
    'the link source is marked as selected',
    (await page.locator('.sourceTabs').getByRole('button', { name: 'From a link' }).getAttribute('aria-pressed')) === 'true',
  );
  check('the link tab shows an address field', await page.locator('.linkRow input').isVisible());

  const refusal = await whileExpectingRejection(async () => {
    await page.locator('.linkRow input').fill('http://169.254.169.254/logo.png');
    await page.getByRole('button', { name: 'Fetch' }).click();
    await page.locator('.imageDrop .fieldError').waitFor({ timeout: 20000 });
    return page.locator('.imageDrop .fieldError').innerText();
  });
  check('an internal address is refused with a readable message', /private or internal address/.test(refusal), refusal);
  check('no image is attached after a refused link', (await page.locator('.imageDropZone.filled').count()) === 0);
  await shot(page, '03b-link-refused');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });

  await addItemFromLink(page, { name: 'Linked shirt', type: 'Shirt', url: LINK_IMAGE });
  await page.waitForFunction(() => document.querySelectorAll('.itemCard').length === 5, null, { timeout: 15000 });
  check('an item added from a link appears in the closet', (await page.locator('.itemCard').count()) === 5);
  const linkedCard = page.locator('.itemCard').filter({ hasText: 'Linked shirt' });
  check('the linked item keeps its clothing type', (await linkedCard.locator('.itemType').innerText()) === 'Shirt');
  check(
    'the linked image is served from Wear It, not the original host',
    (await linkedCard.locator('img').getAttribute('src'))?.includes('/uploads/') === true,
    await linkedCard.locator('img').getAttribute('src'),
  );
  await shot(page, '03c-link-item');

  // Removed again so the rest of the journey keeps its expected counts.
  page.once('dialog', (dialog) => dialog.accept());
  await linkedCard.getByRole('button', { name: 'Delete Linked shirt' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.itemCard').length === 4, null, { timeout: 15000 });

  section('Personal photos');
  await navLink(page, 'My photos').click();
  await page.waitForURL('**/photos');
  const photoChooser = page.waitForEvent('filechooser');
  await page.locator('.imageDropZone').click();
  await (await photoChooser).setFiles(files.person);
  await page.locator('.photoCard').first().waitFor({ timeout: 20000 });
  check('the saved photo is marked as the default', await page.locator('.photoBadge').first().isVisible());
  await shot(page, '04-photos');

  section('Outfit studio');
  await navLink(page, 'Outfit studio').click();
  await page.waitForURL('**/studio');
  await page.locator('.typeGroup').first().waitFor();
  check('items are grouped by clothing type', (await page.locator('.typeGroup').count()) === 3);

  const tshirtGroup = page.locator('.typeGroup').filter({ hasText: 'T-shirt' });
  await tshirtGroup.locator('.pickTile').nth(0).click();
  check('picking a T-shirt selects one item', (await page.locator('.selectionList li').count()) === 1);
  await tshirtGroup.locator('.pickTile').nth(1).click();
  const afterSwap = await page.locator('.selectionList li').count();
  check('a second T-shirt swaps instead of stacking', afterSwap === 1, `selected ${afterSwap}`);
  check(
    'the selection shows the newly picked T-shirt',
    (await page.locator('.selectionList li').first().innerText()).includes('T-shirt'),
  );

  await page.locator('.typeGroup').filter({ hasText: 'Pants' }).locator('.pickTile').first().click();
  await page.locator('.typeGroup').filter({ hasText: 'Jacket' }).locator('.pickTile').first().click();
  check('three different types combine into one look', (await page.locator('.selectionList li').count()) === 3);
  check('a saved photo is preselected', (await page.locator('.photoTile.selected').count()) === 1);
  await shot(page, '05-studio-selection');

  // Two clicks in one tick, exactly as a phone double-tap delivers them: React has not
  // re-rendered yet, so the disabled prop cannot be what stops the second request.
  const generateCalls = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/looks/generate')) generateCalls.push(request.url());
  });
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((element) =>
      /Generate my look/.test(element.textContent || ''),
    );
    button.click();
    button.click();
  });
  await page.locator('.resultMeta').waitFor({ timeout: 120000 });
  check('a double tap sends only one generate request', generateCalls.length === 1, `sent ${generateCalls.length}`);
  check('no error is shown alongside a successful look', (await page.locator('.studioPanel .errorNote').count()) === 0);

  section('Recovering a look when the connection drops');
  // Reproduces the real failure: the backend completes and saves the look, but the reply
  // never reaches the phone because a proxy hop gave up. The request really is performed,
  // then a 500 is handed to the page in place of the genuine response.
  await page.route('**/looks/generate', async (route) => {
    await route.fetch();
    await route.fulfill({ status: 500, contentType: 'text/html', body: '<html>gateway error</html>' });
  });
  // The same outfit is re-generated; the selection is left untouched so the later
  // assertions still describe the outfit they expect.
  await whileExpectingRejection(async () => {
    await page.getByRole('button', { name: /Generate my look/ }).click();
    await page.locator('.studioPanel .panelRule', { hasText: /connection dropped/ }).waitFor({ timeout: 30000 });
  });
  check('a dropped connection is reported as still in progress, not as a failure', true);
  check('no error banner while it recovers', (await page.locator('.studioPanel .errorNote').count()) === 0);
  await page.locator('.resultMeta').waitFor({ timeout: 180000 });
  check('the look that the backend saved is recovered and shown', await page.locator('.resultImage').first().isVisible());
  check('nothing is reported as an error afterwards', (await page.locator('.studioPanel .errorNote').count()) === 0);
  await page.unroute('**/looks/generate');

  // Drop the extra look this check produced so the gallery assertions below still hold.
  await page.evaluate(async (api) => {
    const token = localStorage.getItem('wear_it_token');
    const headers = { Authorization: `Bearer ${token}` };
    const looks = await (await fetch(`${api}/looks`, { headers })).json();
    for (const extra of looks.slice(0, looks.length - 1)) {
      await fetch(`${api}/looks/${extra._id}`, { method: 'DELETE', headers });
    }
  }, API);
  check('the generated look is displayed', await page.locator('.resultImage').first().isVisible());
  check(
    'the result names all three clothing types',
    /T-shirt \+ Pants \+ Jacket/.test(await page.locator('.resultMeta h3').innerText()),
    await page.locator('.resultMeta h3').innerText(),
  );
  await shot(page, '06-generated-look');

  section('Look gallery');
  await navLink(page, 'My looks').click();
  await page.waitForURL('**/looks');
  await page.locator('.lookCard').first().waitFor();
  check('the look is saved to the gallery', (await page.locator('.lookCard').count()) === 1);
  check('the look lists its garments', (await page.locator('.lookItems li').count()) === 3);
  await shot(page, '07-looks');

  section('Deleting a closet item keeps the look');
  await navLink(page, 'My closet').click();
  await page.waitForURL('**/closet');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete Green jacket' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.itemCard').length === 3, null, { timeout: 15000 });
  check('the item is gone from the closet', (await page.locator('.itemCard').count()) === 3);
  await navLink(page, 'My looks').click();
  await page.locator('.lookCard').first().waitFor();
  check('the generated look still shows every garment', (await page.locator('.lookItems li').count()) === 3);

  section('Session handling');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL(`${BASE}/`);
  await page.goto(`${BASE}/closet`);
  await page.waitForURL('**/login', { timeout: 15000 });
  check('a signed-out visitor cannot open the closet', page.url().includes('/login'));
  await page.getByLabel('Email').fill(member.email);
  await page.getByLabel('Password').fill(member.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/closet', { timeout: 20000 });
  await page.waitForFunction(() => document.querySelectorAll('.itemCard').length === 3, null, { timeout: 20000 });
  check('signing back in restores the closet', (await page.locator('.itemCard').count()) === 3);

  section('Admin CMS is closed to members');
  await page.goto(`${BASE}/admin`);
  await page.waitForURL('**/admin/login', { timeout: 15000 });
  check('a member session cannot open the CMS', page.url().includes('/admin/login'));

  const memberLogin = await whileExpectingRejection(() =>
    page.evaluate(async ([api, credentials]) => {
      const response = await fetch(`${api}/clothing-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('wear_it_token')}` },
        body: JSON.stringify(credentials),
      });
      return response.status;
    }, [API, { name: 'Sneaky', slug: 'sneaky' }]),
  );
  check('a member token is rejected by the admin API', memberLogin === 403, `status ${memberLogin}`);

  section('Admin CMS');
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Password').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(`${BASE}/admin`, { timeout: 20000 });
  await page.locator('.statCard').first().waitFor();
  check('the dashboard shows member counts', (await page.locator('.statCard').count()) === 4);
  await shot(page, '08-admin-overview');

  await adminLink(page, 'Clothing types').click();
  await page.waitForURL('**/admin/types');
  await page.locator('.adminTable tbody tr').first().waitFor();
  // The table pages at ten rows, so the count of every type comes from the pager.
  const totalTypes = () =>
    page.evaluate(() => {
      const pager = document.querySelector('.tablePagination');
      return pager ? Number(pager.dataset.total) : document.querySelectorAll('.adminTable tbody tr').length;
    });
  const typeRows = await page.locator('.adminTable tbody tr').count();
  const typeTotal = await totalTypes();
  check('a page of clothing types is listed', typeRows === Math.min(typeTotal, 10), `rows ${typeRows} of ${typeTotal}`);
  check('every clothing type is counted', typeTotal >= 14, `total ${typeTotal}`);
  check(
    'a type still in use cannot be deleted',
    await page.getByRole('button', { name: 'Delete T-shirt' }).isDisabled(),
  );

  await page.getByRole('button', { name: 'Add type' }).click();
  await page.getByRole('dialog').waitFor();
  // The dialog now carries a name per language.
  await page.getByLabel('Name in English').fill(`QA Cape ${stamp}`);
  await page.getByLabel('Name in Arabic').fill(`عباءة ${stamp}`);
  await page.getByRole('button', { name: 'Save type' }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15000 });
  // Saving jumps to whichever page the new type sorted onto, so look for the row itself.
  await page.getByRole('cell', { name: `QA Cape ${stamp}`, exact: true }).first().waitFor({ timeout: 15000 });
  check('the new clothing type is saved', (await totalTypes()) === typeTotal + 1, `total ${await totalTypes()}`);
  await shot(page, '09-admin-types');

  await adminLink(page, 'Members').click();
  await page.waitForURL('**/admin/members');
  await page.locator('.adminTable tbody tr').first().waitFor();
  check('the member appears with closet activity', await page.getByText(member.email).isVisible());

  await adminLink(page, 'Site content').click();
  await page.waitForURL('**/admin/content');
  // Each field is a fieldset with one input per language.
  const heroField = page.locator('.contentField').filter({ hasText: 'Hero title' });
  await heroField.getByLabel('In English').waitFor({ timeout: 20000 });
  const arabicHeroBefore = await heroField.getByLabel('In Arabic').inputValue();
  await heroField.getByLabel('In English').fill(`QA hero ${stamp}`);
  await page.getByRole('button', { name: 'Save content' }).click();
  await page.getByText('Site content saved.').waitFor({ timeout: 15000 });
  check('site content saves from the CMS', true);
  check(
    'editing the English copy leaves the Arabic copy untouched',
    (await heroField.getByLabel('In Arabic').inputValue()) === arabicHeroBefore,
    arabicHeroBefore,
  );

  const visitor = await context.newPage();
  await visitor.goto(BASE);
  let heroUpdated = true;
  try {
    await visitor.getByRole('heading', { level: 1, name: `QA hero ${stamp}` }).waitFor({ timeout: 20000 });
  } catch {
    heroUpdated = false;
  }
  check('the public hero reflects the CMS edit', heroUpdated, await visitor.locator('h1').first().innerText());
  await visitor.close();

  section('Small screens');
  // Carries the signed-in session across so the guarded pages actually render their forms
  // instead of bouncing to the sign-in screen.
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    storageState: await context.storageState(),
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(BASE, { waitUntil: 'networkidle' });
  check('the burger menu replaces the nav', await mobilePage.locator('.mobileMenu').isVisible());
  await mobilePage.locator('.mobileMenu').click();
  check('the menu opens', await mobilePage.locator('.navLinks.navOpen').isVisible());
  const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('the landing page does not scroll sideways', overflow <= 1, `overflow ${overflow}px`);

  // The header must stay on one row: brand, action and menu button all fit or the label drops.
  const headerFits = await mobilePage.evaluate(() => {
    const header = document.querySelector('.siteHeader');
    const brand = document.querySelector('.brand');
    if (!header || !brand) return null;
    return {
      header: Math.round(header.getBoundingClientRect().height),
      brandLines: Math.round(brand.getBoundingClientRect().height),
    };
  });
  check('the phone header stays on one row', (headerFits?.header ?? 0) <= 70, JSON.stringify(headerFits));
  check('the brand name does not wrap', (headerFits?.brandLines ?? 0) <= 40, JSON.stringify(headerFits));

  // iOS Safari zooms the whole page when a focused control is under 16px. Walk the pages
  // that have forms and confirm nothing falls below the threshold.
  const smallControls = [];
  for (const [path, open] of [
    ['/login', null],
    ['/register', null],
    ['/closet', async (target) => {
      await target.getByRole('button', { name: /Add item|Add your first item/ }).first().click();
      await target.getByRole('dialog').waitFor();
      await target.locator('.sourceTabs').getByRole('button', { name: 'From a link' }).click();
    }],
    ['/studio', null],
    ['/photos', null],
  ]) {
    await mobilePage.goto(`${BASE}${path}`);
    await mobilePage.locator('input, select, textarea').first().waitFor({ timeout: 20000 }).catch(() => {});
    if (open) await open(mobilePage).catch(() => {});
    const undersized = await mobilePage.evaluate(
      (page) =>
        [...document.querySelectorAll('input:not([type=hidden]):not([type=file]), select, textarea')]
          .map((element) => ({
            where: `${page} ${element.tagName.toLowerCase()}.${element.className || '-'}`,
            size: parseFloat(getComputedStyle(element).fontSize),
          }))
          .filter((entry) => entry.size < 16),
      path,
    );
    smallControls.push(...undersized);
  }
  check(
    'no form control is small enough to make iOS zoom on focus',
    smallControls.length === 0,
    smallControls.map((entry) => `${entry.where}=${entry.size}px`).join(', '),
  );
  if (SHOTS) {
    mkdirSync(SHOTS, { recursive: true });
    await mobilePage.screenshot({ path: join(SHOTS, '10-mobile.png'), fullPage: true });
  }
  await mobile.close();

  section('Arabic is the default language');
  // Keep the signed-in session but drop the pinned locale, so this context falls back to
  // whatever the app defaults to while still being able to open the closet.
  const signedInState = await context.storageState();
  for (const origin of signedInState.origins ?? []) {
    origin.localStorage = (origin.localStorage ?? []).filter((entry) => entry.name !== 'wear_it_locale');
  }
  const arabic = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: signedInState });
  const arabicPage = await arabic.newPage();
  arabicPage.on('pageerror', (error) => consoleErrors.push(`ar :: ${error.message}`));
  await arabicPage.goto(BASE);
  await arabicPage.locator('.stepCard').first().waitFor({ timeout: 20000 });

  const documentState = await arabicPage.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
  }));
  check('a first-time visitor gets Arabic', documentState.lang === 'ar', JSON.stringify(documentState));
  check('the page is laid out right-to-left', documentState.dir === 'rtl', JSON.stringify(documentState));

  const hasArabic = (value) => /[\u0600-\u06FF]/.test(value);
  check('the hero headline is in Arabic', hasArabic(await arabicPage.locator('h1').first().innerText()));
  check(
    'the how-it-works steps are in Arabic',
    (await arabicPage.locator('.stepCard h3').allInnerTexts()).every(hasArabic),
  );
  check('the navigation is in Arabic', (await arabicPage.locator('header nav a').allInnerTexts()).every(hasArabic));

  // A key that was never translated renders as "group.key"; nothing should look like that.
  const rawKeys = await arabicPage.evaluate(() => {
    const groups =
      'common|nav|home|login|register|closet|photos|studio|looks|imageDrop|states|guard|admin|errors';
    const pattern = new RegExp(`\\b(${groups})\\.[a-zA-Z][a-zA-Z0-9]*\\b`);
    return [...document.querySelectorAll('body *')]
      .filter((element) => element.children.length === 0)
      .map((element) => (element.textContent || '').trim())
      .filter((value) => pattern.test(value));
  });
  check('no untranslated keys are rendered', rawKeys.length === 0, rawKeys.slice(0, 3).join(' | '));

  const rtlOverflow = await arabicPage.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check('the Arabic layout does not scroll sideways', rtlOverflow <= 1, `overflow ${rtlOverflow}px`);

  if (SHOTS) {
    mkdirSync(SHOTS, { recursive: true });
    await arabicPage.screenshot({ path: join(SHOTS, '11-arabic-desktop.png'), fullPage: true });
  }

  // Clothing type names are admin-managed content, not UI strings, so they need their own
  // Arabic label to avoid English leaking into an otherwise Arabic screen.
  await arabicPage.goto(`${BASE}/closet`);
  await arabicPage.locator('.itemCard').first().waitFor({ timeout: 20000 });
  const chips = await arabicPage.locator('.itemType').allInnerTexts();
  check('clothing type chips are in Arabic', chips.length > 0 && chips.every(hasArabic), chips.join(', '));

  const options = await arabicPage.locator('.filterSelect option').allInnerTexts();
  check('the clothing type filter lists Arabic names', options.slice(1).every(hasArabic), options.slice(1, 4).join(', '));

  await arabicPage.goto(`${BASE}/looks`);
  await arabicPage.locator('.lookCard').first().waitFor({ timeout: 20000 });
  check(
    'a saved look shows its garment types in Arabic',
    hasArabic(await arabicPage.locator('.lookBody strong').first().innerText()),
    await arabicPage.locator('.lookBody strong').first().innerText(),
  );
  await arabicPage.goto(BASE);
  await arabicPage.locator('.stepCard').first().waitFor({ timeout: 20000 });

  // The switch must flip the document, and the choice must survive a reload.
  await arabicPage.locator('.desktopLanguage .languageSwitch').click();
  await arabicPage.waitForFunction(() => document.documentElement.dir === 'ltr', null, { timeout: 10000 });
  check('switching to English flips the direction', true);
  await arabicPage.reload();
  await arabicPage.locator('.stepCard').first().waitFor({ timeout: 20000 });
  const afterReload = await arabicPage.evaluate(() => document.documentElement.lang);
  check('the language choice survives a reload', afterReload === 'en', afterReload);

  const arabicMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const arabicMobilePage = await arabicMobile.newPage();
  await arabicMobilePage.goto(BASE);
  await arabicMobilePage.locator('.stepCard').first().waitFor({ timeout: 20000 });
  const mobileRtlOverflow = await arabicMobilePage.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check('Arabic on a phone does not scroll sideways', mobileRtlOverflow <= 1, `overflow ${mobileRtlOverflow}px`);
  if (SHOTS) {
    await arabicMobilePage.screenshot({ path: join(SHOTS, '12-arabic-mobile.png'), fullPage: true });
  }
  await arabic.close();
  await arabicMobile.close();

  section('Console health');
  const noisy = consoleErrors.filter((entry) => !/favicon|Download the React DevTools/i.test(entry));
  check('no uncaught console errors during the journey', noisy.length === 0, noisy.slice(0, 4).join(' | '));

  await browser.close();

  console.log(`\n${failures.length ? 'FAILED' : 'PASSED'} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    failures.forEach((failure) => console.log(`  - ${failure}`));
    process.exit(1);
  }
}

run().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
