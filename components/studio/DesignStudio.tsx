import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, Rect, Circle, Textbox, Line, Triangle, FabricImage, FabricObject, ActiveSelection, Group } from 'fabric';
import { Toolbar } from './Toolbar';
import { PropertyPanel } from './PropertyPanel';
import {
  Download, ZoomIn, ZoomOut, Undo2, Redo2, Trash2, Copy, ClipboardPaste,
  Layers, ChevronUp, ChevronDown, Lock, Unlock, Eye, EyeOff, Maximize,
  Plus, Settings, Check, X, FileImage, LayoutTemplate, Trash, Sparkles
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface DesignStudioProps {}

interface StudioState {
  pages: string[];
  currentPageIndex: number;
  width: number;
  height: number;
}

type AIMode = 'bg-remove' | 'object-extract';

interface ExtractedLayer {
  id: string;
  type: 'image' | 'text' | 'rect' | 'circle';
  left: number;
  top: number;
  width: number;
  height: number;
  image?: string;
  text?: string;
  fill?: string;
  opacity?: number;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  name?: string;
}

interface ExtractionResult {
  version?: number;
  mode?: AIMode;
  width: number;
  height: number;
  background?: string | null;
  elements: ExtractedLayer[];
  stats?: {
    texts: number;
    shapes: number;
    images: number;
  };
}

const PRESETS = [
  { label: '인스타그램 정방형 (1:1)', width: 1080, height: 1080 },
  { label: '인스타그램 세로 (4:5)', width: 1080, height: 1350 },
  { label: '유튜브 썸네일 (16:9)', width: 1280, height: 720 },
  { label: '블로그 썸네일 (1:1)', width: 800, height: 800 },
];

export const DesignStudio: React.FC<DesignStudioProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [zoom, setZoom] = useState(0.45);
  const [canvasObjects, setCanvasObjects] = useState<FabricObject[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Studio State
  const emptyCanvasJSON = '{"version":"6.0.0","objects":[],"background":"#ffffff"}';
  const [pages, setPages] = useState<string[]>([emptyCanvasJSON]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(1080);
  const [canvasHeight, setCanvasHeight] = useState(1350);

  // History State
  const [history, setHistory] = useState<StudioState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryUpdate = useRef(false);
  const isShiftDownRef = useRef(false);
  const pagesRef = useRef(pages);
  const currentPageIndexRef = useRef(currentPageIndex);
  const canvasWidthRef = useRef(canvasWidth);
  const canvasHeightRef = useRef(canvasHeight);
  const historyIndexRef = useRef(historyIndex);

  // Keep refs in sync
  useEffect(() => { pagesRef.current = pages; }, [pages]);
  useEffect(() => { currentPageIndexRef.current = currentPageIndex; }, [currentPageIndex]);
  useEffect(() => { canvasWidthRef.current = canvasWidth; }, [canvasWidth]);
  useEffect(() => { canvasHeightRef.current = canvasHeight; }, [canvasHeight]);
  useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);

  // Size Settings UI
  const [showSizeSettings, setShowSizeSettings] = useState(false);
  const [customWidth, setCustomWidth] = useState(canvasWidth.toString());
  const [customHeight, setCustomHeight] = useState(canvasHeight.toString());
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [initialImageUrl, setInitialImageUrl] = useState<string | null>(null);
  const [autoAIMode, setAutoAIMode] = useState<AIMode | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

  const syncObjects = useCallback(() => {
    if (!fabricRef.current) return;
    setCanvasObjects([...fabricRef.current.getObjects()]);
  }, []);

  const saveHistoryDirect = useCallback((canvas: Canvas, currentPages?: string[], currentIndex?: number, cw?: number, ch?: number) => {
    if (isHistoryUpdate.current) return;
    const p = currentPages ?? pagesRef.current;
    const idx = currentIndex ?? currentPageIndexRef.current;
    const w = cw ?? canvasWidthRef.current;
    const h = ch ?? canvasHeightRef.current;
    const json = JSON.stringify(canvas.toJSON());
    const newPages = [...p];
    newPages[idx] = json;

    const stateToSave: StudioState = { pages: newPages, currentPageIndex: idx, width: w, height: h };

    setHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndexRef.current + 1), stateToSave];
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
    setPages(newPages);
  }, []);

  const saveHistory = useCallback(() => {
    if (!fabricRef.current) return;
    saveHistoryDirect(fabricRef.current);
  }, [saveHistoryDirect]);

  const applyZoom = (canvas: Canvas, z: number, w: number, h: number) => {
    canvas.setZoom(z);
    canvas.setDimensions({
      width: w * z,
      height: h * z,
    });
  };

  const resizeCanvasTo = useCallback((canvas: Canvas, w: number, h: number, z: number = zoom) => {
    setCanvasWidth(w);
    setCanvasHeight(h);
    setCustomWidth(w.toString());
    setCustomHeight(h.toString());
    applyZoom(canvas, z, w, h);
  }, [zoom]);

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
      uniformScaling: false,
    });

    // Fabric v7 native: Shift key = uniform scaling
    (canvas as any).uniScaleKey = 'shiftKey';

    fabricRef.current = canvas;
    applyZoom(canvas, zoom, canvasWidth, canvasHeight);
    setIsCanvasReady(true);

    // Track move start for Axis Lock
    let moveStartPos = { left: 0, top: 0 };

    // Event handlers
    canvas.on('selection:created', () => {
      setSelectedObject(canvas.getActiveObject());
    });
    canvas.on('selection:updated', () => {
      setSelectedObject(canvas.getActiveObject());
    });
    canvas.on('selection:cleared', () => setSelectedObject(null));

    // Record move start position for axis-lock
    canvas.on('mouse:down', () => {
      const obj = canvas.getActiveObject();
      if (obj) {
        moveStartPos = { left: obj.left || 0, top: obj.top || 0 };
        // lockUniScaling 버튼: 객체에 비율고정이 켜져있으면 캔버스도 비율고정
        if (obj.lockUniScaling) {
          canvas.uniformScaling = true;
        }
      }
    });

    canvas.on('mouse:up', () => {
      // lockUniScaling이 아닌 경우 기본값(false)으로 복원 → Shift 토글이 정상 작동
      const obj = canvas.getActiveObject();
      canvas.uniformScaling = !!(obj?.lockUniScaling);
    });

    canvas.on('object:moving', (e) => {
      const obj = e.target;
      if (!obj) return;

      // Removed buggy manual Shift+이동 축 고정 since it conflicts with ActiveSelection

      // 중앙 스냅 가이드
      const threshold = 15;
      const cw = canvas.width || 0;
      const ch = canvas.height || 0;
      const cx = (cw / canvas.getZoom()) / 2;
      const cy = (ch / canvas.getZoom()) / 2;
      const objCenterX = (obj.left || 0) + ((obj.width || 0) * (obj.scaleX || 1)) / 2;
      const objCenterY = (obj.top || 0) + ((obj.height || 0) * (obj.scaleY || 1)) / 2;

      if (Math.abs(objCenterX - cx) < threshold) {
        obj.set('left', cx - ((obj.width || 0) * (obj.scaleX || 1)) / 2);
      }
      if (Math.abs(objCenterY - cy) < threshold) {
        obj.set('top', cy - ((obj.height || 0) * (obj.scaleY || 1)) / 2);
      }
    });

    canvas.on('object:rotating', (e) => {
      if (e.e?.shiftKey && e.target) {
        const angle = e.target.angle || 0;
        e.target.set('angle', Math.round(angle / 15) * 15);
      }
    });

    canvas.on('object:modified', () => {
      saveHistory();
      syncObjects();
    });
    canvas.on('object:added', () => syncObjects());
    canvas.on('object:removed', () => syncObjects());

    return () => {
      canvas.dispose();
      fabricRef.current = null;
      setIsCanvasReady(false);
    };
  }, []); // Run only once on mount

  // Load initial image when initialImageUrl is set
  useEffect(() => {
    if (!initialImageUrl || !isCanvasReady || !fabricRef.current) return;
    
    const canvas = fabricRef.current;
    FabricImage.fromURL(initialImageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      img.set({
        left: 0,
        top: 0,
        scaleX: 1,
        scaleY: 1,
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      saveHistoryDirect(canvas, [''], 0, canvasWidth, canvasHeight);
      setInitialImageUrl(null); // Clear once loaded
      setIsInitialLoading(false);

      // Trigger Auto AI if requested
      if (autoAIMode) {
        handleAIExtract(autoAIMode, img);
        setAutoAIMode(null);
      }
    }).catch(err => {
      console.error('Failed to load initial image:', err);
      setInitialImageUrl(null);
      setIsInitialLoading(false);
      setAutoAIMode(null);
    });
  }, [initialImageUrl, canvasWidth, canvasHeight, saveHistoryDirect, autoAIMode]);

  // Resize canvas when width/height changes
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.setDimensions({ width: canvasWidth * zoom, height: canvasHeight * zoom });
    }
  }, [canvasWidth, canvasHeight, zoom]);


  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.1, 2);
    setZoom(newZoom);
    if (fabricRef.current) applyZoom(fabricRef.current, newZoom, canvasWidth, canvasHeight);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.1, 0.2);
    setZoom(newZoom);
    if (fabricRef.current) applyZoom(fabricRef.current, newZoom, canvasWidth, canvasHeight);
  };

  const handleFitToScreen = () => {
    if (!containerRef.current || !fabricRef.current) return;
    const containerHeight = containerRef.current.clientHeight - 80;
    const containerWidth = containerRef.current.clientWidth - 80;
    const scaleX = containerWidth / canvasWidth;
    const scaleY = containerHeight / canvasHeight;
    const newZoom = Math.min(scaleX, scaleY, 1);
    setZoom(newZoom);
    applyZoom(fabricRef.current, newZoom, canvasWidth, canvasHeight);
  };

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0 || !fabricRef.current) return;
    const newIndex = historyIndex - 1;
    const state = history[newIndex];
    
    isHistoryUpdate.current = true;
    setCanvasWidth(state.width);
    setCanvasHeight(state.height);
    setPages(state.pages);
    setCurrentPageIndex(state.currentPageIndex);

    fabricRef.current.loadFromJSON(state.pages[state.currentPageIndex]).then(() => {
      fabricRef.current?.renderAll();
      setHistoryIndex(newIndex);
      syncObjects();
      isHistoryUpdate.current = false;
    });
  }, [history, historyIndex, syncObjects]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1 || !fabricRef.current) return;
    const newIndex = historyIndex + 1;
    const state = history[newIndex];
    
    isHistoryUpdate.current = true;
    setCanvasWidth(state.width);
    setCanvasHeight(state.height);
    setPages(state.pages);
    setCurrentPageIndex(state.currentPageIndex);

    fabricRef.current.loadFromJSON(state.pages[state.currentPageIndex]).then(() => {
      fabricRef.current?.renderAll();
      setHistoryIndex(newIndex);
      syncObjects();
      isHistoryUpdate.current = false;
    });
  }, [history, historyIndex, syncObjects]);

  // Page Management
  const switchPage = (index: number) => {
    if (!fabricRef.current || index === currentPageIndex) return;
    
    const currentJson = JSON.stringify(fabricRef.current.toJSON());
    const newPages = [...pages];
    newPages[currentPageIndex] = currentJson;
    
    isHistoryUpdate.current = true;
    fabricRef.current.loadFromJSON(newPages[index]).then(() => {
      fabricRef.current?.renderAll();
      setCurrentPageIndex(index);
      setPages(newPages);
      isHistoryUpdate.current = false;
      saveHistoryDirect(fabricRef.current!, newPages, index, canvasWidth, canvasHeight);
      fabricRef.current?.discardActiveObject();
    });
  };

  const addPage = () => {
    if (!fabricRef.current) return;
    const currentJson = JSON.stringify(fabricRef.current.toJSON());
    const newPages = [...pages];
    newPages[currentPageIndex] = currentJson;
    newPages.push(emptyCanvasJSON);
    
    const newIndex = newPages.length - 1;
    isHistoryUpdate.current = true;
    fabricRef.current.loadFromJSON(newPages[newIndex]).then(() => {
      fabricRef.current?.renderAll();
      setCurrentPageIndex(newIndex);
      setPages(newPages);
      isHistoryUpdate.current = false;
      saveHistoryDirect(fabricRef.current!, newPages, newIndex, canvasWidth, canvasHeight);
    });
  };

  const duplicatePage = (index: number) => {
    if (!fabricRef.current) return;
    // ensure current is saved
    const currentJson = JSON.stringify(fabricRef.current.toJSON());
    const newPages = [...pages];
    newPages[currentPageIndex] = currentJson;
    
    // duplicate
    newPages.splice(index + 1, 0, newPages[index]);
    setPages(newPages);
    setCurrentPageIndex(index + 1);
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1 || !fabricRef.current) return;
    const newPages = pages.filter((_, i) => i !== index);
    const newIndex = index >= newPages.length ? newPages.length - 1 : index;
    
    isHistoryUpdate.current = true;
    fabricRef.current.loadFromJSON(newPages[newIndex]).then(() => {
      fabricRef.current?.renderAll();
      setCurrentPageIndex(newIndex);
      setPages(newPages);
      isHistoryUpdate.current = false;
      saveHistoryDirect(fabricRef.current!, newPages, newIndex, canvasWidth, canvasHeight);
    });
  };

  const handleAIExtract = async (mode: AIMode, targetObj?: FabricObject) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const activeObj = targetObj || canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof FabricImage)) {
      alert('AI 기능을 사용하려면 이미지를 선택해주세요.');
      return;
    }

    // [AI-v2] 원본 객체의 상태를 정확하게 캡처 (절대 좌표 기준 AABB)
    const boundingRect = activeObj.getBoundingRect();
    const originalBox = {
      left: boundingRect.left,
      top: boundingRect.top,
      width: boundingRect.width,
      height: boundingRect.height,
      angle: activeObj.angle || 0,
    };

    console.log('[AI-v2] Starting processing with bounding rect:', originalBox);

    setIsProcessingAI(true);
    setAiStatus(mode === 'object-extract' ? '요소를 분석 중...' : '피사체 분석 중...');

    try {
      const multiplier = 1 / (activeObj.scaleX || 1);
      const dataURL = activeObj.toDataURL({ format: 'png', multiplier });
      
      const blob = await (await fetch(dataURL)).blob();
      const formData = new FormData();
      formData.append('file', blob, 'image.png');

      const response = await fetch(`/api/extract?mode=${mode}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI 서버 오류: ${errorText.substring(0, 100)}`);
      }

      const result: ExtractionResult = await response.json();
      console.log('[AI-v3] === FULL API RESPONSE ===');
      console.log('[AI-v3] result.width:', result.width, 'result.height:', result.height);
      console.log('[AI-v3] result.mode:', result.mode);
      if (!result || !result.elements) throw new Error('AI 분석 결과가 비어있습니다.');

      const aiWidth = result.width || 1024;
      const aiHeight = result.height || 1024;
      
      // AI 결과를 현재 캔버스 상의 실제 크기(AABB)로 매핑하는 비율
      const fitScaleX = originalBox.width / aiWidth;
      const fitScaleY = originalBox.height / aiHeight;

      console.log('[AI-v3] === MAPPING INFO ===');
      console.log('[AI-v3] originalBox:', JSON.stringify(originalBox));
      console.log('[AI-v3] aiWidth:', aiWidth, 'aiHeight:', aiHeight);
      console.log('[AI-v3] fitScaleX:', fitScaleX, 'fitScaleY:', fitScaleY);

      // getBoundingRect()에서 구한 left/top은 이미 절대 좌상단 좌표입니다.
      const baseLeft = originalBox.left;
      const baseTop = originalBox.top;
      console.log('[AI-v3] baseLeft:', baseLeft, 'baseTop:', baseTop, '(using getBoundingRect)');

      const addedObjects: FabricObject[] = [];

      const toCanvasProps = (layer: ExtractedLayer) => ({
        left: baseLeft + (layer.left * fitScaleX),
        top: baseTop + (layer.top * fitScaleY),
        scaleX: fitScaleX,
        scaleY: fitScaleY,
        originX: 'left' as const,
        originY: 'top' as const,
      });

      canvas.remove(activeObj);

      if (mode === 'bg-remove') {
        const fgLayer = result.elements.find(l => l.type === 'image' && l.image);
        if (!fgLayer?.image) throw new Error('누끼 이미지를 생성하지 못했습니다.');
        
        const fgImg = await FabricImage.fromURL(fgLayer.image, { crossOrigin: 'anonymous' });
        fgImg.set({
          ...toCanvasProps(fgLayer),
          angle: originalBox.angle,
          name: '피사체',
        });
        
        canvas.add(fgImg);
        canvas.setActiveObject(fgImg);
        addedObjects.push(fgImg);
      } else {
        // 배경 복원
        if (result.background) {
          const bgImg = await FabricImage.fromURL(result.background, { crossOrigin: 'anonymous' });
          bgImg.set({
            left: baseLeft,
            top: baseTop,
            scaleX: originalBox.width / bgImg.width!,
            scaleY: originalBox.height / bgImg.height!,
            angle: originalBox.angle,
            selectable: true,
            name: '복원된 배경',
            originX: 'left',
            originY: 'top',
          });
          canvas.add(bgImg);
          addedObjects.push(bgImg);
          console.log('[AI-v3] Added background:', { left: baseLeft, top: baseTop });
        }

        for (const layer of result.elements) {
          const props = toCanvasProps(layer);
          let obj: FabricObject | null = null;

          if (layer.type === 'text') {
            obj = new Textbox(layer.text || '', {
              ...props,
              fontSize: (layer.fontSize || 32) * fitScaleY,
              fill: layer.fill || '#111827',
              fontFamily: 'Inter',
              fontWeight: layer.fontWeight || 'normal',
              textAlign: layer.textAlign || 'left' as any,
              angle: originalBox.angle,
              name: '텍스트',
            });
          } else if (layer.type === 'rect') {
            obj = new Rect({
              ...props,
              width: layer.width,
              height: layer.height,
              fill: layer.fill || '#3B82F6',
              opacity: layer.opacity || 1,
              angle: originalBox.angle,
              name: '도형',
            });
          } else if (layer.type === 'circle') {
            obj = new Circle({
              ...props,
              radius: (Math.max(layer.width, layer.height) / 2),
              fill: layer.fill || '#3B82F6',
              opacity: layer.opacity || 1,
              angle: originalBox.angle,
              name: '원형',
            });
          } else if (layer.type === 'image' && layer.image) {
            const img = await FabricImage.fromURL(layer.image, { crossOrigin: 'anonymous' });
            img.set({
              ...props,
              angle: originalBox.angle,
              name: '이미지 요소',
              originX: 'left',
              originY: 'top',
            });
            obj = img;
          }

          if (obj) {
            console.log(`[AI-v3] Adding ${layer.type}: left=${obj.left} top=${obj.top} w=${(obj as any).width} h=${(obj as any).height} scaleX=${obj.scaleX} scaleY=${obj.scaleY}`);
            canvas.add(obj);
            addedObjects.push(obj);
          }
        }

        if (addedObjects.length > 1) {
          const selectables = addedObjects.filter(o => o.name !== '복원된 배경');
          if (selectables.length > 0) {
            const selection = new ActiveSelection(selectables, { canvas });
            canvas.setActiveObject(selection);
          }
        }
      }

      canvas.renderAll();
      saveHistory();
      setAiStatus('완료!');
      setTimeout(() => setAiStatus(''), 2000);
    } catch (err: any) {
      console.error('[AI-v2] Error:', err);
      alert(err.message || 'AI 처리에 실패했습니다.');
      setAiStatus('오류 발생');
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Add Elements
  const addText = useCallback((text: string = '텍스트를 입력하세요', options: any = {}) => {
    if (!fabricRef.current) return;
    const textbox = new Textbox(text, {
      left: 100,
      top: 100,
      fontSize: 48,
      fontFamily: 'Noto Sans KR',
      fill: '#333333',
      width: 500,
      textAlign: 'center',
      ...options,
    });
    fabricRef.current.add(textbox);
    fabricRef.current.setActiveObject(textbox);
    fabricRef.current.renderAll();
    saveHistory();
  }, [saveHistory]);

  const addHeading = useCallback(() => {
    addText('제목을 입력하세요', { fontSize: 72, fontWeight: 'bold', fill: '#111111' });
  }, [addText]);

  const addSubheading = useCallback(() => {
    addText('소제목', { fontSize: 48, fontWeight: '600', fill: '#555555' });
  }, [addText]);

  const addBodyText = useCallback(() => {
    addText('본문 내용을 여기에 입력하세요.\n줄바꿈도 자유롭게 가능합니다.', { fontSize: 32, fill: '#666666', textAlign: 'left' });
  }, [addText]);

  const addRect = useCallback((options: any = {}) => {
    if (!fabricRef.current) return;
    const rect = new Rect({
      left: 150,
      top: 150,
      width: 200,
      height: 200,
      fill: '#FF6B6B',
      rx: 12,
      ry: 12,
      ...options,
    });
    fabricRef.current.add(rect);
    fabricRef.current.setActiveObject(rect);
    fabricRef.current.renderAll();
    saveHistory();
  }, [saveHistory]);

  const addCircle = useCallback(() => {
    if (!fabricRef.current) return;
    const circle = new Circle({
      left: 200,
      top: 200,
      radius: 100,
      fill: '#4ECDC4',
    });
    fabricRef.current.add(circle);
    fabricRef.current.setActiveObject(circle);
    fabricRef.current.renderAll();
    saveHistory();
  }, [saveHistory]);

  const addTriangle = useCallback(() => {
    if (!fabricRef.current) return;
    const triangle = new Triangle({
      left: 200,
      top: 200,
      width: 200,
      height: 180,
      fill: '#FFE66D',
    });
    fabricRef.current.add(triangle);
    fabricRef.current.setActiveObject(triangle);
    fabricRef.current.renderAll();
    saveHistory();
  }, [saveHistory]);

  const addLine = useCallback(() => {
    if (!fabricRef.current) return;
    const line = new Line([100, 300, 500, 300], {
      stroke: '#333333',
      strokeWidth: 4,
    });
    fabricRef.current.add(line);
    fabricRef.current.setActiveObject(line);
    fabricRef.current.renderAll();
    saveHistory();
  }, [saveHistory]);

  const addImage = useCallback((url: string) => {
    if (!fabricRef.current) return;
    FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      if (!fabricRef.current) return;
      const canvas = fabricRef.current;
      
      // If not initialized, set canvas size to match the image
      if (!isInitialized) {
        const w = img.width || 1080;
        const h = img.height || 1080;
        resizeCanvasTo(canvas, w, h);
        setIsInitialized(true);
        
        img.set({
          left: 0,
          top: 0,
          scaleX: 1,
          scaleY: 1,
        });
      } else {
        const scale = Math.min(
          canvasWidth / (img.width || 1),
          canvasHeight / (img.height || 1),
          1
        );
        const displayWidth = (img.width || 1) * scale;
        const displayHeight = (img.height || 1) * scale;
        img.set({
          left: (canvasWidth - displayWidth) / 2,
          top: (canvasHeight - displayHeight) / 2,
          scaleX: scale,
          scaleY: scale,
        });
      }
      
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      saveHistory();
    }).catch(() => {
      alert('이미지를 불러올 수 없습니다.');
    });
  }, [canvasWidth, canvasHeight, isInitialized, resizeCanvasTo, saveHistory]);

  const handleImageUpload = useCallback((mode?: AIMode) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      setIsInitialLoading(true);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        
        if (!isInitialized || mode) {
          if (mode) setAutoAIMode(mode);
          
          const img = new Image();
          img.onload = () => {
            const w = img.width || 1080;
            const h = img.height || 1080;
            if (fabricRef.current) {
              resizeCanvasTo(fabricRef.current, w, h);
              fabricRef.current.clear();
              fabricRef.current.backgroundColor = '#ffffff';
            } else {
              setCanvasWidth(w);
              setCanvasHeight(h);
              setCustomWidth(w.toString());
              setCustomHeight(h.toString());
            }
            setInitialImageUrl(dataUrl);
            setIsInitialized(true);
          };
          img.src = dataUrl;
        } else {
          addImage(dataUrl);
          setIsInitialLoading(false);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [isInitialized, addImage, resizeCanvasTo]);

  // Delete, Copy, Paste
  const handleDelete = useCallback(() => {
    if (!fabricRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();
    activeObjects.forEach(obj => fabricRef.current?.remove(obj));
    fabricRef.current.discardActiveObject();
    fabricRef.current.renderAll();
    saveHistory();
  }, [saveHistory]);

  const handleDuplicate = useCallback(() => {
    if (!fabricRef.current || !selectedObject) return;
    selectedObject.clone().then((cloned: FabricObject) => {
      if (!fabricRef.current) return;
      cloned.set({
        left: (cloned.left || 0) + 30,
        top: (cloned.top || 0) + 30,
      });
      fabricRef.current.add(cloned);
      fabricRef.current.setActiveObject(cloned);
      fabricRef.current.renderAll();
      saveHistory();
    });
  }, [selectedObject, saveHistory]);

  // Layer operations
  const bringForward = useCallback(() => {
    if (!fabricRef.current || !selectedObject) return;
    fabricRef.current.bringObjectForward(selectedObject);
    fabricRef.current.renderAll();
    saveHistory();
  }, [selectedObject, saveHistory]);

  const sendBackward = useCallback(() => {
    if (!fabricRef.current || !selectedObject) return;
    fabricRef.current.sendObjectBackwards(selectedObject);
    fabricRef.current.renderAll();
    saveHistory();
  }, [selectedObject, saveHistory]);

  const bringToFront = useCallback(() => {
    if (!fabricRef.current || !selectedObject) return;
    fabricRef.current.bringObjectToFront(selectedObject);
    fabricRef.current.renderAll();
    saveHistory();
  }, [selectedObject, saveHistory]);

  const sendToBack = useCallback(() => {
    if (!fabricRef.current || !selectedObject) return;
    fabricRef.current.sendObjectToBack(selectedObject);
    fabricRef.current.renderAll();
    saveHistory();
  }, [selectedObject, saveHistory]);

  // Group / Ungroup
  const handleGroup = useCallback(() => {
    if (!fabricRef.current || !selectedObject) return;
    const type = selectedObject.type?.toLowerCase();
    if (type !== 'activeselection') return;
    
    const activeSelection = selectedObject as ActiveSelection;
    const items = activeSelection.removeAll();
    
    const newGroup = new Group(items);
    fabricRef.current.add(newGroup);
    fabricRef.current.setActiveObject(newGroup);
    fabricRef.current.requestRenderAll();
    setSelectedObject(newGroup);
    saveHistory();
  }, [selectedObject, saveHistory]);

  const handleUngroup = useCallback(() => {
    if (!fabricRef.current || !selectedObject) return;
    const type = selectedObject.type?.toLowerCase();
    if (type !== 'group') return;
    
    const group = selectedObject as Group;
    const items = group.removeAll();
    fabricRef.current.remove(group);
    
    items.forEach(item => fabricRef.current!.add(item));
    
    const activeSelection = new ActiveSelection(items, { canvas: fabricRef.current });
    fabricRef.current.setActiveObject(activeSelection);
    fabricRef.current.requestRenderAll();
    setSelectedObject(activeSelection);
    saveHistory();
  }, [selectedObject, saveHistory]);

  // Background color
  const handleBgColor = useCallback((color: string) => {
    if (!fabricRef.current) return;
    fabricRef.current.backgroundColor = color;
    fabricRef.current.renderAll();
    saveHistory();
  }, [saveHistory]);

  // Background image
  const handleBgImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (!fabricRef.current) return;
        FabricImage.fromURL(dataUrl).then((img) => {
          if (!fabricRef.current) return;
          const scaleX = canvasWidth / (img.width || 1);
          const scaleY = canvasHeight / (img.height || 1);
          img.set({ scaleX, scaleY, originX: 'left', originY: 'top' });
          fabricRef.current.backgroundImage = img;
          fabricRef.current.renderAll();
          saveHistory();
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [canvasWidth, canvasHeight, saveHistory]);

  // Export
  const handleExportPNG = async () => {
    if (!fabricRef.current) return;
    
    // Save current state just in case
    const currentJson = JSON.stringify(fabricRef.current.toJSON());
    const exportPages = [...pages];
    exportPages[currentPageIndex] = currentJson;

    const tempCanvasElement = document.createElement('canvas');
    const tempCanvas = new Canvas(tempCanvasElement, {
      width: canvasWidth,
      height: canvasHeight
    });

    if (exportPages.length === 1) {
      // Export single image
      await tempCanvas.loadFromJSON(exportPages[0]);
      tempCanvas.renderAll();
      const dataUrl = tempCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
      const link = document.createElement('a');
      link.download = `cardnews-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Export multiple images as ZIP
      const zip = new JSZip();
      for (let i = 0; i < exportPages.length; i++) {
        await tempCanvas.loadFromJSON(exportPages[i]);
        tempCanvas.renderAll();
        const dataUrl = tempCanvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
        zip.file(`cardnews_page_${i + 1}.png`, base64Data, { base64: true });
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `cardnews_project_${Date.now()}.zip`);
    }
    tempCanvas.dispose();
  };

  // Save / Load JSON
  const handleSaveJSON = useCallback(() => {
    if (!fabricRef.current) return;
    const currentJson = JSON.stringify(fabricRef.current.toJSON());
    const exportPages = [...pages];
    exportPages[currentPageIndex] = currentJson;

    const stateToSave: StudioState = {
      pages: exportPages,
      currentPageIndex: currentPageIndex,
      width: canvasWidth,
      height: canvasHeight
    };

    const json = JSON.stringify(stateToSave, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `design-${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [canvasWidth, canvasHeight, currentPageIndex, pages]);

  const handleLoadJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const jsonStr = ev.target?.result as string;
          // check if it's new StudioState or old fabric JSON
          const data = JSON.parse(jsonStr);
          let loadedPages = [''];
          let loadedWidth = 1080;
          let loadedHeight = 1350;
          let loadedIndex = 0;

          if (data.pages && Array.isArray(data.pages)) {
            loadedPages = data.pages;
            loadedWidth = data.width || 1080;
            loadedHeight = data.height || 1350;
            loadedIndex = data.currentPageIndex || 0;
          } else {
            // Old format fallback
            loadedPages = [jsonStr];
          }

          setCanvasWidth(loadedWidth);
          setCanvasHeight(loadedHeight);
          setPages(loadedPages);
          setCurrentPageIndex(loadedIndex);

          if (!fabricRef.current) return;
          isHistoryUpdate.current = true;
          fabricRef.current.loadFromJSON(loadedPages[loadedIndex]).then(() => {
            fabricRef.current?.renderAll();
            isHistoryUpdate.current = false;
            saveHistoryDirect(fabricRef.current!, loadedPages, loadedIndex, loadedWidth, loadedHeight);
            syncObjects();
          });
        } catch (err) {
          alert('올바른 파일이 아닙니다.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [saveHistoryDirect, syncObjects]);

  // Update selected object property
  const [renderKey, setRenderKey] = useState(0);
  const updateObjectProp = useCallback((prop: string, value: any) => {
    if (!fabricRef.current) return;
    const activeObj = fabricRef.current.getActiveObject();
    if (!activeObj) return;
    (activeObj as any).set(prop, value);
    activeObj.setCoords();
    fabricRef.current.renderAll();
    
    // Trigger re-render of properties
    setRenderKey(k => k + 1);
  }, []);

  const commitObjectChange = useCallback(() => {
    saveHistory();
  }, [saveHistory]);

  // Handle Canvas Resize
  const applyPresetSize = (w: number, h: number) => {
    setCanvasWidth(w);
    setCanvasHeight(h);
    setCustomWidth(w.toString());
    setCustomHeight(h.toString());
    setShowSizeSettings(false);
    if (fabricRef.current) {
      saveHistoryDirect(fabricRef.current, pages, currentPageIndex, w, h);
    }
  };

  const applyCustomSize = () => {
    const w = parseInt(customWidth);
    const h = parseInt(customHeight);
    if (w > 0 && h > 0) {
      setCanvasWidth(w);
      setCanvasHeight(h);
      setShowSizeSettings(false);
      if (fabricRef.current) {
        saveHistoryDirect(fabricRef.current, pages, currentPageIndex, w, h);
      }
    } else {
      alert('올바른 크기를 입력하세요.');
    }
  };

  // Stable refs for handlers to keep keyboard listener stable
  const handlersRef = useRef({
    handleDelete, handleUndo, handleRedo, handleDuplicate, saveHistory, setSelectedObject
  });
  useEffect(() => {
    handlersRef.current = { handleDelete, handleUndo, handleRedo, handleDuplicate, saveHistory, setSelectedObject };
  }, [handleDelete, handleUndo, handleRedo, handleDuplicate, saveHistory, setSelectedObject]);

  // Keyboard shortcuts & Nudge
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      // Track Shift state for lockUniScaling button support
      if (e.key === 'Shift') {
        isShiftDownRef.current = true;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      // Select All: Ctrl+A
      if (ctrl && key === 'a') {
        e.preventDefault();
        canvas.discardActiveObject();
        const objects = canvas.getObjects().filter(obj => obj.selectable);
        if (objects.length > 0) {
          const sel = new ActiveSelection(objects, { canvas });
          canvas.setActiveObject(sel);
          canvas.requestRenderAll();
          handlersRef.current.setSelectedObject(sel);
        }
        return;
      }

      if (key === 'delete' || key === 'backspace') {
        const activeObj = canvas.getActiveObject();
        if (activeObj && (activeObj as any).isEditing) return;
        handlersRef.current.handleDelete();
      }
      if (ctrl && key === 'z') { e.preventDefault(); handlersRef.current.handleUndo(); }
      if (ctrl && key === 'y') { e.preventDefault(); handlersRef.current.handleRedo(); }
      if (ctrl && key === 'd') { e.preventDefault(); handlersRef.current.handleDuplicate(); }
      
      if (ctrl && key === 'g') {
        e.preventDefault();
        const active = canvas.getActiveObject();
        if (!active) return;

        const activeType = active.type?.toLowerCase();

        if (e.shiftKey) {
          // Ctrl+Shift+G: 그룹 해제
          if (activeType === 'group') {
            const group = active as Group;
            const items = group.removeAll();
            canvas.remove(group);
            
            items.forEach(item => canvas.add(item));
            
            const activeSelection = new ActiveSelection(items, { canvas });
            canvas.setActiveObject(activeSelection);
            canvas.requestRenderAll();
            handlersRef.current.setSelectedObject(activeSelection);
            handlersRef.current.saveHistory();
          }
        } else {
          // Ctrl+G: 그룹화 (여러 객체를 하나로 합침)
          if (activeType === 'activeselection') {
            const activeSelection = active as ActiveSelection;
            const items = activeSelection.removeAll();
            
            const newGroup = new Group(items);
            canvas.add(newGroup);
            canvas.setActiveObject(newGroup);
            canvas.requestRenderAll();
            handlersRef.current.setSelectedObject(newGroup);
            handlersRef.current.saveHistory();
          }
        }
      }

      // Nudge with arrow keys
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        const activeObj = canvas.getActiveObject();
        if (!activeObj || (activeObj as any).isEditing) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        switch (key) {
          case 'arrowup': activeObj.set('top', (activeObj.top || 0) - step); break;
          case 'arrowdown': activeObj.set('top', (activeObj.top || 0) + step); break;
          case 'arrowleft': activeObj.set('left', (activeObj.left || 0) - step); break;
          case 'arrowright': activeObj.set('left', (activeObj.left || 0) + step); break;
        }
        activeObj.setCoords();
        canvas.renderAll();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const key = e.key.toLowerCase();

      if (e.key === 'Shift') {
        isShiftDownRef.current = false;
      }

      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        const activeObj = canvas.getActiveObject();
        if (!activeObj || (activeObj as any).isEditing) return;
        handlersRef.current.saveHistory();
      }
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // Empty dependency array means it stays stable throughout the component lifecycle

  return (
    <div className="flex h-[calc(100vh-65px)] bg-slate-50 overflow-hidden font-sans text-slate-800 relative">
      {/* Welcome Dashboard Overlay */}
      {!isInitialized && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 p-6 overflow-auto">
          <div className="max-w-4xl w-full">
            <div className="text-center mb-12 animate-fade-in-down">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black tracking-widest uppercase mb-4">
                <Sparkles size={14} /> New Project
              </div>
              <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight leading-tight">어떤 디자인을 시작할까요?</h1>
              <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto">업로드한 이미지를 편집 가능한 레이어로 분해하거나, 자유롭게 빈 캔버스에서 시작해보세요.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Start from Photo */}
              <button 
                onClick={() => handleImageUpload('object-extract')}
                disabled={isInitialLoading}
                className="group relative overflow-hidden bg-white p-8 rounded-[32px] border border-slate-200/60 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-2 text-left flex flex-col h-full disabled:opacity-50"
              >
                {isInitialLoading && (
                  <div className="absolute inset-0 z-10 bg-white/80 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                    <p className="text-sm font-bold text-slate-600">레이어 분석 준비 중...</p>
                  </div>
                )}
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-rose-500 flex items-center justify-center text-white mb-6 shadow-lg shadow-primary/20 group-hover:rotate-6 transition-transform">
                  <FileImage size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-3">AI 레이어 분해로 시작</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">어떤 이미지든 업로드하면 텍스트, 도형, 사물/사진 요소를 편집 가능한 캔버스 레이어로 재구성합니다.</p>
                
                <div className="mt-auto flex items-center gap-2 text-primary font-bold text-sm">
                  이미지 선택하여 분해하기 <Maximize size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Start from Blank */}
              <div className="bg-white p-8 rounded-[32px] border border-slate-200/60 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] flex flex-col h-full">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 mb-6">
                  <LayoutTemplate size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-3">빈 캔버스에서 시작</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">원하는 크기를 선택하거나 직접 입력하여 디자인을 시작하세요.</p>
                
                <div className="grid grid-cols-2 gap-3 mt-auto">
                  {PRESETS.map((preset, i) => (
                    <button 
                      key={i}
                      onClick={() => {
                        applyPresetSize(preset.width, preset.height);
                        setIsInitialized(true);
                      }}
                      className="p-3 text-left bg-slate-50 hover:bg-primary/5 hover:border-primary/20 border border-transparent rounded-xl transition-all group"
                    >
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-0.5 group-hover:text-primary/60">{preset.label.split(' ')[0]}</p>
                      <p className="text-xs font-bold text-slate-700">{preset.width}x{preset.height}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toolbar
        onAddHeading={addHeading}
        onAddSubheading={addSubheading}
        onAddBodyText={addBodyText}
        onAddRect={() => addRect()}
        onAddCircle={addCircle}
        onAddTriangle={addTriangle}
        onAddLine={addLine}
        onAddImage={handleImageUpload}
        onAddImageUrl={addImage}
        onBgColor={handleBgColor}
        onBgImage={handleBgImage}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Action Bar */}
        <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-3 flex items-center justify-between flex-shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-1.5">
            <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 transition-all hover:scale-105 active:scale-95 text-slate-600" title="실행 취소 (Ctrl+Z)"><Undo2 size={18} /></button>
            <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 transition-all hover:scale-105 active:scale-95 text-slate-600" title="다시 실행 (Ctrl+Y)"><Redo2 size={18} /></button>
            <div className="w-px h-6 bg-slate-200 mx-2"></div>
            {selectedObject && (
              <>
                <button onClick={handleDuplicate} className="p-2 rounded-xl hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 text-slate-600" title="복제 (Ctrl+D)"><Copy size={18} /></button>
                <button onClick={handleDelete} className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-all hover:scale-105 active:scale-95" title="삭제 (Delete)"><Trash2 size={18} /></button>
                <div className="w-px h-6 bg-slate-200 mx-2"></div>
                {selectedObject.type?.toLowerCase() === 'activeselection' && (
                  <button onClick={handleGroup} className="p-2 px-3 rounded-xl hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 text-slate-600 text-sm font-bold flex items-center gap-1" title="그룹화 (Ctrl+G)">
                    그룹화
                  </button>
                )}
                {selectedObject.type?.toLowerCase() === 'group' && (
                  <button onClick={handleUngroup} className="p-2 px-3 rounded-xl hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 text-slate-600 text-sm font-bold flex items-center gap-1" title="그룹 해제 (Ctrl+Shift+G)">
                    그룹 해제
                  </button>
                )}
                <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200/60 ml-1">
                  <span className="text-xs font-bold text-slate-400 px-2">레이어 순서:</span>
                  <button onClick={bringToFront} className="px-2 py-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600 text-xs font-bold flex items-center gap-1" title="제일 위에 덮기">
                    <ChevronUp size={14} className="text-primary" />맨 위로
                  </button>
                  <button onClick={bringForward} className="px-2 py-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600 text-xs font-bold flex items-center gap-1" title="한 칸 위로">
                    <ChevronUp size={14} />위로
                  </button>
                  <button onClick={sendBackward} className="px-2 py-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600 text-xs font-bold flex items-center gap-1" title="한 칸 밑으로">
                    <ChevronDown size={14} />아래로
                  </button>
                  <button onClick={sendToBack} className="px-2 py-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-600 text-xs font-bold flex items-center gap-1" title="제일 밑에 깔기">
                    <ChevronDown size={14} className="text-primary" />맨 아래로
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 relative">
            <button 
              onClick={() => setShowSizeSettings(!showSizeSettings)} 
              className="p-2 px-3 rounded-xl hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 text-slate-600 flex items-center gap-2 text-sm font-semibold"
            >
              <LayoutTemplate size={16} /> 크기 조정
            </button>
            
            {/* Canvas Size Settings Dropdown */}
            {showSizeSettings && (
              <div className="absolute top-12 left-1/2 -translate-x-1/2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/60 p-4 z-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800">캔버스 크기</h3>
                  <button onClick={() => setShowSizeSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>
                
                <div className="space-y-2 mb-4">
                  {PRESETS.map((preset, i) => (
                    <button 
                      key={i} 
                      onClick={() => applyPresetSize(preset.width, preset.height)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors hover:bg-primary/5 ${canvasWidth === preset.width && canvasHeight === preset.height ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600'}`}
                    >
                      {preset.label} <span className="text-xs opacity-60 ml-1">{preset.width}x{preset.height}</span>
                    </button>
                  ))}
                </div>
                
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-500 mb-2 block">직접 입력 (px)</span>
                  <div className="flex items-center gap-2">
                    <input type="number" value={customWidth} onChange={e => setCustomWidth(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    <span className="text-slate-400 text-sm">x</span>
                    <input type="number" value={customHeight} onChange={e => setCustomHeight(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    <button onClick={applyCustomSize} className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90"><Check size={16} /></button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="w-px h-6 bg-slate-200 mx-2"></div>
            <button onClick={handleZoomOut} className="p-2 rounded-xl hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 text-slate-600"><ZoomOut size={18} /></button>
            <span className="text-sm font-semibold text-slate-500 w-14 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} className="p-2 rounded-xl hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 text-slate-600"><ZoomIn size={18} /></button>
            <button onClick={handleFitToScreen} className="p-2 rounded-xl hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 text-slate-600" title="화면에 맞추기"><Maximize size={18} /></button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleLoadJSON} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100/50 hover:bg-slate-200/50 rounded-xl transition-all hover:scale-[1.02] active:scale-95">불러오기</button>
            <button onClick={handleSaveJSON} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100/50 hover:bg-slate-200/50 rounded-xl transition-all hover:scale-[1.02] active:scale-95">프로젝트 저장</button>
            <button onClick={handleExportPNG} className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-primary to-rose-500 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2">
              <Download size={16} /> {pages.length > 1 ? '전체 내보내기' : '내보내기'}
            </button>
          </div>
        </div>

        {/* Canvas Container */}
        <div ref={containerRef} className="flex-1 overflow-auto flex items-center justify-center p-8 relative pb-24">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-slate-50/50 to-purple-50/50 pointer-events-none"></div>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          
          <div className="shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] transition-shadow duration-500 rounded-xl overflow-hidden relative z-10 border border-slate-200/50 bg-white" style={{ width: canvasWidth * zoom, height: canvasHeight * zoom }}>
            <canvas ref={canvasRef} />
            {isProcessingAI && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-fade-in">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="text-primary animate-pulse" size={24} />
                  </div>
                </div>
                <p className="mt-4 text-sm font-bold text-slate-700">{aiStatus || 'AI가 이미지를 분석 중입니다...'}</p>
                <p className="text-[10px] text-slate-400 mt-1">OCR, 도형 감지, 요소 마스크 생성 중입니다. 큰 이미지는 몇 분 걸릴 수 있습니다.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Pages Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-md border-t border-slate-200/60 z-20 flex items-center px-6 overflow-x-auto gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] scrollbar-hide">
          {pages.map((_, idx) => (
            <div 
              key={idx} 
              className={`relative flex-shrink-0 w-24 h-14 rounded-lg border-2 cursor-pointer transition-all group overflow-hidden bg-slate-100 flex items-center justify-center ${idx === currentPageIndex ? 'border-primary shadow-md scale-105' : 'border-transparent hover:border-slate-300'}`}
              onClick={() => switchPage(idx)}
            >
              {/* Very simple placeholder thumbnail. Real thumbnails would need generating dataURL for each page */}
              <div className="text-xs font-bold text-slate-400">Page {idx + 1}</div>
              
              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 backdrop-blur-[2px]">
                <button onClick={(e) => { e.stopPropagation(); duplicatePage(idx); }} className="p-1 bg-white/20 hover:bg-white/40 rounded text-white" title="페이지 복제"><Copy size={14} /></button>
                {pages.length > 1 && (
                  <button onClick={(e) => { e.stopPropagation(); deletePage(idx); }} className="p-1 bg-white/20 hover:bg-red-500/80 rounded text-white" title="페이지 삭제"><Trash size={14} /></button>
                )}
              </div>
            </div>
          ))}
          
          <button 
            onClick={addPage} 
            className="flex-shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all"
            title="새 페이지 추가"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Right Property Panel */}
      {isPanelOpen && selectedObject && fabricRef.current?.getActiveObject() && (
        <PropertyPanel
          selectedObject={fabricRef.current.getActiveObject()!}
          onUpdate={updateObjectProp}
          onCommit={commitObjectChange}
          onAIExtract={handleAIExtract}
          onClose={() => setIsPanelOpen(false)}
        />
      )}

      {(!isPanelOpen || !selectedObject) && selectedObject && (
        <button 
          onClick={() => setIsPanelOpen(true)}
          className="absolute right-6 top-24 bg-white/90 backdrop-blur p-3 rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 z-20 transition-all hover:scale-110 active:scale-95 text-slate-700"
          title="속성 패널 열기"
        >
          <Layers size={20} />
        </button>
      )}
    </div>
  );
};
