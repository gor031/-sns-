import { SubtitleSegment, SubtitleStyle } from '../types';
import { createProtectedHeaders } from './firebase';

interface RawSegment {
  start?: number;
  end?: number;
  text?: string;
}

const DEFAULT_STYLE: SubtitleStyle = {
  colorHex: '#FFFFFF',
  fontSize: 24,
  outlineWidth: 2,
  position: 'bottom',
};

const compactLength = (text: string) => text.replace(/\s+/g, '').length;

function splitNaturalText(text: string, maxLength = 16): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const clauses = normalized
    .split(/(?<=[.!?。！？])\s+/)
    .flatMap((clause) => {
      if (clause.length <= maxLength) return [clause];
      const chunks: string[] = [];
      let remaining = clause.trim();
      while (remaining.length > maxLength) {
        let splitAt = remaining.lastIndexOf(' ', maxLength);
        if (splitAt <= 0) splitAt = maxLength;
        chunks.push(remaining.slice(0, splitAt).trim());
        remaining = remaining.slice(splitAt).trim();
      }
      if (remaining) chunks.push(remaining);
      return chunks;
    })
    .filter(Boolean);

  const protectedEnding = /^(것|거|수|때|점|게|데|듯|말|중|뿐|만|걸|건|겁|곳|분)([.!?,。！？,]*)$/;
  const balanced: string[] = [];
  for (const chunk of clauses) {
    if (balanced.length > 0 && protectedEnding.test(chunk)) {
      const previous = balanced[balanced.length - 1];
      const merged = `${previous} ${chunk}`;
      if (merged.length <= maxLength) {
        balanced[balanced.length - 1] = merged;
        continue;
      }
    }
    balanced.push(chunk);
  }
  return balanced;
}

function normalizeSegments(rawSegments: RawSegment[], offset: number, idStart: number): SubtitleSegment[] {
  const result: SubtitleSegment[] = [];
  let nextId = idStart;

  for (const raw of rawSegments) {
    const text = String(raw.text || '').trim();
    const start = Number(raw.start || 0) + offset;
    const end = Number(raw.end || 0) + offset;
    if (!text || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;

    const chunks = splitNaturalText(text);
    const totalLength = Math.max(1, compactLength(text));
    let cursor = start;
    chunks.forEach((chunk, index) => {
      const ratio = compactLength(chunk) / totalLength;
      const chunkEnd = index === chunks.length - 1 ? end : Math.min(end, cursor + (end - start) * ratio);
      result.push({
        id: nextId++,
        start: cursor,
        end: chunkEnd,
        text: chunk,
        style: { ...DEFAULT_STYLE },
      });
      cursor = chunkEnd;
    });
  }

  return result;
}

export async function transcribeAudioChunk(
  blob: Blob,
  fileName: string,
  offset: number,
  idStart: number,
): Promise<SubtitleSegment[]> {
  const headers = await createProtectedHeaders({
    'Content-Type': blob.type || 'audio/mpeg',
    'X-File-Name': encodeURIComponent(fileName),
  });
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers,
    body: blob,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `음성 인식에 실패했습니다. (${response.status})`);
  }

  const rawSegments: RawSegment[] = Array.isArray(payload.segments) && payload.segments.length
    ? payload.segments
    : payload.text
      ? [{ start: 0, end: 8, text: payload.text }]
      : [];

  return normalizeSegments(rawSegments, offset, idStart);
}
