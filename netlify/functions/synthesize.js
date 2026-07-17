import { requireFirebaseSecurity } from '../lib/firebase-security.js';

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
  body: JSON.stringify(body),
});

const escapeXml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const clamp = (value, min, max, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
};

export const config = {
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowLimit: 10, windowSize: 60 },
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'POST 요청만 지원합니다.' });
  const security = await requireFirebaseSecurity(event);
  if (!security.ok) return security.response;
  if ((event.body || '').length > 30_000) return jsonResponse(413, { error: '입력 내용이 너무 깁니다.' });

  let input;
  try {
    input = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: '요청 형식이 올바르지 않습니다.' });
  }

  const text = String(input.text || '').trim();
  const voiceName = String(input.voice?.name || 'ko-KR-Chirp3-HD-Achernar');
  const languageCode = String(input.voice?.languageCode || voiceName.split('-').slice(0, 2).join('-'));
  const expressiveVoice = voiceName.includes('Chirp') || voiceName.includes('Journey');
  if (!text) return jsonResponse(400, { error: '음성 원고를 입력해주세요.' });
  if (text.length > 4500) return jsonResponse(413, { error: '음성 원고는 4,500자 이하로 입력해주세요.' });
  if (!/^(ko-KR|en-US|ja-JP)-[A-Za-z0-9-]+$/.test(voiceName)) {
    return jsonResponse(400, { error: '지원하지 않는 목소리입니다.' });
  }

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) return jsonResponse(503, { error: '음성 생성 서버 키가 설정되지 않았습니다.' });

  const requestInput = !expressiveVoice && input.forceCommaPause
    ? { ssml: `<speak>${escapeXml(text).replace(/,/g, ',<break time="350ms"/>')}</speak>` }
    : { text };
  const audioConfig = { audioEncoding: 'MP3' };
  if (!expressiveVoice) {
    audioConfig.speakingRate = clamp(input.speakingRate, 0.25, 4, 1);
    audioConfig.pitch = clamp(input.pitch, -20, 20, 0);
  }

  try {
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: requestInput,
        voice: { languageCode, name: voiceName },
        audioConfig,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Google TTS error:', response.status, result?.error?.message || 'unknown');
      return jsonResponse(response.status >= 500 ? 502 : 400, { error: '음성 생성 요청을 처리하지 못했습니다.' });
    }
    return jsonResponse(200, { audioContent: result.audioContent });
  } catch (error) {
    console.error('Google TTS request failed:', error?.message || error);
    return jsonResponse(502, { error: '음성 생성 서버에 연결하지 못했습니다.' });
  }
};
