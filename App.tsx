import React, { useState, useRef } from 'react';
import { parseCardNewsJson } from './services/geminiService';
import { CardNewsData } from './types';
import { CardPreview } from './components/CardPreview';
import { Button } from './components/Button';
import { 
  ChevronRight, 
  ChevronLeft, 
  MessageCircleHeart, 
  Palette,
  Download,
  FolderDown,
  Sparkles,
  Play,
  ClipboardPaste,
  HelpCircle,
  Copy,
  CheckCircle2,
  Bot,
  ArrowDown
} from 'lucide-react';

const SYSTEM_PROMPT = `당신은 '숏폼/카드뉴스 콘텐츠 전문 마케터'입니다.
모바일 환경은 가독성이 생명입니다. 사용자가 주제를 던지면 무조건 **짧고, 강렬하고, 직관적인** 원고를 작성해야 합니다.

당신의 작업은 반드시 다음 **2단계 프로세스**를 따라야 합니다.

---

### [1단계: 원고 기획 및 컨펌]
사용자가 주제나 키워드를 입력하면, 바로 JSON을 만들지 말고 먼저 **텍스트 원고**를 작성하여 보여주세요.

**1. 작성 원칙 (매우 중요):**
- **다이어트**: 불필요한 조사, 형용사, 부사를 모두 삭제하세요.
- **길이 제한**: 한 슬라이드당 **최대 2문장**을 넘기지 마세요. (이미지가 텍스트를 압도하지 않게)
- **구조**: 
   - 표지 (후킹 제목)
   - 본문 (6~10장 내외, 핵심 정보만 딱딱 끊어서)
   - 결론 (행동 유도)
- **강조 표시**: 핵심 단어는 \`**강조**\` 처리를 미리 해서 보여주세요.

**2. 마무리 멘트:**
원고 끝에 반드시 **"이 내용으로 카드뉴스 데이터를 생성할까요?"** 라고 물어보세요.

---

### [2단계: JSON 데이터 변환]
사용자가 "좋아", "만들어줘", "진행해"라고 동의하면, 위에서 확정된 원고를 **앱이 인식할 수 있는 JSON 코드**로 변환해서 출력하세요.

**1. 필수 규칙:**
- 서론/결론 없이 **오직 JSON 코드만** 출력하세요.
- 반드시 Markdown 코드 블록(\`\`\`json)으로 감싸야 합니다.

**2. 데이터 구조 (변형 금지):**
\`\`\`json
{
  "topic": "주제",
  "targetAudience": "타겟",
  "tone": "어조",
  "hashtags": ["태그1", "태그2"],
  "slides": [
    {
      "pageNumber": 1,
      "header": "표지 제목(짧고 굵게) **강조**",
      "body": "" 
    },
    {
      "pageNumber": 2,
      "header": "소제목(핵심만)",
      "body": "본문은 최대 2줄.\\n줄바꿈을 적극 활용.\\n**핵심** 단어 강조."
    }
    // ... (원고 내용에 따라 슬라이드 계속 추가)
  ]
}
\`\`\``;

const App: React.FC = () => {
  // State
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [cardData, setCardData] = useState<CardNewsData | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Refs for scrolling
  const resultRef = useRef<HTMLDivElement>(null);

  const handleParse = () => {
    if (!jsonInput.trim()) {
      alert('내용을 붙여넣어주세요!');
      return;
    }

    setLoading(true);
    setCardData(null);
    setCurrentSlideIndex(0);

    try {
      const data = parseCardNewsJson(jsonInput);
      
      // Assign a random theme index if not present
      if (data.themeIndex === undefined) {
        data.themeIndex = Math.floor(Math.random() * 100);
      }
      
      setCardData(data);
      
      // Scroll to result
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      alert(error instanceof Error ? error.message : '변환 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    const sample = {
      "topic": "사용자 테스트",
      "targetAudience": "크리에이터",
      "tone": "친절함",
      "hashtags": ["꿀팁", "카드뉴스"],
      "slides": [
        {
          "pageNumber": 1,
          "header": "주제만 던지면\n**원고부터 디자인**까지?",
          "body": ""
        },
        {
          "pageNumber": 2,
          "header": "1. Gems / GPTs 만들기",
          "body": "앱 상단의 '사용 가이드'에 있는 내용을 복사해서 **나만의 AI**를 만드세요."
        },
        {
          "pageNumber": 3,
          "header": "2. 주제만 입력하세요",
          "body": "이제 글을 다 쓸 필요 없습니다.\n'다이어트', '재테크' 처럼 **키워드**만 입력하세요."
        },
        {
          "pageNumber": 4,
          "header": "3. 결과 복사 붙여넣기",
          "body": "AI가 써준 내용을 여기에 붙여넣으면\n**전문가급 카드뉴스**가 완성됩니다."
        }
      ]
    };
    setJsonInput(JSON.stringify(sample, null, 2));
  };

  const nextSlide = () => {
    if (cardData && currentSlideIndex < cardData.slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const shuffleTheme = () => {
    if (cardData) {
      setCardData({
        ...cardData,
        themeIndex: Math.floor(Math.random() * 100)
      });
    }
  };

  const handleUpdateSlide = (field: 'header' | 'body', value: string) => {
    if (!cardData) return;
    
    const newSlides = [...cardData.slides];
    newSlides[currentSlideIndex] = {
      ...newSlides[currentSlideIndex],
      [field]: value
    };

    setCardData({
      ...cardData,
      slides: newSlides
    });
  };

  // Download functionality for SINGLE slide
  const handleDownloadCurrent = async () => {
    try {
      const element = document.getElementById('card-capture-target');
      if (!element) return;
      
      // @ts-ignore
      const canvas = await window.html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: null
      });

      const data = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = data;
      link.download = `card-news-${currentSlideIndex + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download failed", err);
      alert("이미지 저장에 실패했습니다.");
    }
  };

  // Download functionality for ALL slides
  const handleDownloadAll = async () => {
    if (!cardData) return;
    setIsDownloading(true);

    try {
      // @ts-ignore
      const zip = new window.JSZip();
      const folder = zip.folder("card-news");

      for (let i = 0; i < cardData.slides.length; i++) {
        const element = document.getElementById(`export-slide-${i}`);
        if (element) {
          // @ts-ignore
          const canvas = await window.html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: null
          });
          
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            folder.file(`slide-${i + 1}.png`, blob);
          }
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      // @ts-ignore
      window.saveAs(content, `card-news-${Date.now()}.zip`);

    } catch (err) {
      console.error("Batch download failed", err);
      alert("전체 이미지 저장에 실패했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const copySystemPrompt = () => {
    navigator.clipboard.writeText(SYSTEM_PROMPT).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg text-white">
              <MessageCircleHeart size={24} fill="currentColor" />
            </div>
            <h1 className="text-xl font-black text-gray-800 tracking-tight">카드뉴스 생성기</h1>
          </div>
          <div className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1">
            Viewer Mode
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        
        {/* Intro Section */}
        <section className="text-center space-y-3 mb-10">
          <h2 className="text-3xl font-black text-gray-900 leading-tight">
            주제만 입력하면<br/>
            <span className="text-primary">원고와 디자인이 뚝딱!</span>
          </h2>
          <p className="text-gray-500 text-sm md:text-base">
            Gemini Gems 또는 GPTs에게 <strong>'주제'</strong>만 던져주세요.<br/>
            알아서 써준 내용을 붙여넣으면 끝납니다.
          </p>
        </section>

        {/* --- GUIDE SECTION --- */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            onClick={() => setShowGuide(!showGuide)}
            className="w-full flex items-center justify-between p-6 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                <HelpCircle size={20} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-800">나만의 AI 봇 만드는 법</h3>
                <p className="text-xs text-gray-500">주제만 넣으면 원고 써주는 봇 만들기</p>
              </div>
            </div>
            {showGuide ? <ArrowDown className="text-gray-400 rotate-180 transition-transform" /> : <ArrowDown className="text-gray-400 transition-transform" />}
          </button>

          {showGuide && (
            <div className="p-6 space-y-8 border-t border-gray-100 animate-fade-in">
              
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-800">Gems / GPTs 생성</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Google Gemini의 <strong>'Gems'</strong> 기능이나 ChatGPT의 <strong>'나만의 GPT 만들기'</strong>로 이동합니다.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                <div className="space-y-3 w-full">
                  <h4 className="font-bold text-gray-800">지시사항(Prompt) 입력</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    AI 설정의 <strong>'지시사항(System Instruction)'</strong> 칸에 아래 내용을 복사해서 붙여넣으세요. 이 설정이 있으면 <strong>주제만 넣어도 알아서 원고를 써줍니다.</strong>
                  </p>
                  
                  <div className="relative">
                    <pre className="bg-gray-800 text-gray-300 p-4 rounded-xl text-xs overflow-x-auto whitespace-pre-wrap max-h-40 custom-scrollbar border border-gray-700">
                      {SYSTEM_PROMPT}
                    </pre>
                    <button 
                      onClick={copySystemPrompt}
                      className="absolute top-2 right-2 bg-white text-gray-900 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg hover:bg-gray-100 transition-all flex items-center gap-1.5"
                    >
                      {copySuccess ? <CheckCircle2 size={12} className="text-green-600" /> : <Copy size={12} />}
                      {copySuccess ? '복사 완료!' : '프롬프트 복사'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-800">주제 던지기</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    이제 만든 봇에게 <strong>"다이어트 식단", "인스타그램 꿀팁"</strong> 같은 <strong>주제</strong>만 던지세요.<br/>
                    봇이 써준 답변을 그대로 복사해서 아래에 붙여넣으면 끝!
                  </p>
                </div>
              </div>

            </div>
          )}
        </section>

        {/* Input Section */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <ClipboardPaste size={16} /> AI 결과 붙여넣기
              </label>
              <button 
                onClick={loadSampleData}
                className="text-xs font-bold text-gray-400 hover:text-primary flex items-center gap-1 transition-colors"
              >
                <Sparkles size={12} /> 예시 내용 불러오기
              </button>
            </div>

            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="여기에 AI(Gems/GPTs)가 써준 내용을 그대로 붙여넣으세요..."
              className="w-full h-64 p-4 rounded-xl bg-gray-50 text-gray-800 text-sm border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none placeholder-gray-400 transition-all leading-relaxed custom-scrollbar shadow-inner"
              spellCheck={false}
            />
          </div>

          {/* Action Button */}
          <Button 
            onClick={handleParse} 
            isLoading={loading}
            className="w-full py-4 text-base shadow-xl shadow-red-100 hover:shadow-red-200"
          >
            <Play size={18} fill="currentColor" />
            카드뉴스 변환하기
          </Button>

        </section>

        {/* Result Section */}
        {cardData && (
          <div ref={resultRef} className="animate-fade-in space-y-8 pt-4">
            
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">미리보기</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            {/* Hidden Container for Export Rendering */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
              {cardData.slides.map((slide, idx) => (
                <div key={idx} id={`export-slide-${idx}`} className="w-96">
                  <CardPreview 
                    captureId={`export-slide-inner-${idx}`}
                    slide={slide}
                    totalSlides={cardData.slides.length}
                    themeIndex={cardData.themeIndex}
                    onUpdate={() => {}} 
                  />
                </div>
              ))}
            </div>

            {/* Card Carousel */}
            <div className="relative max-w-sm mx-auto">
              <CardPreview 
                captureId="card-capture-target"
                slide={cardData.slides[currentSlideIndex]} 
                totalSlides={cardData.slides.length}
                themeIndex={cardData.themeIndex}
                onUpdate={handleUpdateSlide}
              />

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 px-4">
                <button 
                  onClick={prevSlide}
                  disabled={currentSlideIndex === 0}
                  className="p-3 rounded-full bg-white border border-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 hover:text-primary transition-colors shadow-sm"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <span className="text-sm font-bold text-gray-400 tabular-nums">
                  {currentSlideIndex + 1} / {cardData.slides.length}
                </span>

                <button 
                  onClick={nextSlide}
                  disabled={currentSlideIndex === cardData.slides.length - 1}
                  className="p-3 rounded-full bg-white border border-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 hover:text-primary transition-colors shadow-sm"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

               {/* Download & Theme Actions */}
               <div className="flex flex-col gap-3 mt-6">
                 
                 <div className="flex gap-2">
                   <Button 
                     onClick={handleDownloadCurrent}
                     variant="secondary"
                     className="flex-1 py-3 text-sm"
                   >
                     <Download size={18} />
                     현재 장 저장
                   </Button>
                   <Button 
                     onClick={handleDownloadAll}
                     variant="primary"
                     isLoading={isDownloading}
                     className="flex-1 py-3 text-sm"
                   >
                     <FolderDown size={18} />
                     전체 저장 (ZIP)
                   </Button>
                 </div>

                 <button 
                   onClick={shuffleTheme}
                   className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-500 bg-gray-200 hover:bg-gray-300 hover:text-gray-800 transition-all py-4 rounded-xl"
                 >
                   <Palette size={18} />
                   배경 스타일 랜덤 변경
                 </button>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;