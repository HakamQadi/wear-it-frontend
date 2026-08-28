import { createHmac } from 'crypto';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3005';
const API = process.env.API_URL || 'http://127.0.0.1:4100/api';
const SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_qa';
const ADMIN = { email: process.env.ADMIN_EMAIL || 'admin@wearit.local', password: process.env.ADMIN_PASSWORD || 'WearIt123!' };
let passed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${API}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json().catch(() => null) };
}

async function webhook(object) {
  const raw = JSON.stringify({ id: `evt_ui_${Date.now()}`, type: 'customer.subscription.updated', data: { object } });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', SECRET).update(`${timestamp}.${raw}`).digest('hex');
  return fetch(`${API}/billing/stripe/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': `t=${timestamp},v1=${signature}` }, body: raw });
}

async function run() {
  const stamp = Date.now().toString(36);
  const member = { name: 'Billing Browser QA', email: `billing-ui-${stamp}@wearit.test`, password: 'WearItQA123!' };
  const registration = await api('/auth/register', { method: 'POST', body: member });
  const token = registration.data?.accessToken;
  const userId = registration.data?.user?.id;
  const adminLogin = await api('/auth/login', { method: 'POST', body: ADMIN });
  const adminToken = adminLogin.data?.accessToken;
  if (!token || !userId || !adminToken) throw new Error('Could not create QA sessions');

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(({ memberToken, admin }) => {
    localStorage.setItem('wear_it_locale', 'en');
    localStorage.setItem('wear_it_token', memberToken);
    localStorage.setItem('wear_it_admin_token', admin);
  }, { memberToken: token, admin: adminToken });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  try {
    await page.goto(`${BASE}/billing`);
    await page.getByRole('heading', { name: /Choose how many AI looks/ }).waitFor();
    check('member billing page renders Free', await page.getByRole('heading', { name: 'Free' }).count() > 0);
    check('member billing page renders Pro', await page.getByRole('heading', { name: 'Pro' }).count() > 0);
    check('default usage renders 0 of 3', await page.getByText('Used 0 of 3 generations').count() > 0);
    check('default Pro price renders', await page.getByText(/\$9\.99|US\$9\.99/).count() > 0);
    check('default Pro allowance renders', await page.getByText('30 AI look generations / month').count() > 0);

    await Promise.all([
      page.waitForURL(/127\.0\.0\.1:4998\/checkout\/qa/),
      page.getByRole('button', { name: 'Upgrade to Pro' }).click(),
    ]);
    check('Upgrade opens hosted checkout', /\/checkout\/qa/.test(page.url()), page.url());

    const now = Math.floor(Date.now() / 1000);
    const response = await webhook({
      id: 'sub_ui_qa', customer: 'cus_ui_qa', status: 'active', cancel_at_period_end: false,
      current_period_start: now, current_period_end: now + 30 * 86400,
      metadata: { userId, planTier: 'pro' },
    });
    check('browser QA activation webhook succeeds', response.ok, `status ${response.status}`);

    await page.goto(`${BASE}/billing`);
    await page.getByText('Used 0 of 30 generations').waitFor();
    check('activated member sees Pro usage', await page.getByText('Used 0 of 30 generations').count() > 0);
    await Promise.all([
      page.waitForURL(/127\.0\.0\.1:4998\/portal\/qa/),
      page.getByRole('button', { name: 'Manage billing' }).click(),
    ]);
    check('Manage billing opens Stripe portal', /\/portal\/qa/.test(page.url()), page.url());

    await page.goto(`${BASE}/admin/plans`);
    await page.getByRole('heading', { name: 'Plans & pricing' }).waitFor();
    const proForm = page.locator('form').filter({ hasText: 'Paid monthly subscription' });
    await proForm.getByLabel('Monthly price').fill('10.49');
    await proForm.getByLabel('Generations per month').fill('32');
    await proForm.getByRole('button', { name: 'Save plan' }).click();
    await page.getByText('Plan saved.').waitFor();
    const changed = await api('/admin/plans', { token: adminToken });
    const pro = changed.data?.find((plan) => plan.tier === 'pro');
    check('admin UI changes Pro price', pro?.priceCents === 1049, JSON.stringify(pro));
    check('admin UI changes Pro generation limit', pro?.generationLimit === 32, JSON.stringify(pro));
    check('no browser page errors were emitted', consoleErrors.length === 0, consoleErrors.join(' | '));
  } finally {
    await api('/admin/plans/pro', { method: 'PATCH', token: adminToken, body: { priceCents: 999, generationLimit: 30, isActive: true } });
    await browser.close();
  }

  console.log(`\n${failures.length ? 'FAILED' : 'PASSED'} — ${passed} passed, ${failures.length} failed`);
  if (failures.length) { failures.forEach((failure) => console.log(`  - ${failure}`)); process.exit(1); }
}

run().catch((error) => { console.error(error); process.exit(1); });
