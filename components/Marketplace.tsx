import React from 'react';
import { TemplateCard } from './TemplateCard';
import { TemplateMarketData } from '../types';
import { Sparkles, TrendingUp, Filter } from 'lucide-react';

const MOCK_TEMPLATES: TemplateMarketData[] = [
  {
    id: '1',
    title: '밤감성 에세이 다크 테마',
    authorName: '글방지기',
    thumbnail: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80',
    pricePoints: 100,
    downloads: 1240,
    isCreatorOriginal: true,
    jsonData: {
      topic: '에세이', targetAudience: '2030', tone: '차분함', hashtags: ['에세이', '감성'], themeIndex: 0,
      customBackgroundImage: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80',
      slides: [{ pageNumber: 1, header: '밤하늘이 나를\n위로할 때', body: '' }, { pageNumber: 2, header: '', body: '가끔은 무작정\n걷고 싶을 때가 있습니다.' }]
    }
  },
  {
    id: '2',
    title: '전문가 재테크 (가독성 1위)',
    authorName: '돈연구소',
    thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
    pricePoints: 0,
    downloads: 3500,
    isCreatorOriginal: false,
    jsonData: {
      topic: '재테크', targetAudience: '직장인', tone: '신뢰감', hashtags: ['재테크'], themeIndex: 1,
      slides: [{ pageNumber: 1, header: '월급 200,\n어떻게 1억 모을까?', body: '' }]
    }
  },
  {
    id: '3',
    title: '감각적인 매거진 레이아웃',
    authorName: '트렌드헌터',
    thumbnail: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80',
    pricePoints: 300,
    downloads: 85,
    isCreatorOriginal: true,
    jsonData: {
      topic: '트렌드', targetAudience: '마케터', tone: '트렌디', hashtags: ['마케팅'], themeIndex: 3,
      slides: [{ pageNumber: 1, header: '2027년 무조건\n뜨는 트렌드 3가지', body: '' }]
    }
  }
];

interface Props {
  onUseTemplate: (data: TemplateMarketData) => void;
}

export const Marketplace: React.FC<Props> = ({ onUseTemplate }) => {
  return (
    <div className="animate-fade-in pb-12 w-full max-w-4xl mx-auto px-6 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Sparkles className="text-primary" /> 템플릿 마켓
          </h2>
          <p className="text-sm text-gray-500 mt-1">크리에이터들이 영혼을 갈아넣은 고퀄리티 테마를 1초만에 내 것으로.</p>
        </div>
        <div className="flex bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm self-stretch sm:self-auto">
          <button className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold bg-gray-50 text-primary border-r border-gray-200 flex items-center justify-center gap-1">
            <TrendingUp size={16} /> 인기순
          </button>
          <button className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1">
            <Filter size={16} /> 최신순
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {MOCK_TEMPLATES.map((tmpl) => (
          <TemplateCard key={tmpl.id} data={tmpl} onUseTemplate={onUseTemplate} />
        ))}
      </div>
    </div>
  );
};
