import React from 'react';
import { Download, Crown } from 'lucide-react';
import { TemplateMarketData } from '../types';

interface Props {
  data: TemplateMarketData;
  onUseTemplate: (data: TemplateMarketData) => void;
}

export const TemplateCard: React.FC<Props> = ({ data, onUseTemplate }) => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow group flex flex-col">
      <div className="aspect-[4/5] bg-gray-100 relative overflow-hidden flex-shrink-0">
        <img src={data.thumbnail} alt={data.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {data.isCreatorOriginal && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-yellow-300 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
            <Crown size={12} fill="currentColor" /> 크리에이터
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1 justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-800 line-clamp-1">{data.title}</h3>
          <p className="text-xs text-gray-400 mt-1">by {data.authorName}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded-md">
            <Download size={14} /> {data.downloads}
          </div>
          <button 
            onClick={() => onUseTemplate(data)}
            className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors active:scale-95"
          >
            {data.pricePoints === 0 ? '무료 사용' : `${data.pricePoints}P 구매`}
          </button>
        </div>
      </div>
    </div>
  );
};
