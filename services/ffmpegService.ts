import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { SubtitleSegment } from '../types';

const CORE_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
const CHUNK_SECONDS = 480;

export interface AudioChunk {
  blob: Blob;
  fileName: string;
  offset: number;
}

let ffmpeg: FFmpeg | null = null;
let activeProgress: ((value: number) => void) | null = null;

const progressListener = ({ progress }: { progress: number }) => {
  if (Number.isFinite(progress)) activeProgress?.(Math.max(0, Math.min(1, progress)));
};

async function getFfmpeg(onProgress?: (value: number) => void): Promise<FFmpeg> {
  activeProgress = onProgress || null;
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    ffmpeg.on('progress', progressListener);
  }
  if (!ffmpeg.loaded) {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  }
  return ffmpeg;
}

const safeExtension = (name: string, fallback: string) => {
  const extension = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return extension && extension.length <= 5 ? extension : fallback;
};

const toBytes = (data: Uint8Array | string): Uint8Array => {
  if (typeof data === 'string') return new TextEncoder().encode(data);
  return new Uint8Array(data);
};

async function removeFiles(instance: FFmpeg, names: string[]) {
  await Promise.all(names.map((name) => instance.deleteFile(name).catch(() => false)));
}

export async function extractAudioChunks(
  file: File,
  onProgress?: (value: number) => void,
): Promise<AudioChunk[]> {
  const instance = await getFfmpeg(onProgress);
  const inputName = `source.${safeExtension(file.name, 'bin')}`;
  const prefix = `speech-${Date.now()}`;
  const created: string[] = [inputName];

  try {
    await instance.writeFile(inputName, await fetchFile(file));
    const exitCode = await instance.exec([
      '-i', inputName,
      '-vn',
      '-ac', '1',
      '-ar', '16000',
      '-b:a', '32k',
      '-f', 'segment',
      '-segment_time', String(CHUNK_SECONDS),
      '-reset_timestamps', '1',
      `${prefix}-%03d.mp3`,
    ]);
    if (exitCode !== 0) throw new Error('오디오 변환에 실패했습니다.');

    const entries = await instance.listDir('/');
    const outputNames = entries
      .map((entry) => entry.name)
      .filter((name) => name.startsWith(prefix) && name.endsWith('.mp3'))
      .sort();
    created.push(...outputNames);

    if (!outputNames.length) throw new Error('인식용 오디오를 만들지 못했습니다.');

    const chunks: AudioChunk[] = [];
    for (let index = 0; index < outputNames.length; index += 1) {
      const name = outputNames[index];
      const bytes = toBytes(await instance.readFile(name));
      chunks.push({
        blob: new Blob([bytes], { type: 'audio/mpeg' }),
        fileName: `speech-${String(index + 1).padStart(3, '0')}.mp3`,
        offset: index * CHUNK_SECONDS,
      });
    }
    return chunks;
  } finally {
    await removeFiles(instance, created);
    activeProgress = null;
  }
}

const assTime = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const wholeSeconds = Math.floor(safe % 60);
  const centiseconds = Math.floor((safe % 1) * 100);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
};

const assColor = (hex: string) => {
  const normalized = hex.replace('#', '').padEnd(6, 'F').slice(0, 6);
  const red = normalized.slice(0, 2);
  const green = normalized.slice(2, 4);
  const blue = normalized.slice(4, 6);
  return `&H00${blue}${green}${red}`;
};

const escapeAssText = (text: string) => text
  .replace(/\\/g, '\\\\')
  .replace(/[{}]/g, '')
  .replace(/\r?\n/g, '\\N');

export function createAssDocument(segments: SubtitleSegment[]): string {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Base,Noto Sans CJK KR,72,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,5,1,2,90,90,70,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const lines = segments.map((segment) => {
    const alignment = segment.style.position === 'top' ? 8 : segment.style.position === 'center' ? 5 : 2;
    const fontSize = Math.max(30, Math.round(segment.style.fontSize * 3));
    const outlineWidth = Math.max(0, Math.min(10, segment.style.outlineWidth * 2.5));
    const overrides = `{\\an${alignment}\\fs${fontSize}\\c${assColor(segment.style.colorHex)}\\3c&H00000000\\bord${outlineWidth}\\shad1}`;
    return `Dialogue: 0,${assTime(segment.start)},${assTime(segment.end)},Base,,0,0,0,,${overrides}${escapeAssText(segment.text)}`;
  });

  return `${header}\n${lines.join('\n')}\n`;
}

export async function burnSubtitlesIntoVideo(
  file: File,
  segments: SubtitleSegment[],
  onProgress?: (value: number) => void,
): Promise<Blob> {
  const instance = await getFfmpeg(onProgress);
  const inputName = `video-input.${safeExtension(file.name, 'mp4')}`;
  const subtitleName = 'captions.ass';
  const fontName = 'NotoSansCJKkr-Bold.otf';
  const outputName = 'captioned-video.mp4';
  const created = [inputName, subtitleName, fontName, outputName];

  try {
    await instance.writeFile(inputName, await fetchFile(file));
    await instance.writeFile(subtitleName, createAssDocument(segments));
    await instance.writeFile(fontName, await fetchFile('/fonts/NotoSansCJKkr-Bold.otf'));

    const exitCode = await instance.exec([
      '-i', inputName,
      '-vf', `ass=${subtitleName}:fontsdir=.`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      outputName,
    ]);
    if (exitCode !== 0) throw new Error('자막 영상 변환에 실패했습니다.');

    return new Blob([toBytes(await instance.readFile(outputName))], { type: 'video/mp4' });
  } finally {
    await removeFiles(instance, created);
    activeProgress = null;
  }
}
