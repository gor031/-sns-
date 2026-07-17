import { expect, Page, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
}

test('logged-out users see auth gate and public legal pages', async ({ page }, testInfo) => {
  await page.route(/(googlesyndication|doubleclick|googleadservices|fundingchoicesmessages)\.com/, (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: '모두뚝딱', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Google 로그인' })).toBeVisible();
  await expect(page.getByRole('button', { name: /카드뉴스 만들기/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('auth-home.png'), fullPage: true });

  await page.getByRole('button', { name: /카드뉴스 만들기/ }).click();
  await expect(page).toHaveURL(/#cardnews$/);
  await expect(page.getByRole('heading', { name: '로그인이 필요합니다' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Google로 계속' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('auth-gate.png'), fullPage: true });

  await page.getByRole('button', { name: '개인정보처리방침' }).click();
  await expect(page).toHaveURL(/#privacy$/);
  await expect(page.getByRole('heading', { name: '개인정보처리방침' })).toBeVisible();
  await expect(page.getByText('Firebase ID 토큰 및 App Check 검증')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('privacy.png'), fullPage: true });

  await page.getByRole('button', { name: '이전 화면으로 돌아가기' }).click();
  await page.getByRole('button', { name: '이용약관' }).click();
  await expect(page).toHaveURL(/#terms$/);
  await expect(page.getByRole('heading', { name: '이용약관' })).toBeVisible();
  await expect(page.getByText('현재 웹 서비스는 무료로 제공됩니다.')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
