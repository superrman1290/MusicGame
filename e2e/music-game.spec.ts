import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API_URL = 'http://127.0.0.1:3101';
const GAME_URL = 'http://127.0.0.1:5273';
const EDITOR_URL = 'http://127.0.0.1:5274';

function sineWave(durationMs: number, sampleRate = 8000): Buffer {
  const samples = Math.round(durationMs / 1000 * sampleRate);
  const output = Buffer.alloc(44 + samples * 2);
  output.write('RIFF', 0); output.writeUInt32LE(36 + samples * 2, 4); output.write('WAVEfmt ', 8);
  output.writeUInt32LE(16, 16); output.writeUInt16LE(1, 20); output.writeUInt16LE(1, 22);
  output.writeUInt32LE(sampleRate, 24); output.writeUInt32LE(sampleRate * 2, 28); output.writeUInt16LE(2, 32);
  output.writeUInt16LE(16, 34); output.write('data', 36); output.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index += 1) output.writeInt16LE(Math.round(Math.sin(index / sampleRate * Math.PI * 880) * 7000), 44 + index * 2);
  return output;
}

async function selectSong(page: Page, request: APIRequestContext, songId: string): Promise<void> {
  await expect(page.locator('#game')).toHaveAttribute('data-scene', 'song-select');
  const response = await request.get(`${API_URL}/api/songs`);
  const songs = await response.json() as Array<{ id: string }>;
  const index = songs.findIndex((song) => song.id === songId);
  expect(index).toBeGreaterThanOrEqual(0);
  const canvas = page.locator('canvas'); const box = await canvas.boundingBox();
  if (!box) throw new Error('Game canvas is not visible');
  const scale = box.width / 960;
  await page.mouse.click(box.x + 400 * scale, box.y + (230 + index * 94) * scale);
}

test('editor publishes a chart that the game loads, plays, retries, and switches', async ({ page, request }, testInfo) => {
  const fixtureDirectory = testInfo.outputPath('fixtures'); await mkdir(fixtureDirectory, { recursive: true });
  const audioPath = path.join(fixtureDirectory, 'loop.wav'); await writeFile(audioPath, sineWave(2200));
  const songId = `e2e-loop-${Date.now()}`;

  await page.goto(EDITOR_URL);
  await page.getByLabel('歌曲 ID').fill(songId);
  await page.getByLabel('曲名').fill('000 E2E Loop');
  await page.getByLabel('曲师').fill('Playwright');
  await page.locator('#audio-file').setInputFiles(audioPath);
  await expect(page.getByRole('status').filter({ hasText: 'loop.wav' })).toBeVisible();
  const editorCanvas = page.locator('canvas'); const editorBox = await editorCanvas.boundingBox();
  if (!editorBox) throw new Error('Editor canvas is not visible');
  await page.mouse.click(editorBox.x + editorBox.width * 0.2, editorBox.y + editorBox.height * 0.42);
  await page.getByRole('button', { name: '发布' }).click();
  await expect(page.getByRole('status').filter({ hasText: '已发布到曲谱库' })).toBeVisible();

  await page.goto(GAME_URL);
  await selectSong(page, request, songId);
  await expect(page.locator('#game')).toHaveAttribute('data-scene', 'play');
  await expect(page.locator('#game')).toHaveAttribute('data-state', 'playing', { timeout: 6_000 });
  await page.keyboard.press('p'); await expect(page.locator('#game')).toHaveAttribute('data-state', 'paused');
  await page.keyboard.press('p'); await expect(page.locator('#game')).toHaveAttribute('data-state', 'playing');
  await expect(page.locator('#game')).toHaveAttribute('data-scene', 'result', { timeout: 7_000 });

  const gameCanvas = page.locator('canvas'); const gameBox = await gameCanvas.boundingBox();
  if (!gameBox) throw new Error('Game canvas is not visible');
  const gameScale = gameBox.width / 960;
  await page.mouse.click(gameBox.x + 390 * gameScale, gameBox.y + 465 * gameScale);
  await expect(page.locator('#game')).toHaveAttribute('data-scene', 'play');
  await page.keyboard.press('q'); await expect(page.locator('#game')).toHaveAttribute('data-scene', 'song-select');
  await selectSong(page, request, 'signal-drift');
  await expect(page.locator('#game')).toHaveAttribute('data-scene', 'play');
});

test('game reports a missing audio file and keeps a return path', async ({ page, request }) => {
  await page.route('**/api/songs/signal-drift/audio', (route) => route.fulfill({ status: 404, body: 'missing' }));
  await page.goto(GAME_URL); await selectSong(page, request, 'signal-drift');
  await expect(page.locator('#game')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#game')).toHaveAttribute('data-error', '音频下载失败');
});

test('game rejects audio whose hash does not match the manifest', async ({ page, request }) => {
  await page.route('**/api/songs/signal-drift/audio', (route) => route.fulfill({ status: 200, contentType: 'audio/wav', body: sineWave(1000) }));
  await page.goto(GAME_URL); await selectSong(page, request, 'signal-drift');
  await expect(page.locator('#game')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#game')).toHaveAttribute('data-error', /SHA-256/);
});

test('mobile-sized viewports keep both Phaser surfaces available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(GAME_URL);
  const gameBox = await page.locator('canvas').boundingBox();
  expect(gameBox).not.toBeNull(); expect(gameBox?.width ?? 0).toBeLessThanOrEqual(390);
  expect(gameBox?.height ?? 0).toBeGreaterThan(0);

  await page.goto(EDITOR_URL);
  const editorBox = await page.locator('canvas').boundingBox();
  expect(editorBox).not.toBeNull(); expect(editorBox?.height ?? 0).toBeGreaterThan(0);
  const widths = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
  expect(widths.viewport).toBe(390); expect(widths.content).toBeLessThanOrEqual(390);
});
