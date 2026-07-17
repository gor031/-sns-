import React, { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Captions,
  Download,
  FileAudio,
  FileVideo,
  Merge,
  Play,
  Scissors,
  Trash2,
  Upload,
} from 'lucide-react';
import { ToolHeader } from './app/ToolHeader';
import { DisplayAd } from './DisplayAd';
import { SubtitlePosition, SubtitleSegment, SubtitleStyle } from '../types';
import { burnSubtitlesIntoVideo, extractAudioChunks } from '../services/ffmpegService';
import { transcribeAudioChunk } from '../services/transcriptionApi';

interface SubtitleToolProps {
  onBack: () => void;
}

const DEFAULT_STYLE: SubtitleStyle = {
  colorHex: '#FFFFFF',
  fontSize: 24,
  position: 'bottom',
};

const COLORS = [
  { value: '#FFFFFF', label: '흰색' },
  { value: '#FFE66D', label: '노란색' },
  { value: '#53D8FB', label: '하늘색' },
  { value: '#FF7AA2', label: '분홍색' },
  { value: '#1F2937', label: '진회색' },
];

const POSITIONS: Array<{ value: SubtitlePosition; label: string }> = [
  { value: 'top', label: '상단' },
  { value: 'center', label: '중앙' },
  { value: 'bottom', label: '하단' },
];

const formatShortTime = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const milliseconds = Math.floor((safe % 1) * 1000);
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};

const formatSrtTime = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const milliseconds = Math.floor((safe % 1) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
};

const buildSrt = (segments: SubtitleSegment[]) => segments
  .map((segment, index) => `${index + 1}\n${formatSrtTime(segment.start)} --> ${formatSrtTime(segment.end)}\n${segment.text.trim()}\n`)
  .join('\n');

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function SubtitleTool({ onBack }: SubtitleToolProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [styleScope, setStyleScope] = useState<'all' | 'selected'>('all');
  const [globalStyle, setGlobalStyle] = useState<SubtitleStyle>(DEFAULT_STYLE);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const isVideo = file?.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(file?.name || '');
  const selectedSegment = segments.find((segment) => segment.id === selectedId) || null;
  const controlStyle = styleScope === 'selected' && selectedSegment ? selectedSegment.style : globalStyle;
  const activeSegment = useMemo(
    () => segments.find((segment) => currentTime >= segment.start && currentTime <= segment.end) || null,
    [currentTime, segments],
  );

  useEffect(() => () => {
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
  }, [mediaUrl]);

  const handleFile = (nextFile: File | undefined) => {
    if (!nextFile) return;
    const allowed = /\.(mp4|mov|m4v|webm|mp3|wav|m4a|aac)$/i.test(nextFile.name);
    if (!allowed) {
      setError('MP4, MOV, WEBM, MP3, WAV, M4A, AAC 파일만 사용할 수 있습니다.');
      return;
    }
    if (nextFile.size > 300 * 1024 * 1024) {
      setError('브라우저 처리를 위해 300MB 이하 파일을 선택해주세요.');
      return;
    }
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setFile(nextFile);
    setMediaUrl(URL.createObjectURL(nextFile));
    setSegments([]);
    setSelectedId(null);
    setCurrentTime(0);
    setProgress(0);
    setStatus('');
    setError('');
  };

  const handleTranscribe = async () => {
    if (!file) return;
    setProcessing(true);
    setError('');
    setProgress(0);
    try {
      setStatus('인식용 음성 준비 중');
      const chunks = await extractAudioChunks(file, (value) => setProgress(value * 0.35));
      const nextSegments: SubtitleSegment[] = [];
      for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index];
        setStatus(`음성 인식 중 ${index + 1} / ${chunks.length}`);
        const recognized = await transcribeAudioChunk(chunk.blob, chunk.fileName, chunk.offset, nextSegments.length);
        nextSegments.push(...recognized.map((segment) => ({ ...segment, style: { ...globalStyle } })));
        setProgress(0.35 + ((index + 1) / chunks.length) * 0.65);
      }
      if (!nextSegments.length) throw new Error('인식된 자막이 없습니다. 음량과 파일 내용을 확인해주세요.');
      setSegments(nextSegments.map((segment, index) => ({ ...segment, id: index })));
      setSelectedId(0);
      setStatus(`${nextSegments.length}개 자막 완성`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '자막 생성 중 오류가 발생했습니다.');
      setStatus('');
    } finally {
      setProcessing(false);
    }
  };

  const seekTo = (segment: SubtitleSegment) => {
    setSelectedId(segment.id);
    setCurrentTime(segment.start);
    if (mediaRef.current) {
      mediaRef.current.currentTime = segment.start;
      void mediaRef.current.play().catch(() => undefined);
    }
  };

  const updateText = (id: number, text: string) => {
    setSegments((previous) => previous.map((segment) => segment.id === id ? { ...segment, text } : segment));
  };

  const splitSegment = (id: number, cursor?: number) => {
    setSegments((previous) => {
      const index = previous.findIndex((segment) => segment.id === id);
      if (index < 0) return previous;
      const segment = previous[index];
      const splitAt = cursor ?? Math.floor(segment.text.length / 2);
      const before = segment.text.slice(0, splitAt).trim();
      const after = segment.text.slice(splitAt).trim();
      if (!before || !after) return previous;
      const ratio = splitAt / Math.max(1, segment.text.length);
      const midpoint = segment.start + (segment.end - segment.start) * ratio;
      const replacement = [
        { ...segment, text: before, end: midpoint },
        { ...segment, text: after, start: midpoint },
      ];
      const next = [...previous.slice(0, index), ...replacement, ...previous.slice(index + 1)]
        .map((item, itemIndex) => ({ ...item, id: itemIndex }));
      setSelectedId(index + 1);
      return next;
    });
  };

  const mergeWithPrevious = (id: number) => {
    setSegments((previous) => {
      const index = previous.findIndex((segment) => segment.id === id);
      if (index <= 0) return previous;
      const before = previous[index - 1];
      const current = previous[index];
      const merged = { ...before, end: current.end, text: `${before.text} ${current.text}`.trim() };
      const next = [...previous.slice(0, index - 1), merged, ...previous.slice(index + 1)]
        .map((item, itemIndex) => ({ ...item, id: itemIndex }));
      setSelectedId(index - 1);
      return next;
    });
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>, segment: SubtitleSegment) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      splitSegment(segment.id, event.currentTarget.selectionStart);
      return;
    }
    if (event.key === 'Backspace' && event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0) {
      event.preventDefault();
      mergeWithPrevious(segment.id);
    }
  };

  const deleteSegment = (id: number) => {
    setSegments((previous) => previous
      .filter((segment) => segment.id !== id)
      .map((segment, index) => ({ ...segment, id: index })));
    setSelectedId(null);
  };

  const updateStyle = (partial: Partial<SubtitleStyle>) => {
    if (styleScope === 'all') {
      const next = { ...globalStyle, ...partial };
      setGlobalStyle(next);
      setSegments((previous) => previous.map((segment) => ({ ...segment, style: { ...next } })));
      return;
    }
    if (selectedId === null) return;
    setSegments((previous) => previous.map((segment) => segment.id === selectedId
      ? { ...segment, style: { ...segment.style, ...partial } }
      : segment));
  };

  const handleSrtDownload = () => {
    if (!segments.length) return;
    downloadBlob(new Blob([buildSrt(segments)], { type: 'text/plain;charset=utf-8' }), `modu-ddokddak-${Date.now()}.srt`);
  };

  const handleVideoDownload = async () => {
    if (!file || !isVideo || !segments.length) return;
    setProcessing(true);
    setError('');
    setStatus('자막 영상 변환 준비 중');
    setProgress(0);
    try {
      const output = await burnSubtitlesIntoVideo(file, segments, (value) => {
        setProgress(value);
        setStatus('자막 영상 변환 중');
      });
      downloadBlob(output, `modu-ddokddak-captioned-${Date.now()}.mp4`);
      setStatus('자막 영상 저장 완료');
      setProgress(1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '영상 저장 중 오류가 발생했습니다.');
      setStatus('');
    } finally {
      setProcessing(false);
    }
  };

  const overlayPosition = activeSegment?.style.position === 'top'
    ? 'top-6'
    : activeSegment?.style.position === 'center'
      ? 'top-1/2 -translate-y-1/2'
      : 'bottom-6';

  return (
    <div className="min-h-screen bg-gray-50">
      <ToolHeader title="자막 만들기" onBack={onBack} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 empty:hidden">
          <DisplayAd />
        </div>

        {!file ? (
          <section
            className="tool-panel grid min-h-[55vh] place-items-center border-dashed p-6 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFile(event.dataTransfer.files[0]);
            }}
          >
            <div className="max-w-md">
              <span className="mx-auto grid size-16 place-items-center rounded-lg bg-[#E8F7F4] text-[#2A9D8F]">
                <Upload size={30} />
              </span>
              <h2 className="mt-5 text-xl font-black text-gray-900">영상 또는 음원 선택</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-gray-500">
                <span className="block">MP4, MOV, WEBM, MP3, WAV, M4A, AAC</span>
                <span className="block">300MB 이하</span>
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-5 min-h-12 rounded-lg bg-[#2A9D8F] px-6 font-black text-white hover:bg-[#238579]"
              >
                파일 열기
              </button>
              {error && <p role="alert" className="mt-4 text-sm font-bold text-red-700">{error}</p>}
            </div>
          </section>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
            <div className="space-y-5">
              <section className="tool-panel overflow-hidden">
                <div className="relative grid aspect-video place-items-center overflow-hidden bg-[#111827]">
                  {isVideo ? (
                    <video
                      ref={(element) => { mediaRef.current = element; }}
                      src={mediaUrl}
                      controls
                      className="h-full w-full object-contain"
                      onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                    />
                  ) : (
                    <div className="flex flex-col items-center text-white/70">
                      <FileAudio size={52} />
                      <p className="mt-3 max-w-xs truncate px-4 text-sm font-bold">{file.name}</p>
                    </div>
                  )}
                  {activeSegment && (
                    <div className={`pointer-events-none absolute left-4 right-4 z-10 text-center ${overlayPosition}`}>
                      <span
                        className="inline whitespace-pre-wrap break-keep font-black leading-snug"
                        style={{
                          color: activeSegment.style.colorHex,
                          fontSize: `${activeSegment.style.fontSize}px`,
                          textShadow: '0 2px 2px rgba(0,0,0,.95), 1px 0 2px rgba(0,0,0,.95), -1px 0 2px rgba(0,0,0,.95)',
                        }}
                      >
                        {activeSegment.text}
                      </span>
                    </div>
                  )}
                </div>
                {!isVideo && (
                  <audio
                    ref={(element) => { mediaRef.current = element; }}
                    src={mediaUrl}
                    controls
                    className="w-full px-4 py-3"
                    onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                  />
                )}
                <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 px-4 py-3">
                  {isVideo ? <FileVideo size={18} className="text-[#2A9D8F]" /> : <FileAudio size={18} className="text-[#2A9D8F]" />}
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-700">{file.name}</span>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="min-h-10 rounded-lg border border-gray-300 px-3 text-sm font-bold text-gray-700 hover:bg-gray-50">파일 변경</button>
                </div>
              </section>

              {!segments.length && (
                <button
                  type="button"
                  onClick={handleTranscribe}
                  disabled={processing}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2A9D8F] px-5 font-black text-white hover:bg-[#238579] disabled:cursor-wait disabled:opacity-60"
                >
                  {processing ? <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Captions size={20} />}
                  {processing ? status : '자동 자막 만들기'}
                </button>
              )}

              {(processing || status) && (
                <div className="tool-panel p-4" role="status" aria-live="polite">
                  <div className="mb-2 flex justify-between text-sm font-bold text-gray-700">
                    <span>{status}</span>
                    <span className="tabular-nums">{Math.round(progress * 100)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full bg-[#2A9D8F] transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
                  </div>
                </div>
              )}
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

              {!!segments.length && (
                <section className="tool-panel p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="font-black text-gray-900">자막 스타일</h2>
                    <div className="flex rounded-lg bg-gray-100 p-1" aria-label="스타일 적용 범위">
                      <button type="button" onClick={() => setStyleScope('all')} className={`min-h-9 rounded-md px-3 text-xs font-bold ${styleScope === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>전체</button>
                      <button type="button" onClick={() => setStyleScope('selected')} disabled={selectedId === null} className={`min-h-9 rounded-md px-3 text-xs font-bold disabled:opacity-40 ${styleScope === 'selected' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>선택 자막</button>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <span className="tool-label">글자색</span>
                      <div className="flex gap-2">
                        {COLORS.map((color) => (
                          <button
                            type="button"
                            key={color.value}
                            onClick={() => updateStyle({ colorHex: color.value })}
                            aria-label={color.label}
                            title={color.label}
                            className={`size-10 rounded-full border-2 shadow-sm ${controlStyle.colorHex === color.value ? 'border-primary ring-2 ring-primary/20' : 'border-gray-300'}`}
                            style={{ backgroundColor: color.value }}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex justify-between text-sm font-bold text-gray-700">
                        <label htmlFor="subtitle-size">글자 크기</label>
                        <span className="tabular-nums text-[#2A9D8F]">{controlStyle.fontSize}px</span>
                      </div>
                      <input id="subtitle-size" type="range" min="10" max="36" step="1" value={controlStyle.fontSize} onChange={(event) => updateStyle({ fontSize: Number(event.target.value) })} className="w-full accent-[#2A9D8F]" />
                    </div>
                  </div>

                  <div className="mt-5">
                    <span className="tool-label">위치</span>
                    <div className="grid grid-cols-3 rounded-lg bg-gray-100 p-1">
                      {POSITIONS.map((position) => (
                        <button type="button" key={position.value} onClick={() => updateStyle({ position: position.value })} className={`min-h-10 rounded-md text-sm font-bold ${controlStyle.position === position.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{position.label}</button>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>

            {!!segments.length && (
              <aside className="space-y-5">
                <section className="tool-panel overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <h2 className="font-black text-gray-900">자막 편집</h2>
                    <span className="text-xs font-bold tabular-nums text-gray-400">{segments.length}개</span>
                  </div>
                  <div className="max-h-[58vh] overflow-y-auto">
                    {segments.map((segment, index) => (
                      <div key={segment.id} className={`border-b border-gray-100 p-3 last:border-0 ${selectedId === segment.id ? 'bg-emerald-50' : 'bg-white'}`}>
                        <div className="mb-2 flex items-center gap-2">
                          <button type="button" onClick={() => seekTo(segment)} className="flex min-h-9 items-center gap-1 rounded-md bg-gray-100 px-2 text-xs font-bold tabular-nums text-gray-600 hover:bg-gray-200" title="이 위치부터 재생">
                            <Play size={12} fill="currentColor" /> {formatShortTime(segment.start)}
                          </button>
                          <span className="text-xs text-gray-400">~ {formatShortTime(segment.end)}</span>
                          <div className="ml-auto flex gap-1">
                            <button type="button" onClick={() => splitSegment(segment.id)} className="tool-icon-button !size-9" aria-label={`${index + 1}번 자막 나누기`} title="나누기"><Scissors size={15} /></button>
                            <button type="button" onClick={() => mergeWithPrevious(segment.id)} disabled={index === 0} className="tool-icon-button !size-9 disabled:opacity-30" aria-label={`${index + 1}번 자막을 이전 자막과 합치기`} title="이전과 합치기"><Merge size={15} /></button>
                            <button type="button" onClick={() => deleteSegment(segment.id)} className="tool-icon-button !size-9 text-red-600" aria-label={`${index + 1}번 자막 삭제`} title="삭제"><Trash2 size={15} /></button>
                          </div>
                        </div>
                        <textarea
                          value={segment.text}
                          onFocus={() => setSelectedId(segment.id)}
                          onChange={(event) => updateText(segment.id, event.target.value)}
                          onKeyDown={(event) => handleEditorKeyDown(event, segment)}
                          rows={2}
                          className="tool-input min-h-16 resize-y text-sm leading-6"
                          aria-label={`${index + 1}번 자막 내용`}
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <button type="button" onClick={handleSrtDownload} className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 font-bold text-gray-800 hover:bg-gray-50">
                    <Download size={18} /> SRT 저장
                  </button>
                  <button type="button" onClick={handleVideoDownload} disabled={!isVideo || processing} className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#2A9D8F] px-4 font-bold text-white hover:bg-[#238579] disabled:cursor-not-allowed disabled:opacity-45" title={!isVideo ? '영상 파일에서만 사용할 수 있습니다' : '자막이 포함된 MP4 저장'}>
                    <FileVideo size={18} /> 자막 MP4 저장
                  </button>
                </div>
              </aside>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/mp4,audio/aac,.m4v,.m4a"
          className="sr-only"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </main>
    </div>
  );
}
