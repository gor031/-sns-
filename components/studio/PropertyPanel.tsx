import React, { useState, useEffect } from 'react';
import { FabricObject, Textbox, Rect, Circle, Triangle, Line, FabricImage, Group, ActiveSelection } from 'fabric';
import {
  X, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  Minus, Plus, RotateCw, Lock, Unlock, Palette, Type, Move,
  ArrowUpRight, CornerUpRight, Sparkles, Wand2, Scissors, Image as ImageIcon
} from 'lucide-react';

interface PropertyPanelProps {
  selectedObject: FabricObject;
  onUpdate: (prop: string, value: any) => void;
  onCommit: () => void;
  onAIExtract?: (mode: 'bg-remove' | 'object-extract') => void;
  onClose: () => void;
}

const FONT_FAMILIES = [
  'Noto Sans KR',
  'Pretendard',
  'Inter',
  'Arial',
  'Roboto',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Impact',
];

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedObject, onUpdate, onCommit, onAIExtract, onClose
}) => {
  const obj = selectedObject as any;
  const isText = obj instanceof Textbox || obj.type === 'Textbox' || obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'IText';
  const isShape = obj instanceof Rect || obj instanceof Circle || obj instanceof Triangle || obj instanceof Line;
  const isImage = obj instanceof FabricImage;
  const isGroup = obj instanceof Group;

  const getTypeLabel = () => {
    if (obj instanceof Textbox || obj.type === 'Textbox' || obj.type === 'textbox') return '텍스트';
    if (obj instanceof Rect || obj.type === 'Rect') return '사각형';
    if (obj instanceof Circle || obj.type === 'Circle') return '원';
    if (obj instanceof Triangle || obj.type === 'Triangle') return '삼각형';
    if (obj instanceof Line || obj.type === 'Line') return '선';
    if (obj instanceof FabricImage || obj.type === 'Image') return '이미지';
    if (obj instanceof Group || obj.type === 'Group') return '그룹';
    if (obj instanceof ActiveSelection || obj.type === 'ActiveSelection') return '다중 선택';
    return '요소';
  };

  return (
    <div className="w-full sm:w-80 max-h-[72dvh] sm:max-h-none bg-white/80 backdrop-blur-2xl border-l border-white/50 shadow-[-10px_0_30px_-10px_rgba(0,0,0,0.05)] overflow-y-auto flex-shrink-0 animate-fade-in-left z-20">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-200/60 bg-white/50 sticky top-0 z-10 backdrop-blur-md">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
          {getTypeLabel()} 속성
        </h3>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-all hover:scale-110 active:scale-95"><X size={16} /></button>
      </div>

      <div className="p-5 space-y-6">
        {/* Position & Size */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Move size={12} /> 위치 & 크기</p>
            <button 
              onClick={() => {
                const newValue = !obj.lockUniScaling;
                onUpdate('lockUniScaling', newValue);
                onCommit();
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${obj.lockUniScaling ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-50 text-slate-400 border-slate-100 hover:text-slate-600'}`}
              title="비율 고정 유지"
            >
              {obj.lockUniScaling ? <Lock size={10} /> : <Unlock size={10} />}
              비율 고정
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
              <label htmlFor="prop-x" className="text-[10px] font-bold text-slate-400 mb-1.5 block">X 위치</label>
              <div className="relative">
                <input 
                  id="prop-x"
                  name="left"
                  type="number" 
                  value={Math.round(obj.left || 0)}
                  onChange={(e) => onUpdate('left', Number(e.target.value))}
                  onBlur={onCommit}
                  className="w-full pl-2 pr-6 py-1.5 text-sm bg-white border border-slate-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 tabular-nums transition-all" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">px</span>
              </div>
            </div>
            <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
              <label htmlFor="prop-y" className="text-[10px] font-bold text-slate-400 mb-1.5 block">Y 위치</label>
              <div className="relative">
                <input 
                  id="prop-y"
                  name="top"
                  type="number" 
                  value={Math.round(obj.top || 0)}
                  onChange={(e) => onUpdate('top', Number(e.target.value))}
                  onBlur={onCommit}
                  className="w-full pl-2 pr-6 py-1.5 text-sm bg-white border border-slate-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 tabular-nums transition-all" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">px</span>
              </div>
            </div>
            <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
              <label htmlFor="prop-width" className="text-[10px] font-bold text-slate-400 mb-1.5 block">너비</label>
              <div className="relative">
                <input 
                  id="prop-width"
                  name="width"
                  type="number" 
                  value={Math.round((obj.width || 0) * (obj.scaleX || 1))}
                  onChange={(e) => { 
                    const newWidth = Number(e.target.value);
                    const newScaleX = newWidth / (obj.width || 1);
                    onUpdate('scaleX', newScaleX);
                    if (obj.lockUniScaling) onUpdate('scaleY', newScaleX); 
                  }}
                  onBlur={onCommit}
                  className="w-full pl-2 pr-6 py-1.5 text-sm bg-white border border-slate-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 tabular-nums transition-all" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">px</span>
              </div>
            </div>
            <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
              <label htmlFor="prop-height" className="text-[10px] font-bold text-slate-400 mb-1.5 block">높이</label>
              <div className="relative">
                <input 
                  id="prop-height"
                  name="height"
                  type="number" 
                  value={Math.round((obj.height || 0) * (obj.scaleY || 1))}
                  onChange={(e) => { 
                    const newHeight = Number(e.target.value);
                    const newScaleY = newHeight / (obj.height || 1);
                    onUpdate('scaleY', newScaleY);
                    if (obj.lockUniScaling) onUpdate('scaleX', newScaleY);
                  }}
                  onBlur={onCommit}
                  className="w-full pl-2 pr-6 py-1.5 text-sm bg-white border border-slate-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 tabular-nums transition-all" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">px</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            <label htmlFor="prop-angle" className="text-[10px] font-bold text-slate-400 mb-2 flex items-center gap-1.5"><RotateCw size={10} /> 회전</label>
            <div className="flex items-center gap-3">
              <input 
                id="prop-angle"
                name="angle"
                type="range" min="0" max="360" value={Math.round(obj.angle || 0)}
                onChange={(e) => onUpdate('angle', Number(e.target.value))}
                onMouseUp={onCommit}
                className="flex-1 accent-primary h-1.5 bg-slate-200 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full" />
              <span className="text-xs font-bold text-slate-600 w-10 text-right tabular-nums bg-white px-2 py-1 rounded-lg border border-slate-200">{Math.round(obj.angle || 0)}°</span>
            </div>
          </div>
        </div>

        {/* Opacity */}
        <div className="space-y-3 pt-5 border-t border-slate-200/60">
          <label htmlFor="prop-opacity" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">투명도</label>
          <div className="flex items-center gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            <input 
              id="prop-opacity"
              name="opacity"
              type="range" min="0" max="100" value={Math.round((obj.opacity || 1) * 100)}
              onChange={(e) => onUpdate('opacity', Number(e.target.value) / 100)}
              onMouseUp={onCommit}
              className="flex-1 accent-primary h-1.5 bg-slate-200 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full" />
            <span className="text-xs font-bold text-slate-600 w-12 text-right tabular-nums bg-white px-2 py-1 rounded-lg border border-slate-200">{Math.round((obj.opacity || 1) * 100)}%</span>
          </div>
        </div>

        {/* Fill Color for shapes */}
        {(isShape || isText) && (
          <div className="space-y-3 pt-5 border-t border-slate-200/60">
            <label htmlFor="prop-fill" className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Palette size={12} /> {isText ? '글자 색상' : '채우기 색상'}
            </label>
            <div className="p-1.5 bg-slate-50/50 border border-slate-200 rounded-xl shadow-sm hover:border-primary/40 transition-colors">
              <input 
                id="prop-fill"
                name="fill"
                type="color" value={obj.fill || '#000000'}
                onChange={(e) => onUpdate('fill', e.target.value)}
                onBlur={onCommit}
                className="w-full h-12 rounded-lg cursor-pointer bg-transparent border-0" />
            </div>
          </div>
        )}

        {/* Stroke */}
        {(isShape || isText) && (
          <div className="space-y-3 pt-5 border-t border-slate-200/60">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">테두리</p>
            <div className="flex gap-3 items-end bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <div className="flex-1">
                <label htmlFor="prop-stroke" className="text-[10px] font-bold text-slate-400 mb-1.5 block">색상</label>
                <div className="p-1 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-primary/40 transition-colors">
                  <input 
                    id="prop-stroke"
                    name="stroke"
                    type="color" value={obj.stroke || '#000000'}
                    onChange={(e) => onUpdate('stroke', e.target.value)}
                    onBlur={onCommit}
                    className="w-full h-8 rounded-md cursor-pointer bg-transparent border-0" />
                </div>
              </div>
              <div className="w-24">
                <label htmlFor="prop-stroke-width" className="text-[10px] font-bold text-slate-400 mb-1.5 block">두께 (px)</label>
                <input 
                  id="prop-stroke-width"
                  name="strokeWidth"
                  type="number" min="0" max="20" value={obj.strokeWidth || 0}
                  onChange={(e) => onUpdate('strokeWidth', Number(e.target.value))}
                  onBlur={onCommit}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 tabular-nums transition-all shadow-sm" />
              </div>
            </div>
          </div>
        )}

        {/* Corner Radius for Rect */}
        {obj.type === 'rect' && (
          <div className="space-y-3 pt-5 border-t border-slate-200/60">
            <label htmlFor="prop-rx" className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <CornerUpRight size={12} /> 모서리 둥글기
            </label>
            <div className="flex items-center gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <input 
                id="prop-rx"
                name="rx"
                type="range" min="0" max="100" value={obj.rx || 0}
                onChange={(e) => { onUpdate('rx', Number(e.target.value)); onUpdate('ry', Number(e.target.value)); }}
                onMouseUp={onCommit}
                className="flex-1 accent-primary h-1.5 bg-slate-200 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full" />
              <span className="text-xs font-bold text-slate-600 w-12 text-right tabular-nums bg-white px-2 py-1 rounded-lg border border-slate-200">{obj.rx || 0}px</span>
            </div>
          </div>
        )}
        
        {/* IMAGE AI MAGIC */}
        {isImage && onAIExtract && (
          <div className="space-y-4 pt-5 border-t border-slate-200/60">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Sparkles size={12} className="text-primary" /> AI 매직 툴</p>
            
            <div className="grid grid-cols-1 gap-2">

              <button 
                onClick={() => onAIExtract('bg-remove')}
                className="group relative overflow-hidden flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 border border-primary/20 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
              >
                <div className="p-2 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                  <Scissors size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">피사체만 남기기 (누끼)</p>
                  <p className="text-[10px] text-slate-500">사진 속 주인공만 남기고 투명하게 만들기</p>
                </div>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles size={14} className="text-primary/60" />
                </div>
              </button>

              <button 
                onClick={() => onAIExtract('object-extract')}
                className="group relative overflow-hidden flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-500/5 to-indigo-500/10 hover:from-indigo-500/10 hover:to-indigo-500/20 border border-indigo-500/20 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
              >
                <div className="p-2 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                  <Wand2 size={18} className="text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">이미지 레이어 분해</p>
                  <p className="text-[10px] text-slate-500">텍스트, 도형, 사물/사진 요소를 편집 레이어로 재구성</p>
                </div>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles size={14} className="text-indigo-400/60" />
                </div>
              </button>
            </div>
            
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
              <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                💡 이미지를 선택한 상태에서 버튼을 클릭하면 AI가 작업을 시작합니다. 
                작업 중에는 캔버스가 잠시 비활성화됩니다.
              </p>
            </div>
          </div>
        )}

        {/* TEXT Properties */}
        {isText && (
          <div className="space-y-4 pt-5 border-t border-slate-200/60">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Type size={12} /> 텍스트 스타일</p>
            
            <div className="bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100 space-y-4">
              {/* Font Family */}
              <div>
                <label htmlFor="prop-font-family" className="text-[10px] font-bold text-slate-400 mb-1.5 block">서체</label>
                <select
                  id="prop-font-family"
                  name="fontFamily"
                  value={obj.fontFamily || 'Noto Sans KR'}
                  onChange={(e) => { onUpdate('fontFamily', e.target.value); onCommit(); }}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all shadow-sm"
                >
                  {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* Font Size */}
              <div>
                <label htmlFor="prop-font-size" className="text-[10px] font-bold text-slate-400 mb-1.5 block">크기 (px)</label>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { onUpdate('fontSize', Math.max(8, (obj.fontSize || 48) - 2)); onCommit(); }} className="p-2.5 bg-white border border-slate-200 shadow-sm rounded-xl hover:bg-slate-50 hover:border-primary/40 transition-all active:scale-95"><Minus size={16} className="text-slate-600" /></button>
                  <input 
                    id="prop-font-size"
                    name="fontSize"
                    type="number" min="8" max="200" value={obj.fontSize || 48}
                    onChange={(e) => onUpdate('fontSize', Number(e.target.value))}
                    onBlur={onCommit}
                    className="flex-1 px-3 py-2 text-base text-center bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 tabular-nums transition-all shadow-sm font-semibold" />
                  <button onClick={() => { onUpdate('fontSize', Math.min(200, (obj.fontSize || 48) + 2)); onCommit(); }} className="p-2.5 bg-white border border-slate-200 shadow-sm rounded-xl hover:bg-slate-50 hover:border-primary/40 transition-all active:scale-95"><Plus size={16} className="text-slate-600" /></button>
                </div>
              </div>

              {/* Bold / Italic / Underline */}
              <div className="flex gap-1.5">
                <button onClick={() => { onUpdate('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold'); onCommit(); }}
                  className={`flex-1 p-2.5 rounded-xl border transition-all active:scale-95 shadow-sm ${obj.fontWeight === 'bold' ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-800 shadow-slate-900/20' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-primary/40'}`}>
                  <Bold size={18} className="mx-auto" />
                </button>
                <button onClick={() => { onUpdate('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic'); onCommit(); }}
                  className={`flex-1 p-2.5 rounded-xl border transition-all active:scale-95 shadow-sm ${obj.fontStyle === 'italic' ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-800 shadow-slate-900/20' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-primary/40'}`}>
                  <Italic size={18} className="mx-auto" />
                </button>
                <button onClick={() => { onUpdate('underline', !obj.underline); onCommit(); }}
                  className={`flex-1 p-2.5 rounded-xl border transition-all active:scale-95 shadow-sm ${obj.underline ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-800 shadow-slate-900/20' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-primary/40'}`}>
                  <Underline size={18} className="mx-auto" />
                </button>
              </div>

              {/* Text Align */}
              <div className="flex gap-1.5">
                {['left', 'center', 'right'].map(align => (
                  <button key={align}
                    onClick={() => { onUpdate('textAlign', align); onCommit(); }}
                    className={`flex-1 p-2.5 rounded-xl border transition-all active:scale-95 shadow-sm ${obj.textAlign === align ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-800 shadow-slate-900/20' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-primary/40'}`}>
                    {align === 'left' && <AlignLeft size={18} className="mx-auto" />}
                    {align === 'center' && <AlignCenter size={18} className="mx-auto" />}
                    {align === 'right' && <AlignRight size={18} className="mx-auto" />}
                  </button>
                ))}
              </div>

              {/* Line Height */}
              <div>
                <label htmlFor="prop-line-height" className="text-[10px] font-bold text-slate-400 mb-1.5 block">줄 간격</label>
                <div className="flex items-center gap-3">
                  <input 
                    id="prop-line-height"
                    name="lineHeight"
                    type="range" min="0.8" max="3" step="0.1" value={obj.lineHeight || 1.4}
                    onChange={(e) => onUpdate('lineHeight', Number(e.target.value))}
                    onMouseUp={onCommit}
                    className="flex-1 accent-primary h-1.5 bg-slate-200 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full" />
                  <span className="text-xs font-bold text-slate-600 w-10 text-right tabular-nums bg-white px-2 py-1 rounded-lg border border-slate-200">{(obj.lineHeight || 1.4).toFixed(1)}</span>
                </div>
              </div>

              {/* Letter Spacing */}
              <div>
                <label htmlFor="prop-char-spacing" className="text-[10px] font-bold text-slate-400 mb-1.5 block">자간</label>
                <div className="flex items-center gap-3">
                  <input 
                    id="prop-char-spacing"
                    name="charSpacing"
                    type="range" min="-200" max="800" step="10" value={obj.charSpacing || 0}
                    onChange={(e) => onUpdate('charSpacing', Number(e.target.value))}
                    onMouseUp={onCommit}
                    className="flex-1 accent-primary h-1.5 bg-slate-200 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full" />
                  <span className="text-xs font-bold text-slate-600 w-12 text-right tabular-nums bg-white px-2 py-1 rounded-lg border border-slate-200">{obj.charSpacing || 0}</span>
                </div>
              </div>

              {/* Text Shadow */}
              <div className="pt-2 border-t border-slate-200/60 mt-2">
                <label className="text-[10px] font-bold text-slate-400 mb-2 block">텍스트 그림자</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if (obj.shadow) {
                        onUpdate('shadow', null);
                      } else {
                        onUpdate('shadow', { color: 'rgba(0,0,0,0.3)', blur: 10, offsetX: 5, offsetY: 5 });
                      }
                      onCommit();
                    }}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 shadow-sm ${obj.shadow ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white border-rose-600 shadow-rose-500/20' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-primary/40'}`}
                  >
                    {obj.shadow ? '그림자 효과 제거' : '그림자 효과 추가'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image specific */}
        {isImage && (
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">이미지 필터</p>
            <p className="text-xs text-gray-400">크기 조절, 회전 등을 위의 컨트롤로 사용하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
};
