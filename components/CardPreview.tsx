import React, { useState, useEffect, useRef } from 'react';
import { Slide, TextStyle } from '../types';
import { 
  Check, Edit2, X, RefreshCw, 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  Type, Palette, Minus, Plus, Wand2, Eraser, Undo, HelpCircle, MousePointerClick, Hand
} from 'lucide-react';

interface CardPreviewProps {
  slide: Slide;
  totalSlides: number;
  themeIndex?: number;
  onUpdate: (header: string, body: string, headerStyle?: TextStyle, bodyStyle?: TextStyle) => void;
  onRegenerate?: (header: string, body: string) => Promise<{ header: string; body: string }>;
  captureId: string;
  hideControls?: boolean;
  forExport?: boolean;
}

// --- Theme Definitions (Total 50) ---
export const THEMES = [
  // --- 1. Signature Series (1-5) ---
  { id: 'neon-dark', bg: "bg-gray-900", text: "text-white", accent: "text-[#FF0055]", highlightBg: "bg-[#FF0055]", highlightText: "text-white", decoration: "bg-gradient-to-tr from-[#FF0055] to-[#FF5588]", blob1: "rgba(255, 0, 85, 0.4)", blob2: "rgba(255, 85, 136, 0.3)" },
  { id: 'clean-blue', bg: "bg-white", text: "text-gray-900", accent: "text-[#2962FF]", highlightBg: "bg-[#2962FF]", highlightText: "text-white", decoration: "bg-gradient-to-tr from-[#2962FF] to-[#00B0FF]", blob1: "rgba(41, 98, 255, 0.15)", blob2: "rgba(0, 176, 255, 0.15)" },
  { id: 'warm-emotional', bg: "bg-[#FDFBF7]", text: "text-[#4A403A]", accent: "text-[#D84315]", highlightBg: "bg-[#FFCCBC]", highlightText: "text-[#BF360C]", decoration: "bg-gradient-to-br from-[#FFAB91] to-[#FF7043]", blob1: "rgba(255, 171, 145, 0.4)", blob2: "rgba(255, 112, 67, 0.3)" },
  { id: 'vibrant-purple', bg: "bg-[#7000FF]", text: "text-white", accent: "text-[#00E5FF]", highlightBg: "bg-[#00E5FF]", highlightText: "text-black", decoration: "bg-gradient-to-bl from-[#D500F9] to-[#651FFF]", blob1: "rgba(213, 0, 249, 0.4)", blob2: "rgba(101, 31, 255, 0.4)" },
  { id: 'trust-green', bg: "bg-[#004D40]", text: "text-[#E0F2F1]", accent: "text-[#FFD740]", highlightBg: "bg-[#FFD740]", highlightText: "text-[#004D40]", decoration: "bg-gradient-to-t from-[#00695C] to-[#4DB6AC]", blob1: "rgba(0, 105, 92, 0.5)", blob2: "rgba(77, 182, 172, 0.4)" },

  // --- 2. Gradient Series (6-10) ---
  { id: 'midnight-gold', bg: "bg-slate-900", text: "text-amber-50", accent: "text-amber-400", highlightBg: "bg-amber-400", highlightText: "text-slate-900", decoration: "bg-gradient-to-r from-amber-300 to-yellow-500", blob1: "rgba(251, 191, 36, 0.15)", blob2: "rgba(180, 83, 9, 0.15)" },
  { id: 'sunset-gradient', bg: "bg-gradient-to-br from-indigo-900 to-purple-800", text: "text-white", accent: "text-orange-300", highlightBg: "bg-orange-400", highlightText: "text-white", decoration: "bg-gradient-to-r from-orange-400 to-pink-500", blob1: "rgba(251, 146, 60, 0.3)", blob2: "rgba(236, 72, 153, 0.3)" },
  { id: 'ocean-depths', bg: "bg-gradient-to-b from-blue-900 to-slate-900", text: "text-cyan-100", accent: "text-cyan-400", highlightBg: "bg-cyan-500", highlightText: "text-blue-900", decoration: "bg-gradient-to-t from-cyan-400 to-blue-500", blob1: "rgba(34, 211, 238, 0.2)", blob2: "rgba(59, 130, 246, 0.2)" },
  { id: 'forest-mist', bg: "bg-gradient-to-br from-emerald-900 to-green-800", text: "text-emerald-50", accent: "text-emerald-300", highlightBg: "bg-emerald-400", highlightText: "text-emerald-900", decoration: "bg-emerald-500", blob1: "rgba(52, 211, 153, 0.2)", blob2: "rgba(16, 185, 129, 0.2)" },
  { id: 'berry-smoothie', bg: "bg-gradient-to-tr from-pink-500 to-rose-500", text: "text-white", accent: "text-yellow-200", highlightBg: "bg-white", highlightText: "text-rose-600", decoration: "bg-yellow-300", blob1: "rgba(255, 255, 255, 0.2)", blob2: "rgba(253, 224, 71, 0.3)" },

  // --- 3. Minimal Series (11-15) ---
  { id: 'minimal-mono', bg: "bg-gray-100", text: "text-gray-900", accent: "text-black", highlightBg: "bg-black", highlightText: "text-white", decoration: "bg-gray-800", blob1: "rgba(0, 0, 0, 0.05)", blob2: "rgba(0, 0, 0, 0.08)" },
  { id: 'minimal-dark', bg: "bg-neutral-900", text: "text-neutral-200", accent: "text-white", highlightBg: "bg-white", highlightText: "text-black", decoration: "bg-neutral-700", blob1: "rgba(255, 255, 255, 0.05)", blob2: "rgba(255, 255, 255, 0.03)" },
  { id: 'paper-white', bg: "bg-[#F5F5F5]", text: "text-[#333333]", accent: "text-[#000000]", highlightBg: "bg-[#333333]", highlightText: "text-white", decoration: "bg-[#999999]", blob1: "rgba(0,0,0,0.03)", blob2: "rgba(0,0,0,0.03)" },
  { id: 'soft-gray', bg: "bg-slate-200", text: "text-slate-800", accent: "text-slate-600", highlightBg: "bg-slate-600", highlightText: "text-white", decoration: "bg-slate-400", blob1: "rgba(71, 85, 105, 0.1)", blob2: "rgba(51, 65, 85, 0.1)" },
  { id: 'high-contrast', bg: "bg-black", text: "text-yellow-400", accent: "text-white", highlightBg: "bg-yellow-400", highlightText: "text-black", decoration: "bg-white", blob1: "rgba(250, 204, 21, 0.1)", blob2: "rgba(255, 255, 255, 0.1)" },

  // --- 4. Pastel Series (16-20) ---
  { id: 'minty-fresh', bg: "bg-emerald-50", text: "text-emerald-900", accent: "text-emerald-600", highlightBg: "bg-emerald-200", highlightText: "text-emerald-800", decoration: "bg-gradient-to-tr from-emerald-400 to-teal-400", blob1: "rgba(52, 211, 153, 0.2)", blob2: "rgba(16, 185, 129, 0.2)" },
  { id: 'soft-lavender', bg: "bg-purple-50", text: "text-slate-700", accent: "text-purple-600", highlightBg: "bg-purple-200", highlightText: "text-purple-800", decoration: "bg-purple-400", blob1: "rgba(192, 132, 252, 0.2)", blob2: "rgba(168, 85, 247, 0.15)" },
  { id: 'peach-fuzz', bg: "bg-orange-50", text: "text-stone-800", accent: "text-orange-500", highlightBg: "bg-orange-200", highlightText: "text-orange-900", decoration: "bg-orange-400", blob1: "rgba(251, 146, 60, 0.2)", blob2: "rgba(253, 186, 116, 0.2)" },
  { id: 'sky-blue', bg: "bg-sky-50", text: "text-sky-900", accent: "text-sky-500", highlightBg: "bg-sky-200", highlightText: "text-sky-800", decoration: "bg-sky-400", blob1: "rgba(14, 165, 233, 0.1)", blob2: "rgba(56, 189, 248, 0.15)" },
  { id: 'lemon-chiffon', bg: "bg-yellow-50", text: "text-yellow-900", accent: "text-yellow-600", highlightBg: "bg-yellow-200", highlightText: "text-yellow-800", decoration: "bg-yellow-400", blob1: "rgba(250, 204, 21, 0.1)", blob2: "rgba(253, 224, 71, 0.15)" },

  // --- 5. Vivid & Pop (21-25) ---
  { id: 'retro-yellow', bg: "bg-yellow-400", text: "text-black", accent: "text-red-600", highlightBg: "bg-black", highlightText: "text-yellow-400", decoration: "bg-red-500", blob1: "rgba(0,0,0,0.1)", blob2: "rgba(239, 68, 68, 0.2)" },
  { id: 'red-power', bg: "bg-red-600", text: "text-white", accent: "text-yellow-300", highlightBg: "bg-white", highlightText: "text-red-600", decoration: "bg-yellow-400", blob1: "rgba(255, 255, 255, 0.2)", blob2: "rgba(0, 0, 0, 0.2)" },
  { id: 'orange-soda', bg: "bg-orange-500", text: "text-white", accent: "text-yellow-300", highlightBg: "bg-white", highlightText: "text-orange-500", decoration: "bg-yellow-400", blob1: "rgba(255, 255, 255, 0.3)", blob2: "rgba(252, 211, 77, 0.3)" },
  { id: 'lime-punch', bg: "bg-lime-400", text: "text-black", accent: "text-blue-700", highlightBg: "bg-blue-600", highlightText: "text-white", decoration: "bg-blue-500", blob1: "rgba(37, 99, 235, 0.2)", blob2: "rgba(29, 78, 216, 0.2)" },
  { id: 'hot-pink', bg: "bg-pink-500", text: "text-white", accent: "text-lime-300", highlightBg: "bg-lime-300", highlightText: "text-pink-600", decoration: "bg-lime-400", blob1: "rgba(190, 242, 100, 0.3)", blob2: "rgba(255, 255, 255, 0.2)" },

  // --- 6. Dark & Moody (26-30) ---
  { id: 'deep-space', bg: "bg-slate-950", text: "text-cyan-50", accent: "text-cyan-400", highlightBg: "bg-cyan-500", highlightText: "text-slate-900", decoration: "bg-gradient-to-r from-cyan-500 to-blue-500", blob1: "rgba(6, 182, 212, 0.15)", blob2: "rgba(59, 130, 246, 0.15)" },
  { id: 'cyberpunk', bg: "bg-black", text: "text-green-50", accent: "text-green-400", highlightBg: "bg-green-500", highlightText: "text-black", decoration: "bg-gradient-to-r from-green-400 to-lime-400", blob1: "rgba(74, 222, 128, 0.3)", blob2: "rgba(132, 204, 22, 0.2)" },
  { id: 'vampire-red', bg: "bg-[#2A0A0A]", text: "text-red-100", accent: "text-red-500", highlightBg: "bg-red-600", highlightText: "text-black", decoration: "bg-red-700", blob1: "rgba(220, 38, 38, 0.2)", blob2: "rgba(153, 27, 27, 0.3)" },
  { id: 'indigo-night', bg: "bg-indigo-950", text: "text-indigo-100", accent: "text-pink-400", highlightBg: "bg-pink-500", highlightText: "text-white", decoration: "bg-gradient-to-r from-pink-500 to-purple-500", blob1: "rgba(236, 72, 153, 0.2)", blob2: "rgba(99, 102, 241, 0.2)" },
  { id: 'galaxy-void', bg: "bg-[#0F172A]", text: "text-purple-100", accent: "text-purple-400", highlightBg: "bg-purple-600", highlightText: "text-white", decoration: "bg-purple-500", blob1: "rgba(168, 85, 247, 0.2)", blob2: "rgba(192, 132, 252, 0.1)" },

  // --- 7. Corporate & Professional (31-35) ---
  { id: 'corporate-blue', bg: "bg-blue-900", text: "text-white", accent: "text-blue-200", highlightBg: "bg-white", highlightText: "text-blue-900", decoration: "bg-blue-400", blob1: "rgba(96, 165, 250, 0.2)", blob2: "rgba(37, 99, 235, 0.2)" },
  { id: 'slate-teal', bg: "bg-slate-800", text: "text-slate-100", accent: "text-teal-400", highlightBg: "bg-teal-500", highlightText: "text-slate-900", decoration: "bg-gradient-to-tr from-teal-400 to-emerald-400", blob1: "rgba(45, 212, 191, 0.2)", blob2: "rgba(52, 211, 153, 0.2)" },
  { id: 'navy-gold', bg: "bg-blue-950", text: "text-slate-200", accent: "text-yellow-500", highlightBg: "bg-yellow-600", highlightText: "text-white", decoration: "bg-yellow-700", blob1: "rgba(234, 179, 8, 0.2)", blob2: "rgba(30, 58, 138, 0.5)" },
  { id: 'steel-gray', bg: "bg-gray-600", text: "text-white", accent: "text-gray-300", highlightBg: "bg-gray-300", highlightText: "text-gray-800", decoration: "bg-gray-400", blob1: "rgba(255, 255, 255, 0.1)", blob2: "rgba(0, 0, 0, 0.2)" },
  { id: 'executive', bg: "bg-[#1C1C1C]", text: "text-gray-200", accent: "text-white", highlightBg: "bg-white", highlightText: "text-black", decoration: "bg-gray-500", blob1: "rgba(255, 255, 255, 0.05)", blob2: "rgba(255, 255, 255, 0.05)" },

  // --- 8. Nature & Earth (36-40) ---
  { id: 'forest-calm', bg: "bg-[#2C3E2D]", text: "text-[#E8F5E9]", accent: "text-[#A5D6A7]", highlightBg: "bg-[#A5D6A7]", highlightText: "text-[#1B5E20]", decoration: "bg-[#81C784]", blob1: "rgba(165, 214, 167, 0.15)", blob2: "rgba(200, 230, 201, 0.1)" },
  { id: 'coffee-house', bg: "bg-[#3E2723]", text: "text-[#EFEBE9]", accent: "text-[#D7CCC8]", highlightBg: "bg-[#A1887F]", highlightText: "text-white", decoration: "bg-[#8D6E63]", blob1: "rgba(215, 204, 200, 0.1)", blob2: "rgba(161, 136, 127, 0.1)" },
  { id: 'sand-dune', bg: "bg-[#D7CCC8]", text: "text-[#3E2723]", accent: "text-[#5D4037]", highlightBg: "bg-[#5D4037]", highlightText: "text-[#D7CCC8]", decoration: "bg-[#795548]", blob1: "rgba(62, 39, 35, 0.1)", blob2: "rgba(93, 64, 55, 0.1)" },
  { id: 'olive-garden', bg: "bg-[#556B2F]", text: "text-[#FFFFF0]", accent: "text-[#808000]", highlightBg: "bg-[#6B8E23]", highlightText: "text-white", decoration: "bg-[#9ACD32]", blob1: "rgba(154, 205, 50, 0.2)", blob2: "rgba(107, 142, 35, 0.3)" },
  { id: 'ocean-breeze', bg: "bg-cyan-50", text: "text-cyan-900", accent: "text-cyan-600", highlightBg: "bg-cyan-200", highlightText: "text-cyan-800", decoration: "bg-gradient-to-r from-cyan-400 to-blue-400", blob1: "rgba(34, 211, 238, 0.2)", blob2: "rgba(6, 182, 212, 0.15)" },

  // --- 9. Luxury & Special (41-45) ---
  { id: 'royal-luxury', bg: "bg-zinc-900", text: "text-orange-50", accent: "text-yellow-500", highlightBg: "bg-gradient-to-r from-yellow-600 to-yellow-400", highlightText: "text-black", decoration: "bg-gradient-to-r from-yellow-500 to-yellow-200", blob1: "rgba(234, 179, 8, 0.15)", blob2: "rgba(250, 204, 21, 0.1)" },
  { id: 'rose-gold', bg: "bg-[#B76E79]", text: "text-white", accent: "text-[#FFD700]", highlightBg: "bg-white", highlightText: "text-[#B76E79]", decoration: "bg-[#E6C2C9]", blob1: "rgba(255, 215, 0, 0.2)", blob2: "rgba(255, 255, 255, 0.2)" },
  { id: 'platinum', bg: "bg-[#E5E4E2]", text: "text-slate-800", accent: "text-slate-500", highlightBg: "bg-slate-400", highlightText: "text-white", decoration: "bg-slate-300", blob1: "rgba(100, 116, 139, 0.1)", blob2: "rgba(148, 163, 184, 0.1)" },
  { id: 'champagne', bg: "bg-[#F7E7CE]", text: "text-[#5C4033]", accent: "text-[#C2B280]", highlightBg: "bg-[#C2B280]", highlightText: "text-white", decoration: "bg-[#D4C494]", blob1: "rgba(194, 178, 128, 0.2)", blob2: "rgba(92, 64, 51, 0.1)" },
  { id: 'ruby', bg: "bg-[#9B111E]", text: "text-white", accent: "text-[#FFD700]", highlightBg: "bg-[#FFD700]", highlightText: "text-[#9B111E]", decoration: "bg-[#E0115F]", blob1: "rgba(255, 215, 0, 0.2)", blob2: "rgba(255, 255, 255, 0.1)" },

  // --- 10. Fun & Quirky (46-50) ---
  { id: 'bubblegum', bg: "bg-gradient-to-b from-blue-300 to-pink-300", text: "text-white", accent: "text-purple-600", highlightBg: "bg-white", highlightText: "text-pink-500", decoration: "bg-purple-400", blob1: "rgba(255, 255, 255, 0.4)", blob2: "rgba(236, 72, 153, 0.3)" },
  { id: 'tropical-punch', bg: "bg-gradient-to-tr from-green-400 to-blue-500", text: "text-white", accent: "text-yellow-200", highlightBg: "bg-white", highlightText: "text-green-600", decoration: "bg-yellow-400", blob1: "rgba(253, 224, 71, 0.3)", blob2: "rgba(255, 255, 255, 0.2)" },
  { id: 'cherry-blossom', bg: "bg-pink-50", text: "text-pink-900", accent: "text-pink-500", highlightBg: "bg-pink-200", highlightText: "text-pink-700", decoration: "bg-pink-300", blob1: "rgba(244, 114, 182, 0.2)", blob2: "rgba(251, 207, 232, 0.4)" },
  { id: 'grape-soda', bg: "bg-purple-800", text: "text-purple-100", accent: "text-fuchsia-300", highlightBg: "bg-fuchsia-400", highlightText: "text-purple-900", decoration: "bg-purple-500", blob1: "rgba(232, 121, 249, 0.2)", blob2: "rgba(192, 132, 252, 0.2)" },
  { id: 'pastel-dream', bg: "bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100", text: "text-slate-700", accent: "text-pink-500", highlightBg: "bg-pink-200", highlightText: "text-pink-800", decoration: "bg-gradient-to-r from-pink-300 to-purple-300", blob1: "rgba(244, 114, 182, 0.2)", blob2: "rgba(192, 132, 252, 0.2)" }
];

// Colors with Hex for execCommand
const TEXT_COLORS = [
  { label: '기본', value: 'inherit', hex: null }, 
  { label: '흰색', value: 'text-white', hex: '#ffffff' },
  { label: '검정', value: 'text-black', hex: '#000000' },
  { label: '회색', value: 'text-gray-500', hex: '#6b7280' },
  { label: '빨강', value: 'text-red-500', hex: '#ef4444' },
  { label: '노랑', value: 'text-yellow-400', hex: '#facc15' },
  { label: '초록', value: 'text-green-500', hex: '#22c55e' },
  { label: '파랑', value: 'text-blue-500', hex: '#3b82f6' },
  { label: '보라', value: 'text-purple-500', hex: '#a855f7' },
];

const SIZES = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl'];

// --- Utility: Markdown to HTML Conversion ---
const markdownToHtml = (text: string): string => {
  if (!text) return '';
  let html = text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/__(.*?)__/g, '<u>$1</u>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>');
  return html;
};

// --- Utility: Inject Theme Classes into HTML for Preview ---
const processHtmlForPreview = (html: string, theme: any, isHeader: boolean, forExport: boolean = false) => {
  if (!html) return '';

  // Theme-specific highlighting class
  // FIX: html2canvas struggles with box-decoration-break: clone.
  // We remove 'box-decoration-clone' during export (forExport=true) to prevent rendering artifacts.
  const decorationClass = forExport ? '' : 'box-decoration-clone';
  
  const highlightClass = isHeader
       ? `${theme.accent} inline` // Header uses accent text color
       : `font-bold ${theme.highlightBg} ${theme.highlightText} px-1 rounded-sm ${decorationClass} leading-snug py-0.5`; // Body uses background highlight

  // Replace <b> and <strong> tags with styled spans to apply the "Highlight" effect
  // We use simple string replacement which is sufficient for the controlled content from ContentEditable
  let processed = html
      .replace(/<b>/g, `<span class="${highlightClass}">`)
      .replace(/<\/b>/g, '</span>')
      .replace(/<strong>/g, `<span class="${highlightClass}">`)
      .replace(/<\/strong>/g, '</span>');
  
  return processed;
};


// --- Component: WYSIWYG Editor Input ---
const ContentEditableInput = ({ 
  html, 
  setHtml, 
  styleState, 
  setStyleState,
  placeholder,
  className = ""
}: { 
  html: string, 
  setHtml: (val: string) => void,
  styleState: TextStyle,
  setStyleState: (val: TextStyle) => void,
  placeholder: string,
  className?: string
}) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Sync content from prop to DOM only when it differs (preserves selection/cursor)
  useEffect(() => {
    if (contentEditableRef.current && contentEditableRef.current.innerHTML !== html) {
      contentEditableRef.current.innerHTML = html;
    }
  }, [html]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setHtml(e.currentTarget.innerHTML);
  };

  const execCmd = (cmd: string, value?: string) => {
    // IMPORTANT: Toggle styleWithCSS to ensure 'bold' creates <b> tags (for regex matching) 
    // while colors/size create inline styles (for granularity).
    if (cmd === 'bold' || cmd === 'italic' || cmd === 'underline') {
      document.execCommand('styleWithCSS', false, 'false'); 
    } else {
      document.execCommand('styleWithCSS', false, 'true'); 
    }
    
    document.execCommand(cmd, false, value);
    if (contentEditableRef.current) {
        contentEditableRef.current.focus();
        setHtml(contentEditableRef.current.innerHTML);
    }
  };

  const changeSize = (delta: number) => {
    // 1. Check if there is a selection within this editor
    const selection = window.getSelection();
    const isSelectionInEditor = selection && selection.rangeCount > 0 && contentEditableRef.current && contentEditableRef.current.contains(selection.anchorNode);
    
    // Check if it is a range selection (not just a blinking cursor)
    const hasRangeSelection = isSelectionInEditor && !selection.isCollapsed;

    if (hasRangeSelection) {
      // Apply size to selection using execCommand 'fontSize' (1-7 scale)
      // Attempt to find current size of selection, default to 3 (normal)
      let currentVal = 3; 
      try {
        const queryVal = document.queryCommandValue('fontSize');
        if (queryVal) currentVal = parseInt(queryVal) || 3;
      } catch (e) {}

      let newVal = currentVal + delta;
      if (newVal < 1) newVal = 1;
      if (newVal > 7) newVal = 7;

      execCmd('fontSize', newVal.toString());
    } else {
      // Apply size to Block Level (Tailwind class on wrapper)
      const currentIndex = SIZES.indexOf(styleState.fontSize);
      if (currentIndex === -1) return; 
      const newIndex = Math.min(Math.max(currentIndex + delta, 0), SIZES.length - 1);
      setStyleState({ ...styleState, fontSize: SIZES[newIndex] });
    }
  };

  const applyColor = (hex: string | null) => {
      if (hex) {
        execCmd('foreColor', hex);
      } else {
        execCmd('removeFormat'); // Reset selection formatting
      }
      setShowColorPicker(false);
  };

  // Prevent focus loss when clicking toolbar buttons
  const preventFocusLoss = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col gap-2 bg-white rounded-xl border border-gray-200 overflow-visible shadow-sm z-10">
      
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-100 relative select-none">
         
         {/* Undo */}
         <button 
           onClick={() => execCmd('undo')} 
           onMouseDown={preventFocusLoss}
           className="p-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 shadow-sm mr-2"
           title="되돌리기"
         >
           <Undo size={16} />
         </button>

         {/* Alignment (Block Level) */}
         <div className="flex bg-white rounded-md border border-gray-200 mr-2 overflow-hidden shadow-sm">
            <button onMouseDown={preventFocusLoss} onClick={() => setStyleState({...styleState, align: 'left'})} className={`p-1.5 hover:bg-gray-50 ${styleState.align === 'left' ? 'bg-gray-100 text-black' : 'text-gray-500'}`}><AlignLeft size={16} /></button>
            <button onMouseDown={preventFocusLoss} onClick={() => setStyleState({...styleState, align: 'center'})} className={`p-1.5 hover:bg-gray-50 ${styleState.align === 'center' ? 'bg-gray-100 text-black' : 'text-gray-500'}`}><AlignCenter size={16} /></button>
            <button onMouseDown={preventFocusLoss} onClick={() => setStyleState({...styleState, align: 'right'})} className={`p-1.5 hover:bg-gray-50 ${styleState.align === 'right' ? 'bg-gray-100 text-black' : 'text-gray-500'}`}><AlignRight size={16} /></button>
         </div>

         {/* Font Size (Mixed Level) */}
         <div className="flex items-center bg-white rounded-md border border-gray-200 mr-2 overflow-hidden shadow-sm">
            <button onMouseDown={preventFocusLoss} onClick={() => changeSize(-1)} className="p-1.5 hover:bg-gray-50 text-gray-600"><Minus size={14} /></button>
            <div className="px-2 text-xs font-bold w-8 text-center text-gray-700"><Type size={14} className="inline"/></div>
            <button onMouseDown={preventFocusLoss} onClick={() => changeSize(1)} className="p-1.5 hover:bg-gray-50 text-gray-600"><Plus size={14} /></button>
         </div>

         {/* Text Color (Selection Level) */}
         <div className="relative">
            <button 
              onMouseDown={preventFocusLoss}
              onClick={() => setShowColorPicker(!showColorPicker)} 
              className="flex items-center gap-1 px-2 py-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 mr-2 shadow-sm"
              title="텍스트 색상 (선택 영역)"
            >
                <Palette size={16} className="text-gray-600"/>
            </button>
            
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-2 p-2 bg-white rounded-lg shadow-xl border border-gray-100 grid grid-cols-4 gap-2 z-50 w-48">
                 {TEXT_COLORS.map((c, i) => (
                   <button 
                    key={i}
                    onMouseDown={preventFocusLoss}
                    onClick={() => applyColor(c.hex)}
                    className="w-8 h-8 rounded-full border border-gray-200 hover:scale-110 transition-transform flex items-center justify-center"
                    style={{ backgroundColor: c.hex || 'transparent' }}
                    title={c.label}
                   >
                     {!c.hex && <Eraser size={14} className="text-gray-400"/>}
                   </button>
                 ))}
              </div>
            )}
         </div>

         <div className="w-px h-6 bg-gray-300 mx-1"></div>

         {/* Formatting (Selection Level) */}
         <div className="flex gap-1">
            <button onMouseDown={preventFocusLoss} onClick={() => execCmd('bold')} className="p-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 font-bold text-gray-700 shadow-sm" title="강조(굵게)">B</button>
            <button onMouseDown={preventFocusLoss} onClick={() => execCmd('italic')} className="p-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 italic text-gray-700 shadow-sm" title="기울임">I</button>
            <button onMouseDown={preventFocusLoss} onClick={() => execCmd('underline')} className="p-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 underline text-gray-700 shadow-sm" title="밑줄">U</button>
         </div>

         {/* Help Toggle */}
         <div className="ml-auto">
            <button 
               onClick={() => setShowHelp(!showHelp)}
               className={`p-1.5 rounded-full ${showHelp ? 'bg-primary text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
               title="사용법 보기"
            >
              <HelpCircle size={18} />
            </button>
         </div>
      </div>

      {/* HELP GUIDE */}
      {showHelp && (
        <div className="bg-gray-50 border-b border-gray-100 p-4 text-sm text-gray-600 animate-fade-in">
          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
             <Wand2 size={16} className="text-primary"/> 에디터 100% 활용하기
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Guide 1: Partial Editing */}
             <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2 font-bold text-xs uppercase text-gray-500">
                   <Hand size={14} /> 부분 선택 편집
                </div>
                <div className="space-y-2">
                   <div className="text-xs bg-gray-100 p-2 rounded text-gray-500">
                      "여기에 <span className="bg-blue-100 text-blue-600 px-1 rounded">중요한 단어</span>를 드래그하세요"
                   </div>
                   <p className="text-xs leading-relaxed">
                      마우스로 <strong>원하는 글자만 드래그</strong>한 상태에서 색상, 크기(가/가), 굵게(B) 버튼을 누르면 <strong>선택한 부분만</strong> 바뀝니다.
                   </p>
                </div>
             </div>

             {/* Guide 2: Block Editing */}
             <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2 font-bold text-xs uppercase text-gray-500">
                   <MousePointerClick size={14} /> 전체 일괄 편집
                </div>
                <div className="space-y-2">
                   <div className="text-xs bg-gray-100 p-2 rounded text-gray-500 text-center">
                      (선택 없이 클릭) <br/> 문단 전체 정렬/크기 변경
                   </div>
                   <p className="text-xs leading-relaxed">
                      아무것도 선택하지 않고 버튼을 누르면 <strong>문단 전체</strong>의 정렬이나 기본 크기가 변경됩니다.
                   </p>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* EDITABLE AREA */}
      <div 
        ref={contentEditableRef}
        className={`w-full p-4 outline-none min-h-[80px] text-gray-800 font-sans leading-relaxed break-keep break-words ${styleState.align === 'center' ? 'text-center' : styleState.align === 'right' ? 'text-right' : 'text-left'} ${className}`}
        contentEditable
        onInput={handleInput}
        style={{ fontSize: '16px' }}
      />
    </div>
  );
};


export const CardPreview: React.FC<CardPreviewProps> = ({ 
  slide, 
  totalSlides, 
  themeIndex = 0, 
  onUpdate,
  onRegenerate,
  captureId,
  hideControls = false,
  forExport = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const [editHeader, setEditHeader] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editHeaderStyle, setEditHeaderStyle] = useState<TextStyle>({ align: 'left', fontSize: 'text-3xl', color: '' });
  const [editBodyStyle, setEditBodyStyle] = useState<TextStyle>({ align: 'left', fontSize: 'text-xl', color: '' });

  const safeIndex = Math.abs(themeIndex) % THEMES.length;
  const theme = THEMES[safeIndex];
  
  const isCover = slide.pageNumber === 1;

  // Initialize edit state when slide changes
  useEffect(() => {
    const isHeaderHtml = /<\/?[a-z][\s\S]*>/i.test(slide.header);
    setEditHeader(isHeaderHtml ? slide.header : markdownToHtml(slide.header));

    const isBodyHtml = /<\/?[a-z][\s\S]*>/i.test(slide.body);
    setEditBody(isBodyHtml ? slide.body : markdownToHtml(slide.body));

    setEditHeaderStyle(slide.headerStyle || { align: isCover ? 'center' : 'left', fontSize: isCover ? 'text-5xl' : 'text-3xl', color: '' });
    setEditBodyStyle(slide.bodyStyle || { align: 'left', fontSize: 'text-2xl', color: '' });
    
  }, [slide, isCover]);

  // Separate effect to close editor only when navigating between slides
  useEffect(() => {
    setIsEditing(false);
  }, [slide.pageNumber]);

  // Sync Changes to Parent immediately
  useEffect(() => {
    if (isEditing) {
        onUpdate(editHeader, editBody, editHeaderStyle, editBodyStyle);
    }
  }, [editHeader, editBody, editHeaderStyle, editBodyStyle, isEditing]);


  const toggleEditing = () => {
    setIsEditing(!isEditing);
  };

  const closeEditing = () => {
    setIsEditing(false);
  };

  const renderContent = (content: string, isHeader: boolean, style: TextStyle | undefined) => {
     // If content has HTML tags, trust it. If not, convert markdown.
     // Now with standard contentEditable, we usually get HTML tags.
     const isHtml = /<\/?[a-z][\s\S]*>/i.test(content);
     const rawHtml = isHtml ? content : markdownToHtml(content);

     // Process HTML to inject theme classes (mainly for <b> tags)
     const finalHtml = processHtmlForPreview(rawHtml, theme, isHeader, forExport);

     const alignClass = style?.align === 'center' ? 'text-center' : style?.align === 'right' ? 'text-right' : 'text-left';
     const sizeClass = style?.fontSize || (isHeader ? 'text-3xl' : 'text-2xl');
     const colorClass = style?.color || theme.text; // Base color
     const weightClass = isHeader ? 'font-bold' : 'font-medium';

     return (
       <div 
         className={`${alignClass} ${sizeClass} ${colorClass} ${weightClass} font-sans leading-tight break-keep break-words`}
         dangerouslySetInnerHTML={{ __html: finalHtml }}
       />
     );
  };

  return (
    <div className="flex flex-col gap-6 w-full items-center">
      
      {/* 1. PREVIEW CARD AREA */}
      <div 
        id={captureId}
        className={`relative w-full md:w-96 aspect-[4/5] overflow-hidden flex flex-col ${forExport ? 'transition-none' : 'transition-colors duration-500 shadow-2xl'} ${theme.bg} group select-none`}
      >
        <div className="absolute top-[-20%] right-[-20%] w-[100%] h-[70%] pointer-events-none opacity-100 z-0" style={{ background: `radial-gradient(circle at center, ${theme.blob1} 0%, transparent 60%)` }}></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[60%] pointer-events-none opacity-100 z-0" style={{ background: `radial-gradient(circle at center, ${theme.blob2} 0%, transparent 60%)` }}></div>

        {/* --- VIEW CONTENT --- */}
        <div className="relative z-10 h-full flex flex-col p-8 justify-center">
            
            {/* Header Content */}
            <div className={`${isCover ? 'flex-1 flex flex-col items-center justify-center' : 'mb-6 pb-6 border-b border-black/10 dark:border-white/10'}`}>
                {isCover && <div className={`w-12 h-1 mb-8 opacity-50 ${theme.accent.replace('text-', 'bg-')}`}></div>}
                
                <div className="w-full">
                  {renderContent(slide.header, true, slide.headerStyle)}
                </div>
                
                {isCover && <div className={`w-32 h-2.5 rounded-full mt-8 ${theme.decoration}`}></div>}
            </div>

            {/* Body Content */}
            {!isCover && (
              <div className="flex-1 relative">
                 {renderContent(slide.body, false, slide.bodyStyle)}
              </div>
            )}
        </div>
      </div>

      {/* 2. CONTROLS & EDITOR AREA (Appears Below) */}
      {!hideControls && (
        <div className="w-full md:w-96 space-y-4">
          
          {!isEditing ? (
             <button 
                onClick={toggleEditing}
                className="w-full py-4 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-200 hover:text-primary transition-all shadow-sm text-lg"
              >
                <Wand2 size={20} />
                디자인 및 텍스트 수정하기
              </button>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-primary/20 p-6 shadow-xl animate-fade-in space-y-6">
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Edit2 size={18} className="text-primary"/> 
                    에디터
                 </h3>
                 <button onClick={closeEditing} className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-md hover:bg-red-500 transition-colors flex items-center gap-2">
                    <Check size={16} /> 편집 완료
                 </button>
              </div>

              {/* Header Editor */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">제목 (Header)</label>
                <ContentEditableInput 
                  html={editHeader} 
                  setHtml={setEditHeader} 
                  styleState={editHeaderStyle}
                  setStyleState={setEditHeaderStyle}
                  placeholder="제목을 입력하세요"
                  className="font-bold"
                />
              </div>

              {/* Body Editor */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">본문 (Body)</label>
                <ContentEditableInput 
                  html={editBody} 
                  setHtml={setEditBody} 
                  styleState={editBodyStyle}
                  setStyleState={setEditBodyStyle}
                  placeholder="내용을 입력하세요"
                  className="font-medium"
                />
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
};