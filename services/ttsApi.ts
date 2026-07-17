import { createProtectedHeaders } from './firebase';

export interface TtsVoice {
  name: string;
  label: string;
  languageCode: string;
  disablesControls: boolean;
}

const voice = (name: string, label: string): TtsVoice => ({
  name,
  label,
  languageCode: name.split('-').slice(0, 2).join('-'),
  disablesControls: name.includes('Chirp') || name.includes('Journey'),
});

export const TTS_VOICES: TtsVoice[] = [
  voice('ko-KR-Chirp3-HD-Achernar', '한국어 여성 Chirp 3 HD'),
  voice('ko-KR-Chirp3-HD-Achird', '한국어 남성 Chirp 3 HD'),
  voice('ko-KR-Neural2-A', '한국어 여성 Neural2-A'),
  voice('ko-KR-Neural2-B', '한국어 여성 Neural2-B'),
  voice('ko-KR-Neural2-C', '한국어 남성 Neural2-C'),
  voice('ko-KR-Wavenet-A', '한국어 여성 Wavenet-A'),
  voice('ko-KR-Wavenet-B', '한국어 여성 Wavenet-B'),
  voice('ko-KR-Wavenet-C', '한국어 남성 Wavenet-C'),
  voice('ko-KR-Wavenet-D', '한국어 남성 Wavenet-D'),
  voice('ko-KR-Standard-A', '한국어 여성 Standard-A'),
  voice('ko-KR-Standard-B', '한국어 여성 Standard-B'),
  voice('ko-KR-Standard-C', '한국어 남성 Standard-C'),
  voice('ko-KR-Standard-D', '한국어 남성 Standard-D'),
  voice('en-US-Journey-F', '영어 여성 Journey'),
  voice('en-US-Journey-D', '영어 남성 Journey'),
  voice('en-US-Neural2-C', '영어 여성 Neural2'),
  voice('en-US-Neural2-A', '영어 남성 Neural2'),
  voice('ja-JP-Neural2-B', '일본어 여성 Neural2'),
  voice('ja-JP-Neural2-C', '일본어 남성 Neural2'),
];

interface SynthesizeOptions {
  text: string;
  voice: TtsVoice;
  speakingRate: number;
  pitch: number;
  forceCommaPause: boolean;
}

export async function synthesizeVoice(options: SynthesizeOptions): Promise<Blob> {
  const headers = await createProtectedHeaders({ 'Content-Type': 'application/json' });
  const response = await fetch('/api/synthesize', {
    method: 'POST',
    headers,
    body: JSON.stringify(options),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `음성 생성에 실패했습니다. (${response.status})`);
  }

  if (!payload.audioContent) {
    throw new Error('응답에 음성 데이터가 없습니다.');
  }

  const binary = atob(payload.audioContent);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: 'audio/mpeg' });
}
