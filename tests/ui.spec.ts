import { expect, Page, test } from '@playwright/test';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const TEST_BACKGROUND_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAJElEQVR4AYTIsQ0AAAgCQcN+OLWtM2FobfjkmodIWe/IUK88DgAA//8IEdDbAAAABklEQVQDAIdWCvWZ5Vn3AAAAAElFTkSuQmCC',
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
  await expect(page.locator('ins.adsbygoogle[data-ad-slot="7502566555"]')).toHaveAttribute('data-ad-client', 'ca-pub-5968986592421768');
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
  await expect(page.locator('#card-capture-target [data-card-background-overlay]')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.32)');
  const averageBackgroundChannel = await previewBackground.evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const context = canvas.getContext('2d');
    if (!context) return 0;
    context.drawImage(image, 0, 0, 4, 4);
    const pixels = context.getImageData(0, 0, 4, 4).data;
    let total = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      total += pixels[index] + pixels[index + 1] + pixels[index + 2];
    }
    return total / (pixels.length / 4) / 3;
  });
  expect(averageBackgroundChannel).toBeGreaterThan(40);
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

test('saved card keeps theme highlights and custom text colors', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'PNG color export is covered once on desktop.');
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  await page.goto('/#cardnews', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: /직접 입력/ }).click();
  await page.getByRole('textbox', { name: '1페이지 제목' }).fill('**원고부터** 사용자색 **디자인**');
  await page.getByRole('button', { name: '카드뉴스 미리보기' }).click();
  await page.getByRole('button', { name: '1번 배경 테마', exact: true }).click();

  const greenBackgroundDataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    context.fillStyle = '#173b32';
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  });
  await page.getByLabel('배경 이미지 파일').setInputFiles({
    name: 'solid-green.png',
    mimeType: 'image/png',
    buffer: Buffer.from(greenBackgroundDataUrl.split(',')[1], 'base64'),
  });
  await expect(page.getByText('배경 적용됨')).toBeVisible();
  const strokeWidth = page.getByRole('slider', { name: '글자 외곽선', exact: true });
  await expect(strokeWidth).toHaveAttribute('max', '8');
  await strokeWidth.fill('8');

  await page.getByRole('button', { name: '디자인 및 텍스트 수정' }).click();
  await page.locator('[contenteditable="true"]').first().evaluate((editor) => {
    editor.innerHTML = '<b>원고부터</b> <span style="color: #facc15;">사용자색</span> <b>디자인</b>';
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  });

  const exportRoot = page.locator('#export-slide-inner-0');
  const exportedHighlights = exportRoot.locator('[data-card-theme-highlight]');
  await expect(exportedHighlights).toHaveCount(2);
  await expect(exportRoot.locator('[data-card-text="header"]')).toHaveCSS('-webkit-text-stroke-width', '8px');
  await expect(exportedHighlights.first()).toHaveCSS('color', 'rgb(255, 0, 85)');
  await expect(exportedHighlights.last()).toHaveCSS('color', 'rgb(255, 0, 85)');
  const exportedCustomColor = exportRoot.getByText('사용자색', { exact: true });
  await expect(exportedCustomColor).toHaveCSS('color', 'rgb(250, 204, 21)');

  const regions = await Promise.all([
    exportedHighlights.first().evaluate((element) => {
      const root = document.getElementById('export-slide-inner-0')!;
      const rootRect = root.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      return { x: rect.x - rootRect.x, y: rect.y - rootRect.y, width: rect.width, height: rect.height };
    }),
    exportedCustomColor.evaluate((element) => {
      const root = document.getElementById('export-slide-inner-0')!;
      const rootRect = root.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      return { x: rect.x - rootRect.x, y: rect.y - rootRect.y, width: rect.width, height: rect.height };
    }),
  ]);

  await page.getByRole('button', { name: '완료' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '현재 장 저장' }).click();
  const download = await downloadPromise;
  const outputPath = testInfo.outputPath('card-export-colors.png');
  await download.saveAs(outputPath);
  const pngDataUrl = `data:image/png;base64,${(await readFile(outputPath)).toString('base64')}`;
  const pixelCounts = await page.evaluate(async ({ imageUrl, regions }) => {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    context.drawImage(image, 0, 0);
    const scaleX = image.naturalWidth / 384;
    const scaleY = image.naturalHeight / 480;
    const countColor = (region: { x: number; y: number; width: number; height: number }, target: [number, number, number]) => {
      const x = Math.max(0, Math.floor(region.x * scaleX));
      const y = Math.max(0, Math.floor(region.y * scaleY));
      const width = Math.min(image.naturalWidth - x, Math.ceil(region.width * scaleX));
      const height = Math.min(image.naturalHeight - y, Math.ceil(region.height * scaleY));
      const pixels = context.getImageData(x, y, width, height).data;
      let count = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (
          Math.abs(pixels[index] - target[0]) <= 18
          && Math.abs(pixels[index + 1] - target[1]) <= 18
          && Math.abs(pixels[index + 2] - target[2]) <= 18
          && pixels[index + 3] > 200
        ) count += 1;
      }
      return count;
    };
    return {
      themeHighlight: countColor(regions[0], [255, 0, 85]),
      customYellow: countColor(regions[1], [250, 204, 21]),
    };
  }, { imageUrl: pngDataUrl, regions });

  expect(pixelCounts.themeHighlight).toBeGreaterThan(25);
  expect(pixelCounts.customYellow).toBeGreaterThan(25);
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
