import {test, expect, devices} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {desktopPlatform} from '../src/lib/desktop-platform';
import {mkdirSync} from 'node:fs';

test('desktop platform detection excludes mobile and unknown devices', () => {
  expect(desktopPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32', 0)).toBe('windows');
  expect(desktopPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)', 'MacIntel', 0)).toBe('macos');
  expect(desktopPlatform('Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64', 0)).toBe('linux');
  expect(desktopPlatform('Mozilla/5.0 (Linux; Android 15)', 'Linux armv8l', 5)).toBeNull();
  expect(desktopPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)', 'iPhone', 5)).toBeNull();
  expect(desktopPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 'MacIntel', 5)).toBeNull();
  expect(desktopPlatform('Mozilla/5.0 (X11; CrOS x86_64)', 'Linux x86_64', 0)).toBeNull();
  expect(desktopPlatform('Unknown', '', 0)).toBeNull();
});

test('verified app link, honest request status and manual web fallback', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/ko?item=claude');
  const appLink = page.getByRole('link', {name: 'Claude — 앱으로 열기', exact: true});
  await expect(appLink).toHaveAttribute('href', 'claude://claude.ai/new');
  const website = page.getByRole('link', {name: /Claude — 사이트 열기/});
  await expect(website).toHaveAttribute('href', 'https://claude.ai');
  await expect(page.getByRole('link', {name: /Claude — 앱 설치 안내/})).toHaveAttribute('href', 'https://claude.com/download');

  // Prevent only the OS handoff in automation. This test must not launch or
  // install a native app, and does not claim that the OS handoff was verified.
  await appLink.evaluate(element => element.addEventListener('click', event => event.preventDefault(), {capture: true, once: true}));
  await appLink.click();
  await expect(page.getByRole('status')).toContainText('앱 열기를 요청했어요.');
  await expect(page.getByRole('status')).toContainText('열리지 않으면 사이트를 이용하거나 앱을 설치해 주세요.');
  await expect(website).toBeVisible();
  await expect(page).toHaveURL(/\/ko\?item=claude$/);
  const result = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
  mkdirSync('output/qa', {recursive: true});
  await page.screenshot({path: 'output/qa/desktop-app-launch.png'});
});

test('unverified services do not expose a guessed launch URL', async ({page}) => {
  await page.goto('/en?item=chatgpt');
  await expect(page.getByRole('dialog', {name: 'ChatGPT', exact: true})).toBeVisible();
  await expect(page.locator('[data-desktop-launch]')).toHaveCount(0);
  await expect(page.getByRole('link', {name: /ChatGPT — Open website/})).toBeVisible();
  await page.goto('/en?item=claude');
  await expect(page.getByRole('link', {name: 'Claude — Open desktop app', exact: true})).toBeVisible();
});

test('mobile devices and narrow windows keep website-only controls', async ({browser, page}) => {
  const context = await browser.newContext({...devices['iPhone 13'], baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:3000'});
  const mobile = await context.newPage();
  await mobile.goto('/ko?item=claude');
  await expect(mobile.getByRole('dialog')).toBeVisible();
  await expect(mobile.locator('[data-desktop-launch]')).toHaveCount(0);
  await expect(mobile.getByRole('link', {name: /Claude — 사이트 열기/})).toBeVisible();
  await context.close();
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/ko?item=claude');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('[data-desktop-launch]')).toBeHidden();
});
