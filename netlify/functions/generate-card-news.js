import { requireFirebaseSecurity } from '../lib/firebase-security.js';

const SYSTEM_PROMPT = `당신은 숏폼과 카드뉴스 원고를 작성하는 전문 콘텐츠 마케터입니다.
반드시 부연 설명이나 Markdown 코드 블록 없이 유효한 JSON 객체 하나만 반환하세요.

작성 규칙:
1. 응답 전체에 이모지와 이모티콘을 절대 사용하지 않습니다.
2. 1페이지는 후킹 표지이며 body는 비웁니다.
3. 나머지 페이지는 핵심만 담고, 각 페이지 본문은 최대 2문장으로 작성합니다.
4. 강조할 단어는 **강조** 형식으로 표시합니다.
5. 요청받은 전체 페이지 수를 정확히 맞춥니다.
6. snsBody는 최소 3~5문단, 500자 이상으로 상세하게 작성합니다.

JSON 구조:
{
  "topic": "카드뉴스 주제",
  "targetAudience": "타겟 독자층",
  "tone": "어조",
  "hashtags": ["해시태그1", "해시태그2"],
  "slides": [
    { "pageNumber": 1, "header": "표지 제목", "body": "" },
    { "pageNumber": 2, "header": "소제목", "body": "본문" }
  ],
  "snsTitle": "SNS 업로드용 제목",
  "snsBody": "SNS 업로드용 상세 본문"
}`;

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
  body: JSON.stringify(body),
});

const cleanJson = (content) => {
  const withoutFence = String(content || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  return start >= 0 && end > start ? withoutFence.slice(start, end + 1) : withoutFence;
};

export const config = {
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowLimit: 5, windowSize: 60 },
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'POST 요청만 지원합니다.' });
  const security = await requireFirebaseSecurity(event);
  if (!security.ok) return security.response;
  if ((event.body || '').length > 20_000) return jsonResponse(413, { error: '입력 내용이 너무 깁니다.' });

  let input;
  try {
    input = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: '요청 형식이 올바르지 않습니다.' });
  }

  const topic = String(input.topic || '').trim().slice(0, 500);
  const targetAudience = String(input.targetAudience || '전체').trim().slice(0, 120);
  const tone = String(input.tone || '친절하고 명확한 어조').trim().slice(0, 120);
  const slideCount = Math.max(4, Math.min(10, Number(input.slideCount) || 7));
  if (!topic) return jsonResponse(400, { error: '주제를 입력해주세요.' });

  const keys = [
    process.env.CEREBRAS_API_KEY_1,
    process.env.CEREBRAS_API_KEY_2,
    process.env.CEREBRAS_API_KEY_3,
    process.env.CEREBRAS_API_KEY_4,
    process.env.CEREBRAS_API_KEY_5,
    process.env.CEREBRAS_API_KEY,
  ].filter(Boolean);
  if (!keys.length) return jsonResponse(503, { error: 'AI 생성 서버 키가 설정되지 않았습니다.' });

  const startIndex = Date.now() % keys.length;
  let lastStatus = 500;
  for (let attempt = 0; attempt < keys.length; attempt += 1) {
    const apiKey = keys[(startIndex + attempt) % keys.length];
    try {
      const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.CEREBRAS_MODEL || 'zai-glm-4.7',
          temperature: 0.7,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: `주제: ${topic}\n대상: ${targetAudience}\n어조: ${tone}\n전체 페이지 수: ${slideCount}장`,
            },
          ],
        }),
      });
      lastStatus = response.status;
      if (!response.ok) continue;

      const result = await response.json();
      const content = result?.choices?.[0]?.message?.content;
      if (!content) continue;
      const cleaned = cleanJson(content);
      try {
        return jsonResponse(200, { data: JSON.parse(cleaned) });
      } catch {
        return jsonResponse(200, { content: cleaned });
      }
    } catch (error) {
      console.error('Cerebras request failed:', error?.message || error);
    }
  }

  console.error('All Cerebras keys failed. Last status:', lastStatus);
  return jsonResponse(502, { error: 'AI 생성 서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요.' });
};
