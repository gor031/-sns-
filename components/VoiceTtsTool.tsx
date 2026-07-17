import React, { useEffect, useMemo, useState } from 'react';
import { Download, Gauge, Mic2, Play, SlidersHorizontal } from 'lucide-react';
import { ToolHeader } from './app/ToolHeader';
import { DisplayAd } from './DisplayAd';
import { synthesizeVoice, TTS_VOICES } from '../services/ttsApi';

interface VoiceTtsToolProps {
  onBack: () => void;
}

export default function VoiceTtsTool({ onBack }: VoiceTtsToolProps) {
  const [text, setText] = useState('');
  const [voiceName, setVoiceName] = useState(TTS_VOICES[0].name);
  const [speakingRate, setSpeakingRate] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [forceCommaPause, setForceCommaPause] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedVoice = useMemo(
    () => TTS_VOICES.find((item) => item.name === voiceName) || TTS_VOICES[0],
    [voiceName],
  );

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('음성으로 만들 문장을 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const blob = await synthesizeVoice({
        text: text.trim(),
        voice: selectedVoice,
        speakingRate,
        pitch,
        forceCommaPause,
      });
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(blob));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '음성 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const anchor = document.createElement('a');
    anchor.href = audioUrl;
    anchor.download = `modu-ddokddak-voice-${Date.now()}.mp3`;
    anchor.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ToolHeader title="음성 만들기" onBack={onBack} />
      <main className="mx-auto grid max-w-5xl gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <div className="empty:hidden lg:col-span-2">
          <DisplayAd />
        </div>

        <section className="tool-panel p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Mic2 size={20} className="text-primary" />
            <h2 className="text-lg font-black text-gray-900">음성 원고</h2>
            <span className="ml-auto text-xs font-bold tabular-nums text-gray-400">{text.length.toLocaleString()}자</span>
          </div>
          <label htmlFor="voice-script" className="sr-only">음성 원고</label>
          <textarea
            id="voice-script"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={4500}
            placeholder="음성으로 변환할 내용을 입력하세요."
            className="tool-input min-h-72 resize-y leading-7 sm:min-h-96"
          />

          <label className="mt-4 flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4">
            <span className="text-sm font-bold text-gray-700">쉼표에서 또박또박 끊어 읽기</span>
            <input
              type="checkbox"
              checked={forceCommaPause}
              onChange={(event) => setForceCommaPause(event.target.checked)}
              className="size-5 accent-[#FF6B6B]"
            />
          </label>
        </section>

        <aside className="space-y-5">
          <section className="tool-panel p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal size={19} className="text-[#22577A]" />
              <h2 className="font-black text-gray-900">음성 설정</h2>
            </div>

            <label className="tool-label" htmlFor="voice-select">목소리</label>
            <select
              id="voice-select"
              value={voiceName}
              onChange={(event) => setVoiceName(event.target.value)}
              className="tool-input mb-5"
            >
              {TTS_VOICES.map((item) => <option key={item.name} value={item.name}>{item.label}</option>)}
            </select>

            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between text-sm font-bold text-gray-700">
                <label htmlFor="voice-speed">속도</label>
                <span className="tabular-nums text-[#22577A]">{speakingRate.toFixed(2)}배</span>
              </div>
              <input
                id="voice-speed"
                type="range"
                min="0.25"
                max="4"
                step="0.05"
                value={speakingRate}
                disabled={selectedVoice.disablesControls}
                onChange={(event) => setSpeakingRate(Number(event.target.value))}
                className="w-full accent-[#22577A] disabled:opacity-40"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm font-bold text-gray-700">
                <label htmlFor="voice-pitch">높낮이</label>
                <span className="tabular-nums text-[#22577A]">{pitch.toFixed(1)}</span>
              </div>
              <input
                id="voice-pitch"
                type="range"
                min="-20"
                max="20"
                step="0.5"
                value={pitch}
                disabled={selectedVoice.disablesControls}
                onChange={(event) => setPitch(Number(event.target.value))}
                className="w-full accent-[#22577A] disabled:opacity-40"
              />
            </div>

            {selectedVoice.disablesControls && (
              <p className="mt-3 flex gap-2 text-xs font-medium leading-5 text-gray-500">
                <Gauge size={15} className="mt-0.5 shrink-0" />
                선택한 HD 음성은 속도와 높낮이가 원음으로 고정됩니다.
              </p>
            )}
          </section>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 font-black text-white shadow-sm transition hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Play size={19} fill="currentColor" />}
            {loading ? '음성 생성 중' : '음성 만들기'}
          </button>

          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

          {audioUrl && (
            <section className="tool-panel p-4">
              <audio src={audioUrl} controls className="w-full" />
              <button
                type="button"
                onClick={downloadAudio}
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white font-bold text-gray-800 hover:bg-gray-50"
              >
                <Download size={18} /> MP3 저장
              </button>
            </section>
          )}
        </aside>
      </main>
    </div>
  );
}
