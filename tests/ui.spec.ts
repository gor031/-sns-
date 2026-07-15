import { expect, Page, test } from '@playwright/test';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const TEST_BACKGROUND_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR42mP8z8AARAwMjIwgAQAEEgEBDpq2WQAAAABJRU5ErkJggg==',
  'base64',
);

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
}

test('main creation tools and direct card flow render without overflow', async ({ page }, testInfo) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '모두뚝딱', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /카드뉴스 만들기/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /음성 만들기/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /자막 만들기/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });

  await page.getByRole('button', { name: /카드뉴스 만들기/ }).click();
  await expect(page).toHaveURL(/#cardnews$/);
  await expect(page.getByRole('button', { name: '디자인 스튜디오 점검 중' })).toBeDisabled();
  await page.getByRole('tab', { name: /직접 입력/ }).click();
  await page.getByRole('textbox', { name: '1페이지 제목' }).fill('AI 모임을 오래 운영하는 법');
  await page.getByRole('textbox', { name: '2페이지 제목' }).fill('작게 시작하고 꾸준히 반복하기');
  await page.getByRole('textbox', { name: '2페이지 본문' }).fill('참여자의 질문을 기록하고 다음 수업에 반영하세요.');
  await page.getByLabel('서명').fill('모두뚝딱');
  await page.getByRole('button', { name: '카드뉴스 미리보기' }).click();
  await expect(page.getByText('AI 모임을 오래 운영하는 법').first()).toBeVisible();
  await expect(page.getByText('모두뚝딱').last()).toBeVisible();
  await page.getByLabel('배경 이미지 파일').setInputFiles({
    name: 'background.png',
    mimeType: 'image/png',
    buffer: TEST_BACKGROUND_PNG,
  });
  await expect(page.getByText('배경 적용됨')).toBeVisible();
  await expect(page.getByText('background.png', { exact: true })).toBeVisible();
  const previewBackground = page.locator('#card-capture-target [data-card-background]');
  await expect(previewBackground).toBeVisible();
  await expect.poll(() => previewBackground.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByText('SNS용 제목·본문')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('card-direct.png'), fullPage: true });
  await page.getByRole('button', { name: '배경 이미지 삭제' }).click();
  await expect(previewBackground).toHaveCount(0);

  await page.getByRole('button', { name: '도구 선택으로 돌아가기' }).click();
  await page.getByRole('button', { name: /음성 만들기/ }).click();
  await expect(page.getByRole('heading', { name: '음성 만들기' })).toBeVisible();
  await expect(page.getByLabel('음성 원고')).toBeVisible();
  await expect(page.getByLabel('목소리')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('voice.png'), fullPage: true });

  await page.getByRole('button', { name: '도구 선택으로 돌아가기' }).click();
  await page.getByRole('button', { name: /자막 만들기/ }).click();
  await expect(page.getByRole('heading', { name: '영상 또는 음원 선택' })).toBeVisible();
  await expect(page.getByRole('button', { name: '파일 열기' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('subtitles-empty.png'), fullPage: true });
});

test('subtitle media flow exports SRT and burned MP4', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'FFmpeg export is covered once on desktop.');
  test.setTimeout(240_000);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  await page.route('**/api/transcribe', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      text: '모두뚝딱 자막 내보내기 테스트입니다',
      segments: [{ start: 0, end: 1.8, text: '모두뚝딱 자막 내보내기 테스트입니다' }],
    }),
  }));

  await page.goto('/#subtitles', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="file"]').setInputFiles(path.resolve('tests/fixtures/subtitle-sample.mp4'));
  await expect(page.getByRole('button', { name: '자동 자막 만들기' })).toBeVisible();
  await page.getByRole('button', { name: '자동 자막 만들기' }).click();
  await expect(page.getByRole('heading', { name: '자막 편집' })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole('textbox', { name: '1번 자막 내용' })).toHaveValue('모두뚝딱 자막 내보내기');
  await expect(page.getByRole('textbox', { name: '2번 자막 내용' })).toHaveValue('테스트입니다');

  await page.getByRole('button', { name: '노란색' }).click();
  await page.getByRole('button', { name: '상단' }).click();
  await page.getByRole('button', { name: '2번 자막을 이전 자막과 합치기' }).click();
  await expect(page.getByText('1개', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '1번 자막 나누기' }).click();
  await expect(page.getByText('2개', { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('subtitles-editor.png'), fullPage: true });

  const srtDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'SRT 저장' }).click();
  const srtDownload = await srtDownloadPromise;
  expect(srtDownload.suggestedFilename()).toMatch(/\.srt$/);

  const videoDownloadPromise = page.waitForEvent('download', { timeout: 120_000 });
  await page.getByRole('button', { name: '자막 MP4 저장' }).click();
  const videoDownload = await videoDownloadPromise;
  expect(videoDownload.suggestedFilename()).toMatch(/\.mp4$/);
  const videoPath = await videoDownload.path();
  expect(videoPath).toBeTruthy();
  expect((await stat(videoPath!)).size).toBeGreaterThan(1_000);
});
