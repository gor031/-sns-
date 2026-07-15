import { CardNewsData } from '../types';
import { parseCardNewsJson } from './geminiService';

interface GenerateCardNewsOptions {
  topic: string;
  targetAudience?: string;
  tone?: string;
  slideCount?: number;
}

export async function generateCardNews(options: GenerateCardNewsOptions): Promise<CardNewsData> {
  const response = await fetch('/api/generate-card-news', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `원고 생성에 실패했습니다. (${response.status})`);
  }

  if (payload.data) {
    return parseCardNewsJson(JSON.stringify(payload.data));
  }

  if (typeof payload.content === 'string') {
    return parseCardNewsJson(payload.content);
  }

  throw new Error('서버 응답에서 카드뉴스 데이터를 찾지 못했습니다.');
}
