export interface Slide {
  pageNumber: number;
  header: string;
  body: string;
}

export interface CardNewsData {
  topic: string;
  targetAudience: string; // Keep for internal logic if needed, or ignore
  tone: string;
  slides: Slide[];
  hashtags: string[];
  themeIndex?: number; // Stores the random visual theme ID for this deck
}

export enum RelationshipType {
  DATING = "연애/심리",
  MARRIAGE = "결혼/부부",
  MONEY = "돈/재테크",
  CAREER = "커리어/자기계발",
  TECH = "AI/테크/트렌드",
  FRIENDSHIP = "인간관계/처세",
  PARENTING = "육아/교육",
  FAMILY = "가족/효도"
}

export type SlideCount = 4 | 6 | 8 | 10 | 12 | 15 | 20;