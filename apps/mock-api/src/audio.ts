import { createHash } from 'node:crypto';
import { parseBuffer } from 'music-metadata';
import type { AudioMetadata } from '@music-game/chart-core';

export async function inspectAudio(buffer: Buffer, fileName: string, mimeType: string): Promise<AudioMetadata> {
  const parsed = await parseBuffer(buffer, { mimeType, size: buffer.byteLength });
  const duration = parsed.format.duration;
  if (!duration || !Number.isFinite(duration)) throw new Error('Audio duration could not be determined');
  return {
    file_name: fileName,
    mime_type: mimeType,
    duration_ms: Math.round(duration * 1000),
    size_bytes: buffer.byteLength,
    sha256: createHash('sha256').update(buffer).digest('hex'),
  };
}

export function audioExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/wave': '.wav',
    'audio/ogg': '.ogg',
  };
  const extension = extensions[mimeType];
  if (!extension) throw new Error(`Unsupported audio type: ${mimeType}`);
  return extension;
}

export function createSineWave(durationMs: number, sampleRate = 8000): Buffer {
  const sampleCount = Math.round((durationMs / 1000) * sampleRate);
  const dataLength = sampleCount * 2;
  const output = Buffer.alloc(44 + dataLength);
  output.write('RIFF', 0);
  output.writeUInt32LE(36 + dataLength, 4);
  output.write('WAVEfmt ', 8);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(1, 22);
  output.writeUInt32LE(sampleRate, 24);
  output.writeUInt32LE(sampleRate * 2, 28);
  output.writeUInt16LE(2, 32);
  output.writeUInt16LE(16, 34);
  output.write('data', 36);
  output.writeUInt32LE(dataLength, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    const beat = Math.floor(index / (sampleRate / 2));
    const frequency = [330, 392, 523, 659][beat % 4] ?? 440;
    const envelope = Math.max(0, 1 - (index % (sampleRate / 2)) / (sampleRate / 2));
    output.writeInt16LE(Math.round(Math.sin((index / sampleRate) * Math.PI * 2 * frequency) * 8500 * envelope), 44 + index * 2);
  }
  return output;
}

