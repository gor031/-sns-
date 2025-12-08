import { CardNewsData } from "../types";

// Helper to clean Markdown code blocks (```json ... ```)
const cleanJsonString = (text: string): string => {
  let cleanText = text || "{}";
  
  // Remove markdown code blocks if present
  cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
  
  const jsonStart = cleanText.indexOf('{');
  const jsonArrayStart = cleanText.indexOf('[');
  
  // Detect if it's an object or array and slice accordingly
  if (jsonStart !== -1 && (jsonArrayStart === -1 || jsonStart < jsonArrayStart)) {
    const jsonEnd = cleanText.lastIndexOf('}');
    if (jsonEnd !== -1) {
      return cleanText.substring(jsonStart, jsonEnd + 1);
    }
  }
  
  return cleanText;
};

export const parseCardNewsJson = (input: string): CardNewsData => {
  try {
    const cleaned = cleanJsonString(input);
    const data = JSON.parse(cleaned);

    // Basic Validation
    if (!data.slides || !Array.isArray(data.slides)) {
      throw new Error("내용을 찾을 수 없습니다.");
    }

    if (data.slides.length === 0) {
      throw new Error("내용이 비어있습니다.");
    }

    // Ensure required fields exist
    const validatedSlides = data.slides.map((slide: any, index: number) => ({
      pageNumber: slide.pageNumber || index + 1,
      header: slide.header || "",
      body: slide.body || ""
    }));

    return {
      topic: data.topic || "제목 없음",
      targetAudience: data.targetAudience || "전체",
      tone: data.tone || "기본",
      hashtags: data.hashtags || [],
      slides: validatedSlides,
      themeIndex: data.themeIndex // Preserve if exists, or App.tsx will assign random
    };
  } catch (error) {
    console.error("Parse Error:", error);
    // User-friendly error message
    throw new Error("변환에 실패했습니다. AI가 써준 내용을 '처음부터 끝까지' 정확히 복사해서 붙여넣었는지 확인해주세요.");
  }
};