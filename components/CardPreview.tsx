import React, { useState, useRef, useEffect } from 'react';
import { Slide } from '../types';
import { Check, Edit2, X, Sparkles, RefreshCw } from 'lucide-react';

interface CardPreviewProps {
  slide: Slide;
  totalSlides: number;
  themeIndex?: number;
  onUpdate: (field: 'header' | 'body', value: string) => void;
  onRegenerate?: (header: string, body: string) => Promise<{ header: string; body: string }>;
  captureId: string;
}

// High Contrast Themes for better readability and "Instagram" vibe
const THEMES = [
  // 1. Modern Black & Neon Pink
  { 
    id: 'neon-dark',
    bg: "bg-gray-900", 
    text: "text-white", 
    accent: "text-[#FF0055]", 
    highlightBg: "bg-[#FF0055]",
    highlightText: "text-white",
    decoration: "bg-gradient-to-tr from-[#FF0055] to-[#FF5588]",
    blob1: "rgba(255, 0, 85, 0.4)",
    blob2: "rgba(255, 85, 136, 0.3)"
  },
  // 2. Clean White & Bold Blue
  { 
    id: 'clean-blue',
    bg: "bg-white", 
    text: "text-gray-900", 
    accent: "text-[#2962FF]", 
    highlightBg: "bg-[#2962FF]",
    highlightText: "text-white",
    decoration: "bg-gradient-to-tr from-[#2962FF] to-[#00B0FF]",
    blob1: "rgba(41, 98, 255, 0.15)",
    blob2: "rgba(0, 176, 255, 0.15)"
  },
  // 3. Warm Beige & Burnt Orange (Emotional)
  { 
    id: 'warm-emotional',
    bg: "bg-[#FDFBF7]", 
    text: "text-[#4A403A]", 
    accent: "text-[#D84315]", 
    highlightBg: "bg-[#FFCCBC]",
    highlightText: "text-[#BF360C]",
    decoration: "bg-gradient-to-br from-[#FFAB91] to-[#FF7043]",
    blob1: "rgba(255, 171, 145, 0.4)",
    blob2: "rgba(255, 112, 67, 0.3)"
  },
  // 4. Vibrant Purple (Trendy/Tech)
  { 
    id: 'vibrant-purple',
    bg: "bg-[#7000FF]", 
    text: "text-white", 
    accent: "text-[#00E5FF]", 
    highlightBg: "bg-[#00E5FF]",
    highlightText: "text-black",
    decoration: "bg-gradient-to-bl from-[#D500F9] to-[#651FFF]",
    blob1: "rgba(213, 0, 249, 0.4)",
    blob2: "rgba(101, 31, 255, 0.4)"
  },
  // 5. Deep Green & Gold (Money/Trust)
  { 
    id: 'trust-green',
    bg: "bg-[#004D40]", 
    text: "text-[#E0F2F1]", 
    accent: "text-[#FFD740]", 
    highlightBg: "bg-[#FFD740]",
    highlightText: "text-[#004D40]",
    decoration: "bg-gradient-to-t from-[#00695C] to-[#4DB6AC]",
    blob1: "rgba(0, 105, 92, 0.5)",
    blob2: "rgba(77, 182, 172, 0.4)"
  },
  // 6. Midnight Gold (Premium)
  {
    id: 'midnight-gold',
    bg: "bg-slate-900",
    text: "text-amber-50",
    accent: "text-amber-400",
    highlightBg: "bg-amber-400",
    highlightText: "text-slate-900",
    decoration: "bg-gradient-to-r from-amber-300 to-yellow-500",
    blob1: "rgba(251, 191, 36, 0.15)",
    blob2: "rgba(180, 83, 9, 0.15)"
  },
  // 7. Sunset Gradient (Trendy)
  {
    id: 'sunset-gradient',
    bg: "bg-gradient-to-br from-indigo-900 to-purple-800",
    text: "text-white",
    accent: "text-orange-300",
    highlightBg: "bg-orange-400",
    highlightText: "text-white",
    decoration: "bg-gradient-to-r from-orange-400 to-pink-500",
    blob1: "rgba(251, 146, 60, 0.3)",
    blob2: "rgba(236, 72, 153, 0.3)"
  },
  // 8. Minimal Mono (Chic)
  {
    id: 'minimal-mono',
    bg: "bg-gray-100",
    text: "text-gray-900",
    accent: "text-black",
    highlightBg: "bg-black",
    highlightText: "text-white",
    decoration: "bg-gray-800",
    blob1: "rgba(0, 0, 0, 0.05)",
    blob2: "rgba(0, 0, 0, 0.08)"
  },
  // 9. Minty Fresh (Health/Growth)
  {
    id: 'minty-fresh',
    bg: "bg-emerald-50",
    text: "text-emerald-900",
    accent: "text-emerald-600",
    highlightBg: "bg-emerald-200",
    highlightText: "text-emerald-800",
    decoration: "bg-gradient-to-tr from-emerald-400 to-teal-400",
    blob1: "rgba(52, 211, 153, 0.2)",
    blob2: "rgba(16, 185, 129, 0.2)"
  },
  // 10. Berry Pop (Youth)
  {
    id: 'berry-pop',
    bg: "bg-rose-500",
    text: "text-white",
    accent: "text-yellow-300",
    highlightBg: "bg-yellow-300",
    highlightText: "text-rose-600",
    decoration: "bg-white",
    blob1: "rgba(255, 255, 255, 0.2)",
    blob2: "rgba(253, 224, 71, 0.3)"
  },
  // 11. Deep Space (Tech)
  {
    id: 'deep-space',
    bg: "bg-slate-950",
    text: "text-cyan-50",
    accent: "text-cyan-400",
    highlightBg: "bg-cyan-500",
    highlightText: "text-slate-900",
    decoration: "bg-gradient-to-r from-cyan-500 to-blue-500",
    blob1: "rgba(6, 182, 212, 0.15)",
    blob2: "rgba(59, 130, 246, 0.15)"
  },
  // 12. Soft Lavender (Emotional)
  {
    id: 'soft-lavender',
    bg: "bg-purple-50",
    text: "text-slate-700",
    accent: "text-purple-600",
    highlightBg: "bg-purple-200",
    highlightText: "text-purple-800",
    decoration: "bg-purple-400",
    blob1: "rgba(192, 132, 252, 0.2)",
    blob2: "rgba(168, 85, 247, 0.15)"
  },
  // 13. Retro Yellow (Bold)
  {
    id: 'retro-yellow',
    bg: "bg-yellow-400",
    text: "text-black",
    accent: "text-red-600",
    highlightBg: "bg-black",
    highlightText: "text-yellow-400",
    decoration: "bg-red-500",
    blob1: "rgba(0,0,0,0.1)",
    blob2: "rgba(239, 68, 68, 0.2)"
  },
  // 14. Corporate Blue (Professional)
  {
    id: 'corporate-blue',
    bg: "bg-blue-900",
    text: "text-white",
    accent: "text-blue-200",
    highlightBg: "bg-white",
    highlightText: "text-blue-900",
    decoration: "bg-blue-400",
    blob1: "rgba(96, 165, 250, 0.2)",
    blob2: "rgba(37, 99, 235, 0.2)"
  },
  // 15. Peach Fuzz (Warm)
  {
    id: 'peach-fuzz',
    bg: "bg-orange-50",
    text: "text-stone-800",
    accent: "text-orange-500",
    highlightBg: "bg-orange-200",
    highlightText: "text-orange-900",
    decoration: "bg-orange-400",
    blob1: "rgba(251, 146, 60, 0.2)",
    blob2: "rgba(253, 186, 116, 0.2)"
  }
];

export const CardPreview: React.FC<CardPreviewProps> = ({ 
  slide, 
  totalSlides, 
  themeIndex = 0, 
  onUpdate,
  onRegenerate,
  captureId
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Temporary state for editing without markdown
  const [editHeader, setEditHeader] = useState('');
  const [editBody, setEditBody] = useState('');

  const headerInputRef = useRef<HTMLTextAreaElement>(null);
  const bodyInputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize edit state when slide changes
  useEffect(() => {
    setIsEditing(false);
    setIsRegenerating(false);
  }, [slide]);

  const startEditing = () => {
    // Strip markdown for cleaner editing experience
    setEditHeader(slide.header.replaceAll('**', ''));
    setEditBody(slide.body.replaceAll('**', ''));
    setIsEditing(true);
  };

  const saveEditing = () => {
    onUpdate('header', editHeader);
    onUpdate('body', editBody);
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleAiRegenerate = async () => {
    if (!onRegenerate) return;
    setIsRegenerating(true);
    try {
      const result = await onRegenerate(editHeader, editBody);
      setEditHeader(result.header.replaceAll('**', ''));
      setEditBody(result.body.replaceAll('**', ''));
    } catch (error) {
      alert("AI 문구 생성에 실패했습니다.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const insertBold = (ref: React.RefObject<HTMLTextAreaElement | null>, setFunc: React.Dispatch<React.SetStateAction<string>>, currentVal: string) => {
    if (ref.current) {
      const start = ref.current.selectionStart;
      const end = ref.current.selectionEnd;
      if (start !== end) {
        const selected = currentVal.substring(start, end);
        const newVal = currentVal.substring(0, start) + `**${selected}**` + currentVal.substring(end);
        setFunc(newVal);
      }
    }
  };

  // Safe theme selection
  const safeIndex = Math.abs(themeIndex) % THEMES.length;
  const theme = THEMES[safeIndex];
  
  // Check if it's the cover slide (Slide 1)
  const isCover = slide.pageNumber === 1;

  // Helper to parse text with **highlight**
  const renderRichText = (text: string, isHeader: boolean = false) => {
    if (!text) return null;
    
    // Split by **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const content = part.slice(2, -2);
        
        // Header highlight style vs Body highlight style
        if (isHeader) {
           return (
            <span key={index} className={`${theme.accent} inline-block relative z-10`}>
              {content}
            </span>
          );
        } else {
          return (
            <span key={index} className={`font-bold ${theme.highlightBg} ${theme.highlightText} px-1 mx-0.5 rounded-sm relative z-10 inline-block`}>
              {content}
            </span>
          );
        }
      }
      return <span key={index} className="relative z-10">{part}</span>;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 
         CARD CONTAINER 
         Aspect Ratio 4:5 for Instagram Portrait
         Fixed width 384px (w-96) enforced for capture consistency between preview and download
      */}
      <div 
        id={captureId}
        className={`relative w-full md:w-96 aspect-[4/5] shadow-2xl overflow-hidden flex flex-col transition-colors duration-500 ${theme.bg} group`}
      >
        
        {/* Background Decoration Shapes */}
        <div 
          className="absolute top-[-20%] right-[-20%] w-[100%] h-[70%] pointer-events-none opacity-100 z-0"
          style={{ 
            background: `radial-gradient(circle at center, ${theme.blob1} 0%, transparent 60%)` 
          }}
        ></div>
        <div 
          className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[60%] pointer-events-none opacity-100 z-0"
          style={{ 
            background: `radial-gradient(circle at center, ${theme.blob2} 0%, transparent 60%)` 
          }}
        ></div>

        {/* --- EDIT OVERLAY --- */}
        {isEditing && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm p-6 flex flex-col gap-4 animate-fade-in text-left">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Edit2 size={16} /> 텍스트 편집
                </h3>
                <div className="flex gap-2">
                  {onRegenerate && (
                    <button 
                      onClick={handleAiRegenerate}
                      disabled={isRegenerating}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-lg hover:opacity-90 flex items-center gap-1 disabled:opacity-50"
                    >
                      {isRegenerating ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Sparkles size={12} />
                      )}
                      AI 다듬기
                    </button>
                  )}
                  <button 
                    onClick={cancelEditing} 
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                  >
                    <X size={20} />
                  </button>
                  <button 
                    onClick={saveEditing} 
                    className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-red-500 flex items-center gap-1"
                  >
                    <Check size={16} /> 완료
                  </button>
                </div>
             </div>
             
             {/* Header Edit */}
             <div className="space-y-1">
               <div className="flex justify-between">
                 <label className="text-xs font-bold text-gray-500">제목/헤더</label>
                 <button 
                   onClick={() => insertBold(headerInputRef, setEditHeader, editHeader)}
                   className="text-xs bg-gray-200 px-2 py-0.5 rounded hover:bg-gray-300 font-bold"
                 >
                   B (강조)
                 </button>
               </div>
               <textarea
                 ref={headerInputRef}
                 value={editHeader}
                 onChange={(e) => setEditHeader(e.target.value)}
                 className="w-full p-3 border border-gray-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none h-24"
                 placeholder="제목을 입력하세요"
               />
             </div>

             {/* Body Edit */}
             {!isCover && (
                <div className="space-y-1 flex-1 flex flex-col">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-gray-500">내용/본문</label>
                    <button 
                      onClick={() => insertBold(bodyInputRef, setEditBody, editBody)}
                      className="text-xs bg-gray-200 px-2 py-0.5 rounded hover:bg-gray-300 font-bold"
                    >
                      B (강조)
                    </button>
                  </div>
                  <textarea
                    ref={bodyInputRef}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm flex-1 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                    placeholder="내용을 입력하세요"
                  />
                </div>
             )}
          </div>
        )}

        {/* --- VIEW MODE --- */}
        {isCover ? (
          <div className="relative z-10 h-full flex flex-col p-8 items-center justify-center text-center">
             <div className="flex-1 flex flex-col items-center justify-center w-full">
                <div className={`w-12 h-1 mb-8 opacity-50 ${theme.accent.replace('text-', 'bg-')}`}></div>
                
                {/* MASSIVE HOOK TITLE FOR MOBILE */}
                <h1 className={`text-5xl md:text-6xl font-black leading-[1.1] tracking-tight mb-8 break-keep drop-shadow-sm transition-all ${theme.text}`}>
                  {renderRichText(slide.header, true)}
                </h1>
                
                {/* Visual line */}
                <div className={`w-32 h-2.5 rounded-full ${theme.decoration}`}></div>
             </div>
          </div>
        ) : (
          /* --- CONTENT SLIDE LAYOUT (Page 2+) --- */
          <div className="relative z-10 h-full flex flex-col p-8 text-left justify-center">
            {/* Header Area */}
            <div className="mb-6 pb-6 border-b border-black/10 dark:border-white/10 relative">
              <div className={`text-sm font-black uppercase tracking-widest mb-3 opacity-60 ${theme.text}`}>
                Tip {slide.pageNumber - 1}
              </div>
              
              {/* BIG HEADER */}
              <h3 className={`text-3xl font-black leading-tight break-keep transition-opacity ${theme.text}`}>
                {renderRichText(slide.header, true)}
              </h3>
            </div>

            {/* Body Area - BIGGER TEXT for Mobile */}
            <div className={`flex-1 relative`}>
               <p className={`text-2xl font-bold leading-relaxed whitespace-pre-line break-keep transition-opacity ${theme.text}`}>
                 {renderRichText(slide.body, false)}
               </p>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex justify-between items-center opacity-40">
               <span className={`text-xs ${theme.text}`}></span>
               <span className={`text-base font-bold ${theme.text}`}>{slide.pageNumber} / {totalSlides}</span>
            </div>
          </div>
        )}

      </div>
      
      {/* Edit Button */}
      {!isEditing && (
        <button 
          onClick={startEditing}
          className="w-full py-3 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 hover:text-primary transition-all shadow-sm"
        >
          <Edit2 size={18} />
          텍스트 수정
        </button>
      )}

    </div>
  );
};