const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

const decodeFileName = (value) => {
  try {
    return decodeURIComponent(value || 'speech.mp3').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  } catch {
    return 'speech.mp3';
  }
};

export const config = {
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowLimit: 30, windowSize: 600 },
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'POST 요청만 지원합니다.' });
  if (!event.body) return jsonResponse(400, { error: '인식할 음성 파일이 없습니다.' });

  const binary = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'binary');
  if (!binary.length) return jsonResponse(400, { error: '인식할 음성 파일이 비어 있습니다.' });
  if (binary.length > 4 * 1024 * 1024) {
    return jsonResponse(413, { error: '음성 조각은 4MB 이하만 처리할 수 있습니다.' });
  }

  const keys = Array.from({ length: 20 }, (_, index) => process.env[`GROQ_API_KEY_${index + 1}`])
    .concat(process.env.GROQ_API_KEY || [])
    .filter(Boolean);
  if (!keys.length) return jsonResponse(503, { error: '음성 인식 서버 키가 설정되지 않았습니다.' });

  const contentType = event.headers?.['content-type'] || 'audio/mpeg';
  const fileName = decodeFileName(event.headers?.['x-file-name']);
  const startIndex = Date.now() % keys.length;

  for (let attempt = 0; attempt < keys.length; attempt += 1) {
    const form = new FormData();
    form.append('model', 'whisper-large-v3-turbo');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');
    form.append('file', new Blob([binary], { type: contentType }), fileName);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${keys[(startIndex + attempt) % keys.length]}` },
        body: form,
      });
      const responseText = await response.text();
      if (response.ok) return jsonResponse(200, responseText);
      console.error('Groq transcription error:', response.status);
      if (![401, 403, 429].includes(response.status) && response.status < 500) {
        return jsonResponse(400, { error: '음성 파일을 인식하지 못했습니다.' });
      }
    } catch (error) {
      console.error('Groq transcription request failed:', error?.message || error);
    }
  }

  return jsonResponse(502, { error: '음성 인식 서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요.' });
};
