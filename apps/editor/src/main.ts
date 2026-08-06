import Phaser from 'phaser';
import {
  SCHEMA_VERSION,
  SongChartSchema,
  validateSongProject,
  type Difficulty,
  type SongChart,
  type SongManifest,
} from '@music-game/chart-core';
import { AudioController } from './AudioController.js';
import { EditorModel } from './EditorModel.js';
import { EditorScene } from './EditorScene.js';
import './style.css';

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
};

const model = new EditorModel();
const audio = new AudioController();
const scene = new EditorScene(model, audio);
new Phaser.Game({
  type: Phaser.AUTO, parent: 'editor', width: 1200, height: 560, scene: [scene],
  backgroundColor: '#0d0e12', scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});

const fields = {
  id: byId<HTMLInputElement>('song-id'), title: byId<HTMLInputElement>('title'), artist: byId<HTMLInputElement>('artist'),
  bpm: byId<HTMLInputElement>('bpm'), difficulty: byId<HTMLSelectElement>('difficulty'), offset: byId<HTMLInputElement>('offset'),
  audioFile: byId<HTMLInputElement>('audio-file'), chartFile: byId<HTMLInputElement>('chart-file'),
  scroll: byId<HTMLInputElement>('scroll'), status: byId<HTMLOutputElement>('status'), position: byId<HTMLOutputElement>('position'),
};

function setStatus(message: string, kind: 'normal' | 'error' | 'success' = 'normal'): void {
  fields.status.value = message; fields.status.className = kind === 'normal' ? '' : kind;
}

function chart(): SongChart {
  return SongChartSchema.parse({
    schema_version: SCHEMA_VERSION, song_id: fields.id.value, difficulty: fields.difficulty.value,
    offset_ms: Number(fields.offset.value), notes: model.toNotes(),
  });
}

function project(): { manifest: SongManifest; chart: SongChart } {
  if (!audio.metadata) throw new Error('请先导入音频');
  const currentChart = chart();
  const manifest: SongManifest = {
    schema_version: SCHEMA_VERSION, id: fields.id.value, title: fields.title.value, artist: fields.artist.value,
    bpm: Number(fields.bpm.value), audio: audio.metadata, difficulties: [fields.difficulty.value as Difficulty],
  };
  const validated = validateSongProject(manifest, [currentChart]);
  return { manifest: validated.manifest, chart: validated.charts[0] as SongChart };
}

function download(name: string, value: unknown): void {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

fields.audioFile.addEventListener('change', async () => {
  const file = fields.audioFile.files?.[0]; if (!file) return;
  try {
    setStatus('正在分析音频'); await audio.load(file);
    fields.scroll.max = String(Math.max(0, audio.durationMs - scene.viewDurationMs)); fields.scroll.value = '0'; scene.setScroll(0);
    setStatus(`${file.name} · ${(audio.durationMs / 1000).toFixed(1)} 秒`, 'success');
  } catch (error) { setStatus(error instanceof Error ? error.message : '音频无法读取', 'error'); }
});

fields.chartFile.addEventListener('change', async () => {
  const file = fields.chartFile.files?.[0]; if (!file) return;
  try {
    const imported = SongChartSchema.parse(JSON.parse(await file.text())); model.load(imported);
    fields.id.value = imported.song_id; fields.difficulty.value = imported.difficulty; fields.offset.value = String(imported.offset_ms);
    setStatus(`已导入 ${imported.notes.length} 个音符`, 'success');
  } catch (error) { setStatus(error instanceof Error ? error.message : '谱面无法读取', 'error'); }
});

byId('export').addEventListener('click', () => { try { const data = project(); download(`${data.chart.song_id}-${data.chart.difficulty}.json`, data.chart); setStatus('谱面已导出', 'success'); } catch (error) { setStatus(error instanceof Error ? error.message : '导出失败', 'error'); } });
byId('publish').addEventListener('click', async () => {
  try {
    if (!audio.file) throw new Error('请先导入音频');
    const data = project(); const body = new FormData();
    body.set('audio', audio.file); body.set('manifest', JSON.stringify(data.manifest)); body.set('charts', JSON.stringify([data.chart]));
    setStatus('正在发布'); const response = await fetch('/api/songs', { method: 'POST', body });
    const payload = await response.json() as { error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message ?? `发布失败 (${response.status})`);
    setStatus('已发布到曲谱库', 'success');
  } catch (error) { setStatus(error instanceof Error ? error.message : '发布失败', 'error'); }
});

byId('play').addEventListener('click', () => { void audio.toggle().catch((error: Error) => setStatus(error.message, 'error')); });
byId('stop').addEventListener('click', () => audio.stop());
byId('undo').addEventListener('click', () => model.undo());
byId('redo').addEventListener('click', () => model.redo());
byId('copy').addEventListener('click', () => model.copy());
byId('paste').addEventListener('click', () => model.paste(audio.currentMs || scene.scrollMs));
byId('delete').addEventListener('click', () => model.deleteSelected());
byId<HTMLSelectElement>('snap').addEventListener('change', (event) => { model.snapDivision = Number((event.target as HTMLSelectElement).value); model.dispatchEvent(new Event('change')); });
fields.bpm.addEventListener('change', () => { model.bpm = Number(fields.bpm.value); model.dispatchEvent(new Event('change')); });
fields.scroll.addEventListener('input', () => scene.setScroll(Number(fields.scroll.value)));
audio.addEventListener('change', () => { fields.position.value = formatTime(audio.currentMs); byId<HTMLButtonElement>('play').textContent = audio.playing ? 'Ⅱ' : '▶'; });
setInterval(() => {
  fields.position.value = formatTime(audio.currentMs);
  if (audio.playing) {
    const nextScroll = Math.max(0, Math.min(Number(fields.scroll.max), audio.currentMs - scene.viewDurationMs / 2));
    fields.scroll.value = String(nextScroll);
    scene.setScroll(nextScroll);
  }
}, 100);

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  if (event.code === 'Space') { event.preventDefault(); void audio.toggle().catch((error: Error) => setStatus(error.message, 'error')); return; }
  if (event.key === 'Delete' || event.key === 'Backspace') model.deleteSelected();
  if (!event.ctrlKey && !event.metaKey) return;
  const key = event.key.toLowerCase();
  if (key === 'z') { event.preventDefault(); event.shiftKey ? model.redo() : model.undo(); }
  if (key === 'y') { event.preventDefault(); model.redo(); }
  if (key === 'c') { event.preventDefault(); model.copy(); }
  if (key === 'v') { event.preventDefault(); model.paste(audio.currentMs || scene.scrollMs); }
});

function formatTime(timeMs: number): string {
  const minutes = Math.floor(timeMs / 60_000); const seconds = Math.floor((timeMs % 60_000) / 1000); const millis = Math.floor(timeMs % 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}
