import React, { useState } from 'react';
import {
  Type, Square, Circle as CircleIcon, Triangle as TriangleIcon,
  Minus, Image, Palette, Upload, Heading1, Heading2, AlignLeft,
  Shapes, PaintBucket, ImagePlus, Link2, ChevronDown, ChevronRight,
  Search, Loader2
} from 'lucide-react';

interface ToolbarProps {
  onAddHeading: () => void;
  onAddSubheading: () => void;
  onAddBodyText: () => void;
  onAddRect: () => void;
  onAddCircle: () => void;
  onAddTriangle: () => void;
  onAddLine: () => void;
  onAddImage: () => void;
  onAddImageUrl: (url: string) => void;
  onBgColor: (color: string) => void;
  onBgImage: () => void;
}

const PRESET_COLORS = [
  '#FFFFFF', '#F8F9FA', '#E9ECEF', '#DEE2E6', '#ADB5BD', '#6C757D', '#495057', '#343A40', '#212529', '#000000',
  '#FF6B6B', '#FF8787', '#FA5252', '#E03131', '#C92A2A',
  '#FF922B', '#FFA94D', '#FD7E14', '#E8590C', '#D9480F',
  '#FFD43B', '#FFE066', '#FCC419', '#FAB005', '#F59F00',
  '#51CF66', '#69DB7C', '#40C057', '#2F9E44', '#2B8A3E',
  '#4ECDC4', '#38D9A9', '#20C997', '#12B886', '#0CA678',
  '#339AF0', '#4DABF7', '#228BE6', '#1971C2', '#1864AB',
  '#7950F2', '#845EF7', '#7048E8', '#6741D9', '#5F3DC4',
  '#E64980', '#F06595', '#D6336C', '#C2255C', '#A61E4D',
];

const GRADIENT_PRESETS = [
  { label: '일몰', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', colors: ['#667eea', '#764ba2'] },
  { label: '바다', value: 'linear-gradient(135deg, #0093E9 0%, #80D0C7 100%)', colors: ['#0093E9', '#80D0C7'] },
  { label: '핑크', value: 'linear-gradient(135deg, #FFDEE9 0%, #B5FFFC 100%)', colors: ['#FFDEE9', '#B5FFFC'] },
  { label: '불꽃', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', colors: ['#f093fb', '#f5576c'] },
  { label: '민트', value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', colors: ['#43e97b', '#38f9d7'] },
  { label: '골드', value: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', colors: ['#f6d365', '#fda085'] },
];

type SectionType = 'text' | 'shapes' | 'image' | 'background' | null;

export const Toolbar: React.FC<ToolbarProps> = ({
  onAddHeading, onAddSubheading, onAddBodyText,
  onAddRect, onAddCircle, onAddTriangle, onAddLine,
  onAddImage, onAddImageUrl, onBgColor, onBgImage
}) => {
  const [activeSection, setActiveSection] = useState<SectionType>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState('pexels');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const toggleSection = (section: SectionType) => {
    setActiveSection(prev => prev === section ? null : section);
  };

  const handleUrlImage = () => {
    if (imageUrl.trim()) {
      onAddImageUrl(imageUrl.trim());
      setImageUrl('');
    }
  };

  const handleSearchImages = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(searchQuery.trim())}&source=${searchSource}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error(err);
      alert('이미지 검색에 실패했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-shrink-0 relative z-20 shadow-2xl">
      {/* Icon Strip */}
      <div className="w-18 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-2">
        {[
          { icon: Type, section: 'text' as SectionType, label: '텍스트' },
          { icon: Shapes, section: 'shapes' as SectionType, label: '도형' },
          { icon: Image, section: 'image' as SectionType, label: '이미지' },
          { icon: PaintBucket, section: 'background' as SectionType, label: '배경' },
        ].map(({ icon: Icon, section, label }) => (
          <button
            key={section}
            onClick={() => toggleSection(section)}
            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
              activeSection === section
                ? 'bg-gradient-to-br from-primary to-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] scale-105'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 hover:scale-105 active:scale-95'
            }`}
          >
            <Icon size={22} />
            <span className="text-[10px] font-semibold tracking-wide">{label}</span>
          </button>
        ))}
      </div>

      {/* Expanded Panel */}
      {activeSection && (
        <div className="w-72 bg-white/80 backdrop-blur-2xl border-r border-white/50 shadow-[10px_0_30px_-10px_rgba(0,0,0,0.05)] overflow-y-auto animate-fade-in-right">
          {/* TEXT Section */}
          {activeSection === 'text' && (
            <div className="p-5 space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest pl-1">텍스트</h3>
              <div className="space-y-3">
                <button onClick={onAddHeading} className="w-full p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200/60 hover:border-primary/40 hover:bg-gradient-to-br hover:from-rose-50/50 hover:to-indigo-50/50 hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0 text-left group">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm group-hover:border-primary/30 group-hover:shadow-primary/10 transition-all"><Heading1 size={22} className="text-slate-600 group-hover:text-primary transition-colors" /></div>
                    <div>
                      <p className="font-bold text-slate-800 text-lg">큰 제목</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">72px · Bold</p>
                    </div>
                  </div>
                </button>
                <button onClick={onAddSubheading} className="w-full p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200/60 hover:border-primary/40 hover:bg-gradient-to-br hover:from-rose-50/50 hover:to-indigo-50/50 hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0 text-left group">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm group-hover:border-primary/30 group-hover:shadow-primary/10 transition-all"><Heading2 size={20} className="text-slate-600 group-hover:text-primary transition-colors" /></div>
                    <div>
                      <p className="font-bold text-slate-800 text-base">소제목</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">48px · SemiBold</p>
                    </div>
                  </div>
                </button>
                <button onClick={onAddBodyText} className="w-full p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200/60 hover:border-primary/40 hover:bg-gradient-to-br hover:from-rose-50/50 hover:to-indigo-50/50 hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0 text-left group">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm group-hover:border-primary/30 group-hover:shadow-primary/10 transition-all"><AlignLeft size={18} className="text-slate-600 group-hover:text-primary transition-colors" /></div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">본문</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">32px · Regular</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* SHAPES Section */}
          {activeSection === 'shapes' && (
            <div className="p-5 space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest pl-1">도형</h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={onAddRect} className="aspect-square bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200/60 hover:border-primary/40 hover:bg-gradient-to-br hover:from-rose-50/50 hover:to-indigo-50/50 hover:shadow-md transition-all hover:-translate-y-1 active:translate-y-0 flex flex-col items-center justify-center gap-3 group">
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:border-primary/30 group-hover:shadow-primary/10 transition-all">
                    <Square size={28} className="text-slate-400 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-xs font-bold text-slate-600">사각형</span>
                </button>
                <button onClick={onAddCircle} className="aspect-square bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200/60 hover:border-primary/40 hover:bg-gradient-to-br hover:from-rose-50/50 hover:to-indigo-50/50 hover:shadow-md transition-all hover:-translate-y-1 active:translate-y-0 flex flex-col items-center justify-center gap-3 group">
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:border-primary/30 group-hover:shadow-primary/10 transition-all">
                    <CircleIcon size={28} className="text-slate-400 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-xs font-bold text-slate-600">원</span>
                </button>
                <button onClick={onAddTriangle} className="aspect-square bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200/60 hover:border-primary/40 hover:bg-gradient-to-br hover:from-rose-50/50 hover:to-indigo-50/50 hover:shadow-md transition-all hover:-translate-y-1 active:translate-y-0 flex flex-col items-center justify-center gap-3 group">
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:border-primary/30 group-hover:shadow-primary/10 transition-all">
                    <TriangleIcon size={28} className="text-slate-400 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-xs font-bold text-slate-600">삼각형</span>
                </button>
                <button onClick={onAddLine} className="aspect-square bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200/60 hover:border-primary/40 hover:bg-gradient-to-br hover:from-rose-50/50 hover:to-indigo-50/50 hover:shadow-md transition-all hover:-translate-y-1 active:translate-y-0 flex flex-col items-center justify-center gap-3 group">
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:border-primary/30 group-hover:shadow-primary/10 transition-all">
                    <Minus size={28} className="text-slate-400 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-xs font-bold text-slate-600">선</span>
                </button>
              </div>
            </div>
          )}

          {/* IMAGE Section */}
          {activeSection === 'image' && (
            <div className="p-5 space-y-5">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest pl-1">이미지</h3>
              <button onClick={onAddImage} className="w-full p-6 bg-white/50 backdrop-blur-sm rounded-2xl border-2 border-dashed border-slate-300 hover:border-primary/60 hover:bg-gradient-to-br hover:from-rose-50/50 hover:to-indigo-50/50 transition-all hover:shadow-md flex flex-col items-center gap-3 group">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:border-primary/30 group-hover:shadow-primary/10 transition-all">
                  <Upload size={24} className="text-slate-400 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-sm font-bold text-slate-600 group-hover:text-primary transition-colors">내 컴퓨터에서 업로드</span>
              </button>
              <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Link2 size={14} /> URL로 추가</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 min-w-0 px-3 py-2.5 text-sm bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all shadow-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlImage()}
                  />
                  <button onClick={handleUrlImage} className="shrink-0 px-3.5 py-2.5 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl hover:shadow-lg hover:shadow-slate-900/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center">
                    <ImagePlus size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Search size={14} /> 무료 이미지 검색</label>
                <div className="flex flex-col gap-2">
                  <select 
                    value={searchSource}
                    onChange={(e) => setSearchSource(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="pexels">Pexels</option>
                    <option value="pixabay">Pixabay</option>
                    <option value="freepik">Freepik</option>
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="검색어 (영어 권장)"
                      className="flex-1 min-w-0 px-3 py-2.5 text-sm bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all shadow-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchImages()}
                    />
                    <button onClick={handleSearchImages} disabled={isSearching} className="shrink-0 px-3.5 py-2.5 bg-primary text-white rounded-xl hover:shadow-lg transition-all active:scale-95 flex items-center justify-center disabled:opacity-50">
                      {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    </button>
                  </div>
                </div>
                {/* 검색 결과 그리드 */}
                {searchResults.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {searchResults.map((img) => (
                      <button 
                        key={img.id}
                        onClick={() => onAddImageUrl(img.full_url)}
                        className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-primary hover:shadow-md transition-all group"
                      >
                        <img src={img.preview_url} alt={img.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ImagePlus size={20} className="text-white drop-shadow-md" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BACKGROUND Section */}
          {activeSection === 'background' && (
            <div className="p-5 space-y-6">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest pl-1">배경</h3>
              
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500">단색 프리셋</p>
                <div className="grid grid-cols-5 gap-2.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => onBgColor(color)}
                      className="aspect-square rounded-xl border border-slate-200 hover:scale-125 hover:z-10 hover:shadow-lg transition-all cursor-pointer relative"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500">커스텀 색상</p>
                <div className="p-1 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-primary/40 transition-colors">
                  <input
                    type="color"
                    defaultValue="#ffffff"
                    onChange={(e) => onBgColor(e.target.value)}
                    className="w-full h-12 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/60 space-y-3">
                <p className="text-xs font-bold text-slate-500">배경 이미지</p>
                <button onClick={onBgImage} className="w-full p-4 bg-white/50 backdrop-blur-sm rounded-2xl border-2 border-dashed border-slate-300 hover:border-primary/60 hover:bg-gradient-to-br hover:from-rose-50/50 hover:to-indigo-50/50 hover:shadow-md transition-all flex items-center justify-center gap-3 group">
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 group-hover:border-primary/30 group-hover:shadow-primary/10 transition-all">
                    <Upload size={18} className="text-slate-400 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm font-bold text-slate-600 group-hover:text-primary transition-colors">이미지 업로드</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
