import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdirSync} from 'node:fs';
mkdirSync('output/qa', {recursive: true});

test('desktop shelf, rollover, and keyboard/history navigation', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/ko');
  await expect(page.locator('.ai-card')).toHaveCount(9);
  await expect(page.locator('.shelf-row')).toHaveCount(2);
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.locator('.service-logo').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBeTruthy();
  await page.screenshot({path: 'output/qa/desktop.png', fullPage: true});
  const card = page.locator('[data-item="chatgpt"]');
  const before = await card.locator('.card-object').boundingBox();
  await card.hover();
  await expect(card.locator('.card-actions')).toBeVisible();
  await expect.poll(async () => (await card.locator('.card-object').boundingBox())!.y).toBeLessThan(before!.y - 4);
  await page.screenshot({path: 'output/qa/desktop-hover.png', fullPage: true});
  const details = page.getByRole('button', {name: 'ChatGPT — 설명', exact: true});
  await details.click();
  await expect(page).toHaveURL(/item=chatgpt/);
  await expect(page.getByRole('dialog', {name: 'ChatGPT', exact: true})).toBeVisible();
  await expect(page.getByRole('link', {name: /ChatGPT — 사이트 열기/})).toHaveAttribute('href', 'https://chatgpt.com');
  await page.getByRole('button', {name: '자세히 알아보기'}).click();
  await expect(page.getByText('이런 일을 할 수 있어요')).toBeVisible();
  await page.screenshot({path: 'output/qa/desktop-detail.png'});
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(details).toBeFocused();
  await details.press('Enter');
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goForward();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', {name: '닫기', exact: true}).click();
  await expect(page).not.toHaveURL(/item=/);
  expect(errors).toEqual([]);
});

test('search and categories preserve the collection', async ({page}) => {
  await page.goto('/ko');
  await page.getByRole('button', {name: '문서', exact: true}).click();
  await expect(page.locator('.ai-card:not(.is-dimmed)')).toHaveCount(2);
  await page.getByRole('button', {name: 'AI 검색', exact: true}).click();
  await page.getByRole('textbox', {name: 'AI 검색', exact: true}).fill('Notebook');
  await expect(page.locator('.ai-card')).toHaveCount(1);
  await page.getByRole('textbox').fill('no-such-service');
  await expect(page.getByText('아직 그 AI는 선반에 없어요.')).toBeVisible();
  await page.getByRole('button', {name: '모두 둘러보기'}).click();
  await expect(page.locator('.ai-card')).toHaveCount(9);
});

test('responsive shelves and touch detail', async ({page}) => {
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({width, height: 844});
    await page.goto('/ko');
    await expect(page.locator('.shelf-row')).toHaveCount(width < 640 ? 5 : width < 1024 ? 3 : 2);
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/ko');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({path: 'output/qa/mobile.png', fullPage: true});
  await page.getByRole('button', {name: 'ChatGPT — 설명', exact: true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const dialog = await page.getByRole('dialog').boundingBox();
  expect(dialog!.x).toBe(0);
  await expect.poll(async () => {const bounds = await page.getByRole('dialog').boundingBox(); return Math.round(bounds!.y + bounds!.height);}).toBe(844);
  await page.screenshot({path: 'output/qa/mobile-detail.png'});
  await page.getByRole('button', {name: '닫기', exact: true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('preferences persist, English navigation and large mobile text', async ({page}) => {
  await page.goto('/ko');
  await page.getByRole('button', {name: '보기 설정', exact: true}).click();
  await page.getByRole('button', {name: '어둡게', exact: true}).click();
  await page.getByRole('button', {name: '감귤', exact: true}).click();
  await page.getByRole('button', {name: 'Aa 아주 크게', exact: true}).click();
  await page.getByLabel('언어', {exact: true}).selectOption('en');
  await expect(page).toHaveURL(/\/en/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'tangerine');
  await expect(page.locator('html')).toHaveAttribute('data-scale', '130');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.setViewportSize({width: 360, height: 800});
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({path: 'output/qa/mobile-dark-english-large.png', fullPage: true});
  await page.getByRole('button', {name: 'View settings', exact: true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBeTruthy();
});

test('accessibility of homepage and detail, all theme contrasts', async ({page}) => {
  await page.goto('/ko');
  let results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole('button', {name: 'ChatGPT — 설명', exact: true}).click();
  await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1');
  results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: '보기 설정', exact: true}).click();
  for (const appearance of ['밝게', '어둡게']) {
    await page.getByRole('button', {name: appearance, exact: true}).click();
    for (const palette of ['갤러리', '오션', '감귤', '숲']) {
      await page.getByRole('button', {name: palette, exact: true}).click();
      const contrast = await page.evaluate(() => {
        const css = getComputedStyle(document.documentElement);
        const lum = (name: string) => {
          const hex = css.getPropertyValue(name).trim().replace('#', '');
          const expanded = hex.length === 3 ? hex.split('').map(c => c+c).join('') : hex;
          const rgb = [0,2,4].map(offset => parseInt(expanded.slice(offset, offset+2),16)/255).map(c => c <= .04045 ? c/12.92 : ((c+.055)/1.055)**2.4);
          return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
        };
        const a = lum('--accent'), b = lum('--on-accent');
        return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('reduced motion keeps rollover stationary', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/ko');
  const card = page.locator('[data-item="claude"]');
  await card.hover();
  await expect(card.locator('.card-object')).toHaveCSS('transform', 'none');
  await expect(card.locator('.card-actions')).toBeVisible();
});
