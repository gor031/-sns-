import React, { useState, useRef } from 'react';
import { parseCardNewsJson } from './services/geminiService';
import { generateCardNews } from './services/cardNewsApi';
import { CardNewsData, Slide, TextStyle } from './types';
import { CardPreview, THEMES } from './components/CardPreview';
import { DisplayAd } from './components/DisplayAd';
import { Marketplace } from './components/Marketplace';
import { TemplateMarketData } from './types';
import { Button } from './components/Button';
import { 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
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
  ArrowDown,
  Check,
  Store,
  Edit3,
  Upload,
  ArrowLeft,
  Braces,
  PenLine,
  Plus,
  Trash2,
  LockKeyhole,
  Loader2,
  X
} from 'lucide-react';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const SYSTEM_PROMPT = `당신은 '숏폼/카드뉴스 콘텐츠 전문 마케터'입니다.
모바일 환경은 가독성이 생명입니다. 사용자가 주제를 던지면 무조건 **짧고, 강렬하고, 직관적인** 원고를 작성해야 합니다.

당신의 작업은 반드시 다음 **3단계 프로세스**를 따라야 합니다.

---

### [1단계: sns 올릴 제목과 내용]
사용자가 주제나 키워드를 입력하면 sns에 올릴 제목과 내용을 먼저 생성해줘(반드시 복사 버튼으로 한번에 복사가 가능하게 해줘야되).
- **이모지 절대 금지**: 제목과 본문을 포함한 전체 텍스트에 이모티콘이나 이모지(emoji, 😊, 🔥, 🚀 등)를 절대 사용하지 마세요. (No emojis/emoticons allowed).
- **풍성하고 긴 본문**: sns에 올릴 본문 내용은 절대 짧게 쓰지 말고, 상세하고 풍성하게 길게 작성하세요. (최소 3~5문단, 500자 이상).

### [2단계: 원고 기획 및 컨펌]
제목과 내용 생성한 뒤에, 바로 JSON을 만들지 말고 먼저 **텍스트 원고**를 작성하여 보여주세요.

**1. 작성 원칙 (매우 중요):**
- **다이어트**: 불필요한 조사, 형용사, 부사를 모두 삭제하세요.
- **길이 제한**: 한 슬라이드당 **최대 2문장**을 넘기지 마세요. (이미지가 텍스트를 압도하지 않게)
- **이모지 금지**: 카드뉴스 원고 내용 전체에도 이모지나 이모티콘은 절대 포함되어선 안 됩니다.
- **구조**: 
   - 표지 (후킹 제목)
   - 본문 (6~10장 내외, 핵심 정보만 딱딱 끊어서)
   - 결론 (행동 유도)
- **강조 표시**: 핵심 단어는 **강조** 처리를 미리 해서 보여주세요.

**2. 마무리 멘트:**
원고 끝에 반드시 **"이 내용으로 카드뉴스 데이터를 생성할까요?"** 라고 물어보세요.

---

### [3단계: JSON 데이터 변환]
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
  "snsTitle": "SNS 업로드용 제목",
  "snsBody": "SNS 업로드용 500자 이상 상세 본문",
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
  ]
}
\`\`\``;

const dataURLtoBlob = (dataurl: string) => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

const BACKGROUND_MAX_BYTES = 30 * 1024 * 1024;
const BACKGROUND_MAX_DIMENSION = 2400;

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string'
    ? resolve(reader.result)
    : reject(new Error('이미지 변환 결과를 읽지 못했습니다.'));
  reader.onerror = () => reject(new Error('이미지 파일을 읽지 못했습니다.'));
  reader.readAsDataURL(blob);
});

const prepareBackgroundImage = async (file: File) => {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('브라우저에서 열 수 없는 이미지 형식입니다.'));
    });

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error('이미지 크기를 확인하지 못했습니다.');
    }

    const scale = Math.min(
      1,
      BACKGROUND_MAX_DIMENSION / image.naturalWidth,
      BACKGROUND_MAX_DIMENSION / image.naturalHeight,
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('이미지를 처리할 수 없습니다.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const optimized = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('이미지를 최적화하지 못했습니다.')),
        'image/webp',
        0.9,
      );
    });
    return blobToDataUrl(optimized);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const resolveOklchStylesForClone = (element: HTMLElement, clonedElement: HTMLElement) => {
  const processElement = (orig: HTMLElement, clone: HTMLElement) => {
    try {
      const computed = window.getComputedStyle(orig);
      clone.style.color = computed.color;
      clone.style.backgroundColor = computed.backgroundColor;
      clone.style.borderColor = computed.borderColor;
      clone.style.backgroundImage = computed.backgroundImage;
      clone.style.boxShadow = computed.boxShadow;
      clone.style.fill = computed.fill;
      clone.style.stroke = computed.stroke;
    } catch (e) {
      console.error("Style clone error for element:", orig, e);
    }
  };

  processElement(element, clonedElement);

  const origChildren = element.getElementsByTagName('*');
  const cloneChildren = clonedElement.getElementsByTagName('*');
  
  for (let i = 0; i < origChildren.length; i++) {
    if (cloneChildren[i]) {
      processElement(origChildren[i] as HTMLElement, cloneChildren[i] as HTMLElement);
    }
  }
};

interface AppProps {
  onBack?: () => void;
}

type InputMode = 'auto' | 'manual' | 'json';

const createManualSlide = (pageNumber: number): Slide => ({
  pageNumber,
  header: pageNumber === 1 ? '표지 제목을 입력하세요' : `핵심 내용 ${pageNumber - 1}`,
  body: pageNumber === 1 ? '' : '본문을 입력하세요.',
});

const App: React.FC<AppProps> = ({ onBack }) => {
  // State
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [cardData, setCardData] = useState<CardNewsData | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<'title' | 'body' | null>(null);
  const [currentTab, setCurrentTab] = useState<'editor'|'market'>('editor');
  const [inputMode, setInputMode] = useState<InputMode>('auto');
  const [autoTopic, setAutoTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('일반 사용자');
  const [tone, setTone] = useState('친절하고 명확한 어조');
  const [slideCount, setSlideCount] = useState(7);
  const [signature, setSignature] = useState('');
  const [manualSlides, setManualSlides] = useState<Slide[]>([
    createManualSlide(1),
    createManualSlide(2),
  ]);
  const [textStrokeWidth, setTextStrokeWidth] = useState(0);
  const [textStrokeColor, setTextStrokeColor] = useState('#000000');
  const [backgroundFileName, setBackgroundFileName] = useState('');
  const [backgroundError, setBackgroundError] = useState('');
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);

  // Refs for scrolling
  const resultRef = useRef<HTMLDivElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const applyCardData = (data: CardNewsData) => {
    const nextData = {
      ...data,
      signature: signature.trim() || data.signature || '',
      themeIndex: data.themeIndex ?? Math.floor(Math.random() * THEMES.length),
    };
    setCardData(nextData);
    setBackgroundFileName(nextData.customBackgroundImage ? '저장된 배경 이미지' : '');
    setBackgroundError('');
    setCurrentSlideIndex(0);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

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
      
      applyCardData(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : '변환 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGenerate = async () => {
    if (!autoTopic.trim()) {
      alert('카드뉴스 주제를 입력해주세요.');
      return;
    }
    setLoading(true);
    setCardData(null);
    try {
      const data = await generateCardNews({
        topic: autoTopic.trim(),
        targetAudience: targetAudience.trim(),
        tone,
        slideCount,
      });
      applyCardData(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : '카드뉴스 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCreate = () => {
    const slides = manualSlides
      .map((slide, index) => ({
        ...slide,
        pageNumber: index + 1,
        header: slide.header.trim(),
        body: slide.body.trim(),
      }))
      .filter((slide) => slide.header || slide.body);
    if (!slides.length || !slides[0].header) {
      alert('표지 제목을 입력해주세요.');
      return;
    }
    applyCardData({
      topic: slides[0].header,
      targetAudience: targetAudience.trim() || '전체',
      tone,
      slides,
      hashtags: [],
      snsTitle: slides[0].header,
      snsBody: slides.slice(1).map((slide) => `${slide.header}\n${slide.body}`).join('\n\n'),
    });
  };

  const updateManualSlide = (index: number, field: 'header' | 'body', value: string) => {
    setManualSlides((previous) => previous.map((slide, slideIndex) => slideIndex === index
      ? { ...slide, [field]: value }
      : slide));
  };

  const addManualSlide = () => {
    setManualSlides((previous) => previous.length >= 10
      ? previous
      : [...previous, createManualSlide(previous.length + 1)]);
  };

  const removeManualSlide = (index: number) => {
    if (index === 0) return;
    setManualSlides((previous) => previous
      .filter((_, slideIndex) => slideIndex !== index)
      .map((slide, slideIndex) => ({ ...slide, pageNumber: slideIndex + 1 })));
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

  const changeTheme = (index: number) => {
    if (cardData) {
      setCardData({
        ...cardData,
        themeIndex: index,
        customBackgroundImage: undefined,
      });
      setBackgroundFileName('');
      setBackgroundError('');
    }
  };

  const handleUpdateSlide = (header: string, body: string, headerStyle?: TextStyle, bodyStyle?: TextStyle) => {
    if (!cardData) return;
    
    setCardData(prev => {
      if (!prev) return null;
      const newSlides = [...prev.slides];
      newSlides[currentSlideIndex] = {
        ...newSlides[currentSlideIndex],
        header,
        body,
        headerStyle: headerStyle || newSlides[currentSlideIndex].headerStyle,
        bodyStyle: bodyStyle || newSlides[currentSlideIndex].bodyStyle,
      };
      return {
        ...prev,
        slides: newSlides
      };
    });
  };

  const handleDownloadCurrent = async () => {
    try {
      const element = document.getElementById(`export-slide-inner-${currentSlideIndex}`);
      if (!element) return;
      
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(`export-slide-inner-${currentSlideIndex}`);
          if (clonedElement) {
            resolveOklchStylesForClone(element, clonedElement as HTMLElement);
          }
        }
      });

      const dataUrl = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `card-news-${currentSlideIndex + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download failed", err);
      alert("이미지 저장에 실패했습니다.");
    }
  };

  const handleDownloadAll = async () => {
    if (!cardData) return;
    setIsDownloading(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder("card-news");

      for (let i = 0; i < cardData.slides.length; i++) {
        const element = document.getElementById(`export-slide-inner-${i}`);
        if (element) {
          // 브라우저 렌더링 부하를 줄이기 위해 약간의 지연 시간 추가
          if (i > 0) await new Promise(r => setTimeout(r, 100));

          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            onclone: (clonedDoc) => {
              const clonedElement = clonedDoc.getElementById(`export-slide-inner-${i}`);
              if (clonedElement) {
                resolveOklchStylesForClone(element, clonedElement as HTMLElement);
              }
            }
          });
          
          const dataUrl = canvas.toDataURL('image/png');
          const blob = dataURLtoBlob(dataUrl);
          
          if (blob) {
            folder!.file(`slide-${i + 1}.png`, blob);
          }
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `card-news-${Date.now()}.zip`);

    } catch (err) {
      console.error("Batch download failed", err);
      alert("전체 이미지 저장에 실패했습니다. (현상: " + (err instanceof Error ? err.message : String(err)) + ")");
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

  const handleUseTemplate = (tmpl: TemplateMarketData) => {
    setSignature(tmpl.jsonData.signature || '');
    setCardData(tmpl.jsonData);
    setBackgroundFileName(tmpl.jsonData.customBackgroundImage ? '저장된 배경 이미지' : '');
    setBackgroundError('');
    setJsonInput(JSON.stringify(tmpl.jsonData, null, 2));
    setCurrentSlideIndex(0);
    setCurrentTab('editor');
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleCustomBackground = () => {
    backgroundInputRef.current?.click();
  };

  const handleBackgroundFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !cardData) return;
    setBackgroundError('');
    if (!file.type.startsWith('image/')) {
      setBackgroundError('JPG, PNG, WebP 같은 이미지 파일을 선택해주세요.');
      return;
    }
    if (file.size > BACKGROUND_MAX_BYTES) {
      setBackgroundError('배경 이미지는 30MB 이하만 사용할 수 있습니다.');
      return;
    }

    setIsBackgroundLoading(true);
    try {
      const dataUrl = await prepareBackgroundImage(file);
      setCardData((previous) => previous ? { ...previous, customBackgroundImage: dataUrl } : previous);
      setBackgroundFileName(file.name);
      window.setTimeout(() => {
        document.getElementById('card-capture-target')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
    } catch (error) {
      setBackgroundError(error instanceof Error ? error.message : '배경 이미지를 적용하지 못했습니다.');
    } finally {
      setIsBackgroundLoading(false);
    }
  };

  const handleRemoveBackground = () => {
    setCardData((previous) => previous ? { ...previous, customBackgroundImage: undefined } : previous);
    setBackgroundFileName('');
    setBackgroundError('');
  };

  const handleSignatureChange = (value: string) => {
    setSignature(value);
    setCardData((previous) => previous ? { ...previous, signature: value } : previous);
  };

  const copySnsField = async (field: 'title' | 'body', value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1600);
  };

  return (
    <div className="min-h-screen pb-20 font-sans overflow-x-hidden">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-3 overflow-x-auto no-scrollbar">
          {onBack && (
            <button type="button" onClick={onBack} className="tool-icon-button" aria-label="도구 선택으로 돌아가기" title="뒤로">
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <div className="bg-primary p-2 rounded-lg text-white shrink-0">
              <MessageCircleHeart size={22} fill="currentColor" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-gray-800 whitespace-nowrap">카드뉴스 만들기</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
             <button onClick={() => setCurrentTab('editor')} className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 font-bold text-sm rounded-xl transition-colors flex items-center gap-2 ${currentTab === 'editor' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}><Edit3 size={16}/> 에디터</button>
             <button type="button" disabled aria-label="디자인 스튜디오 점검 중" title="점검 중" className="flex shrink-0 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-400 opacity-60 sm:px-4"><LockKeyhole size={16}/> 디자인 스튜디오</button>
             <button onClick={() => setCurrentTab('market')} className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 font-bold text-sm rounded-xl transition-colors flex items-center gap-2 ${currentTab === 'market' ? 'bg-primary text-white shadow-md' : 'bg-[#FFF0F0] text-primary hover:bg-[#FFE0E0]'}`}><Store size={16}/> 템플릿 마켓</button>
          </div>
        </div>
      </header>

      {currentTab === 'market' ? (
         <Marketplace onUseTemplate={handleUseTemplate} />
      ) : (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section className="space-y-1">
          <p className="text-sm font-bold text-primary">모두뚝딱 카드뉴스</p>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">원고부터 이미지 저장까지</h2>
        </section>

        <DisplayAd />

        {inputMode === 'json' && (
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <button 
            onClick={() => setShowGuide(!showGuide)}
            className="w-full flex items-center justify-between p-6 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                <HelpCircle size={20} />
              </div>
              <h3 className="font-bold text-gray-800">사용 방법</h3>
            </div>
            {showGuide ? <ArrowDown className="text-gray-400 rotate-180 transition-transform" /> : <ArrowDown className="text-gray-400 transition-transform" />}
          </button>

          {showGuide && (
            <div className="p-6 space-y-8 border-t border-gray-100 animate-fade-in">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-800">Gems / GPTs 생성</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    AI 서비스의 <strong>'나만의 봇'</strong> 만들기 페이지로 이동합니다.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                <div className="space-y-3 w-full">
                  <h4 className="font-bold text-gray-800">지시사항(Prompt) 입력</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    AI 설정의 <strong>'지시사항'</strong> 칸에 아래 내용을 복사해서 붙여넣으세요.
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

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-800">주제 입력</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    봇에게 주제를 던지면 <strong>3단계 프로세스</strong>에 맞춰 결과를 생성합니다. 마지막 JSON 데이터를 복사해 아래에 붙여넣으세요.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
        )}

        <section className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1" role="tablist" aria-label="카드뉴스 입력 방식">
            <button type="button" role="tab" aria-selected={inputMode === 'auto'} onClick={() => setInputMode('auto')} className={`flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-md px-1 text-xs font-bold sm:gap-2 sm:px-2 sm:text-sm ${inputMode === 'auto' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><Bot size={16} /> AI 자동</button>
            <button type="button" role="tab" aria-selected={inputMode === 'manual'} onClick={() => setInputMode('manual')} className={`flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-md px-1 text-xs font-bold sm:gap-2 sm:px-2 sm:text-sm ${inputMode === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><PenLine size={16} /> 직접 입력</button>
            <button type="button" role="tab" aria-selected={inputMode === 'json'} onClick={() => setInputMode('json')} className={`flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-md px-1 text-xs font-bold sm:gap-2 sm:px-2 sm:text-sm ${inputMode === 'json' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><Braces size={16} /> JSON</button>
          </div>

          {inputMode === 'auto' && (
            <div className="space-y-5">
              <div>
                <label htmlFor="auto-topic" className="tool-label">주제</label>
                <textarea id="auto-topic" value={autoTopic} onChange={(event) => setAutoTopic(event.target.value)} placeholder="예: 초보자를 위한 생성형 AI 활용법" className="tool-input min-h-32 resize-y leading-7" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="target-audience" className="tool-label">대상</label>
                  <input id="target-audience" value={targetAudience} onChange={(event) => setTargetAudience(event.target.value)} className="tool-input" />
                </div>
                <div>
                  <label htmlFor="card-tone" className="tool-label">어조</label>
                  <select id="card-tone" value={tone} onChange={(event) => setTone(event.target.value)} className="tool-input">
                    <option>친절하고 명확한 어조</option>
                    <option>전문적이고 신뢰감 있는 어조</option>
                    <option>짧고 강렬한 어조</option>
                    <option>차분하고 공감하는 어조</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="slide-count" className="tool-label">페이지 수</label>
                  <select id="slide-count" value={slideCount} onChange={(event) => setSlideCount(Number(event.target.value))} className="tool-input">
                    {[4, 5, 6, 7, 8, 9, 10].map((count) => <option key={count} value={count}>{count}장</option>)}
                  </select>
                </div>
              </div>
              <Button onClick={handleAutoGenerate} isLoading={loading} className="w-full py-4 text-base"><Sparkles size={18} />AI로 카드뉴스 만들기</Button>
            </div>
          )}

          {inputMode === 'manual' && (
            <div className="space-y-4">
              <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                {manualSlides.map((slide, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-black text-gray-700">{index === 0 ? '표지' : `${index + 1}페이지`}</span>
                      {index > 0 && <button type="button" onClick={() => removeManualSlide(index)} className="tool-icon-button !size-9 text-red-600" aria-label={`${index + 1}페이지 삭제`} title="페이지 삭제"><Trash2 size={16} /></button>}
                    </div>
                    <input value={slide.header} onChange={(event) => updateManualSlide(index, 'header', event.target.value)} aria-label={`${index + 1}페이지 제목`} placeholder="제목" className="tool-input" />
                    {index > 0 && <textarea value={slide.body} onChange={(event) => updateManualSlide(index, 'body', event.target.value)} aria-label={`${index + 1}페이지 본문`} placeholder="본문" className="tool-input mt-2 min-h-24 resize-y leading-6" />}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addManualSlide} disabled={manualSlides.length >= 10} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"><Plus size={18} />페이지 추가</button>
              <Button onClick={handleManualCreate} className="w-full py-4 text-base"><Play size={18} fill="currentColor" />카드뉴스 미리보기</Button>
            </div>
          )}

          {inputMode === 'json' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="json-input" className="text-sm font-bold text-gray-700 flex items-center gap-2"><ClipboardPaste size={16} />AI 결과 붙여넣기</label>
                <button type="button" onClick={loadSampleData} className="text-xs font-bold text-gray-500 hover:text-primary flex items-center gap-1"><Sparkles size={12} />예시 불러오기</button>
              </div>
              <textarea id="json-input" value={jsonInput} onChange={(event) => setJsonInput(event.target.value)} placeholder="AI가 생성한 JSON 코드를 여기에 붙여넣으세요." className="tool-input h-64 resize-y text-sm leading-relaxed" spellCheck={false} />
              <Button onClick={handleParse} isLoading={loading} className="w-full py-4 text-base"><Play size={18} fill="currentColor" />카드뉴스 변환하기</Button>
            </div>
          )}

          <div className="border-t border-gray-200 pt-5">
            <label htmlFor="card-signature" className="tool-label">서명</label>
            <input id="card-signature" value={signature} onChange={(event) => handleSignatureChange(event.target.value)} maxLength={40} placeholder="예: 모두뚝딱 · @계정명" className="tool-input" />
          </div>
        </section>

        {cardData && (
          <div ref={resultRef} className="animate-fade-in space-y-8 pt-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">미리보기</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            {/* Hidden Container for Export Rendering: Positioned off-screen with opacity 1 to ensure full rendering */}
            <div style={{ position: 'fixed', left: '-9999px', top: '0', zIndex: -1, opacity: 1, pointerEvents: 'none' }}>
              {cardData.slides.map((slide, idx) => (
                <div key={idx} id={`export-slide-${idx}`} className="w-96">
                  <CardPreview 
                    captureId={`export-slide-inner-${idx}`}
                    slide={slide}
                    bgImageUrl={cardData.customBackgroundImage}
                    totalSlides={cardData.slides.length}
                     themeIndex={cardData.themeIndex}
                    signature={cardData.signature}
                    textStrokeWidth={textStrokeWidth}
                    textStrokeColor={textStrokeColor}
                    onUpdate={() => {}}
                    hideControls={true}
                    forExport={true} 
                  />
                </div>
              ))}
            </div>

            <div className="relative max-w-sm mx-auto">
              <CardPreview 
                captureId="card-capture-target"
                slide={cardData.slides[currentSlideIndex]} 
                bgImageUrl={cardData.customBackgroundImage}
                totalSlides={cardData.slides.length}
                themeIndex={cardData.themeIndex}
                signature={cardData.signature}
                textStrokeWidth={textStrokeWidth}
                textStrokeColor={textStrokeColor}
                onUpdate={handleUpdateSlide}
              />
              <div className="flex items-center justify-between mt-6 px-4">
                <button onClick={prevSlide} disabled={currentSlideIndex === 0} className="p-3 rounded-full bg-white border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-gray-50 transition-colors shadow-sm"><ChevronLeft size={20} /></button>
                <span className="text-sm font-bold text-gray-400 tabular-nums">{currentSlideIndex + 1} / {cardData.slides.length}</span>
                <button onClick={nextSlide} disabled={currentSlideIndex === cardData.slides.length - 1} className="p-3 rounded-full bg-white border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-gray-50 transition-colors shadow-sm"><ChevronRight size={20} /></button>
              </div>

               <div className="mt-8 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-3 px-1 text-sm font-bold text-gray-700">
                      <div className="flex items-center gap-2">
                        <Palette size={16} className="text-primary"/>배경 테마
                      </div>
                      <button type="button" onClick={handleCustomBackground} disabled={isBackgroundLoading} className="flex min-h-11 items-center gap-1 rounded-lg bg-[#FFF0F0] px-3 text-xs font-bold text-primary transition-colors hover:bg-[#FFE0E0] disabled:cursor-wait disabled:opacity-60">
                        {isBackgroundLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {isBackgroundLoading ? '처리 중' : cardData.customBackgroundImage ? '배경 변경' : '배경 업로드'}
                      </button>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-3 max-h-48 overflow-y-auto p-2 border border-gray-100 rounded-xl bg-gray-50 no-scrollbar">
                    {THEMES.map((theme, i) => (
                      <button key={theme.id} type="button" aria-label={`${i + 1}번 배경 테마`} onClick={() => changeTheme(i)} className={`aspect-square w-full rounded-full border-2 transition-all cursor-pointer relative ${cardData.themeIndex === i ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-gray-200 hover:scale-110 opacity-80 hover:opacity-100'} ${theme.bg}`}>
                         {cardData.themeIndex === i && (
                             <div className="absolute inset-0 flex items-center justify-center text-white drop-shadow-sm"><Check size={14} strokeWidth={4} /></div>
                         )}
                      </button>
                    ))}
                   </div>
                   <input ref={backgroundInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label="배경 이미지 파일" className="sr-only" onChange={handleBackgroundFile} />
                   {cardData.customBackgroundImage && (
                     <div className="mt-3 flex min-h-14 items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-2.5">
                       <img src={cardData.customBackgroundImage} alt="" aria-hidden="true" className="size-11 shrink-0 rounded-md object-cover" />
                       <div className="min-w-0 flex-1">
                         <p className="text-xs font-bold text-green-800">배경 적용됨</p>
                         <p className="truncate text-xs text-green-700" title={backgroundFileName}>{backgroundFileName || '배경 이미지'}</p>
                       </div>
                       <button type="button" onClick={handleRemoveBackground} aria-label="배경 이미지 삭제" title="배경 이미지 삭제" className="tool-icon-button size-11 border-green-200 text-green-800 hover:bg-green-100">
                         <X size={17} />
                       </button>
                     </div>
                   )}
                   {backgroundError && <p role="alert" className="mt-3 text-sm font-bold leading-6 text-red-600">{backgroundError}</p>}
                   <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
                     <div>
                       <div className="mb-2 flex items-center justify-between text-xs font-bold text-gray-600">
                         <label htmlFor="stroke-width">글자 외곽선</label>
                         <span className="tabular-nums">{textStrokeWidth.toFixed(1)}px</span>
                       </div>
                       <input id="stroke-width" type="range" min="0" max="3" step="0.5" value={textStrokeWidth} onChange={(event) => setTextStrokeWidth(Number(event.target.value))} className="w-full accent-[#FF6B6B]" />
                     </div>
                     <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                       색상
                       <input type="color" value={textStrokeColor} onChange={(event) => setTextStrokeColor(event.target.value)} className="size-10 cursor-pointer rounded border border-gray-200 bg-white p-1" aria-label="글자 외곽선 색상" />
                     </label>
                   </div>
               </div>

               <div className="flex gap-2 mt-4">
                 <Button onClick={handleDownloadCurrent} variant="secondary" className="flex-1 py-3 text-sm"><Download size={18} />현재 장 저장</Button>
                 <Button onClick={handleDownloadAll} variant="primary" isLoading={isDownloading} className="flex-1 py-3 text-sm"><FolderDown size={18} />전체 저장 (ZIP)</Button>
               </div>

            </div>

            {(cardData.snsTitle || cardData.snsBody || cardData.hashtags.length > 0) && (
              <details className="group tool-panel mx-auto max-w-2xl overflow-hidden">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <h3 className="font-black text-gray-900">SNS용 제목·본문</h3>
                  <ChevronDown size={20} className="shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
                </summary>
                {cardData.snsTitle && (
                  <div className="border-t border-gray-100 p-4 sm:p-5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-gray-500">제목</span>
                      <button type="button" onClick={() => copySnsField('title', cardData.snsTitle || '')} className="flex min-h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-bold text-gray-700 hover:bg-gray-50">
                        {copiedField === 'title' ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                        {copiedField === 'title' ? '복사됨' : '제목 복사'}
                      </button>
                    </div>
                    <p className="font-bold leading-7 text-gray-900">{cardData.snsTitle}</p>
                  </div>
                )}
                {cardData.snsBody && (
                  <div className="border-t border-gray-100 p-4 sm:p-5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-gray-500">본문</span>
                      <button type="button" onClick={() => copySnsField('body', cardData.snsBody || '')} className="flex min-h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-bold text-gray-700 hover:bg-gray-50">
                        {copiedField === 'body' ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                        {copiedField === 'body' ? '복사됨' : '본문 복사'}
                      </button>
                    </div>
                    <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-gray-700">{cardData.snsBody}</p>
                    {cardData.hashtags.length > 0 && <p className="mt-4 text-sm font-bold leading-7 text-primary">{cardData.hashtags.map((tag) => `#${tag.replace(/^#/, '')}`).join(' ')}</p>}
                  </div>
                )}
              </details>
            )}
          </div>
        )}
      </main>
      )}
    </div>
  );
};

export default App;
