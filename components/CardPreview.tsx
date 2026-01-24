import React, { useState, useEffect, useRef } from 'react';
import { Slide, TextStyle } from '../types';
import {
  Check, Edit2, Undo, AlignLeft, AlignCenter, AlignRight,
  Type, Palette, Minus, Plus, Wand2, Eraser, HelpCircle, MousePointerClick, Hand
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

export const THEMES = [
  { id: 'neon-dark', bg: "bg-gray-900", text: "text-white", accent: "text-[#FF0055]", highlightBg: "#FF0055", highlightText: "text-white", decoration: "bg-gradient-to-tr from-[#FF0055] to-[#FF5588]", blob1: "rgba(255, 0, 85, 0.4)", blob2: "rgba(255, 85, 136, 0.3)" },
  { id: 'clean-blue', bg: "bg-white", text: "text-gray-900", accent: "text-[#2962FF]", highlightBg: "#2962FF", highlightText: "text-white", decoration: "bg-gradient-to-tr from-[#2962FF] to-[#00B0FF]", blob1: "rgba(41, 98, 255, 0.15)", blob2: "rgba(0, 176, 255, 0.15)" },
  { id: 'warm-emotional', bg: "bg-[#FDFBF7]", text: "text-[#4A403A]", accent: "text-[#D84315]", highlightBg: "#FFCCBC", highlightText: "text-[#BF360C]", decoration: "bg-gradient-to-br from-[#FFAB91] to-[#FF7043]", blob1: "rgba(255, 171, 145, 0.4)", blob2: "rgba(255, 112, 67, 0.3)" },
  { id: 'vibrant-purple', bg: "bg-[#7000FF]", text: "text-white", accent: "text-[#00E5FF]", highlightBg: "#00E5FF", highlightText: "text-black", decoration: "bg-gradient-to-bl from-[#D500F9] to-[#651FFF]", blob1: "rgba(213, 0, 249, 0.4)", blob2: "rgba(101, 31, 255, 0.4)" },
  { id: 'trust-green', bg: "bg-[#004D40]", text: "text-[#E0F2F1]", accent: "text-[#FFD740]", highlightBg: "#FFD740", highlightText: "text-[#004D40]", decoration: "bg-gradient-to-t from-[#00695C] to-[#4DB6AC]", blob1: "rgba(0, 105, 92, 0.5)", blob2: "rgba(77, 182, 172, 0.4)" },
  { id: 'midnight-gold', bg: "bg-slate-900", text: "text-amber-50", accent: "text-amber-400", highlightBg: "#fbbf24", highlightText: "text-slate-900", decoration: "bg-gradient-to-r from-amber-300 to-yellow-500", blob1: "rgba(251, 191, 36, 0.15)", blob2: "rgba(180, 83, 9, 0.15)" },
  { id: 'sunset-gradient', bg: "bg-gradient-to-br from-indigo-900 to-purple-800", text: "text-white", accent: "text-orange-300", highlightBg: "#fb923c", highlightText: "text-white", decoration: "bg-gradient-to-r from-orange-400 to-pink-500", blob1: "rgba(251, 146, 60, 0.3)", blob2: "rgba(236, 72, 153, 0.3)" },
  { id: 'ocean-depths', bg: "bg-gradient-to-b from-blue-900 to-slate-900", text: "text-cyan-100", accent: "text-cyan-400", highlightBg: "#22d3ee", highlightText: "text-blue-900", decoration: "bg-gradient-to-t from-cyan-400 to-blue-500", blob1: "rgba(34, 211, 238, 0.2)", blob2: "rgba(59, 130, 246, 0.2)" },
  { id: 'forest-mist', bg: "bg-gradient-to-br from-emerald-900 to-green-800", text: "text-emerald-50", accent: "text-emerald-300", highlightBg: "#34d399", highlightText: "text-emerald-900", decoration: "bg-emerald-500", blob1: "rgba(52, 211, 153, 0.2)", blob2: "rgba(16, 185, 129, 0.2)" },
  { id: 'berry-smoothie', bg: "bg-gradient-to-tr from-pink-500 to-rose-500", text: "text-white", accent: "text-yellow-200", highlightBg: "#ffffff", highlightText: "text-rose-600", decoration: "bg-yellow-300", blob1: "rgba(255, 255, 255, 0.2)", blob2: "rgba(253, 224, 71, 0.3)" },
  { id: 'minimal-mono', bg: "bg-gray-100", text: "text-gray-900", accent: "text-black", highlightBg: "#000000", highlightText: "text-white", decoration: "bg-gray-800", blob1: "rgba(0, 0, 0, 0.05)", blob2: "rgba(0, 0, 0, 0.08)" },
  { id: 'minimal-dark', bg: "bg-neutral-900", text: "text-neutral-200", accent: "text-white", highlightBg: "#ffffff", highlightText: "text-black", decoration: "bg-neutral-700", blob1: "rgba(255, 255, 255, 0.05)", blob2: "rgba(255, 255, 255, 0.03)" },
  { id: 'paper-white', bg: "bg-[#F5F5F5]", text: "text-[#333333]", accent: "text-[#000000]", highlightBg: "#333333", highlightText: "text-white", decoration: "bg-[#999999]", blob1: "rgba(0,0,0,0.03)", blob2: "rgba(0,0,0,0.03)" },
  { id: 'soft-gray', bg: "bg-slate-200", text: "text-slate-800", accent: "text-slate-600", highlightBg: "#475569", highlightText: "text-white", decoration: "bg-slate-400", blob1: "rgba(71, 85, 105, 0.1)", blob2: "rgba(51, 65, 85, 0.1)" },
  { id: 'high-contrast', bg: "bg-black", text: "text-yellow-400", accent: "text-white", highlightBg: "#facc15", highlightText: "text-black", decoration: "bg-white", blob1: "rgba(250, 204, 21, 0.1)", blob2: "rgba(255, 255, 255, 0.1)" },
  { id: 'minty-fresh', bg: "bg-emerald-50", text: "text-emerald-900", accent: "text-emerald-600", highlightBg: "#a7f3d0", highlightText: "text-emerald-800", decoration: "bg-gradient-to-tr from-emerald-400 to-teal-400", blob1: "rgba(52, 211, 153, 0.2)", blob2: "rgba(16, 185, 129, 0.2)" },
  { id: 'soft-lavender', bg: "bg-purple-50", text: "text-slate-700", accent: "text-purple-600", highlightBg: "#e9d5ff", highlightText: "text-purple-800", decoration: "bg-purple-400", blob1: "rgba(192, 132, 252, 0.2)", blob2: "rgba(168, 85, 247, 0.15)" },
  { id: 'peach-fuzz', bg: "bg-orange-50", text: "text-stone-800", accent: "text-orange-500", highlightBg: "#fed7aa", highlightText: "text-orange-900", decoration: "bg-orange-400", blob1: "rgba(251, 146, 60, 0.2)", blob2: "rgba(253, 186, 116, 0.2)" },
  { id: 'sky-blue', bg: "bg-sky-50", text: "text-sky-900", accent: "text-sky-500", highlightBg: "#bae6fd", highlightText: "text-sky-800", decoration: "bg-sky-400", blob1: "rgba(14, 165, 233, 0.1)", blob2: "rgba(56, 189, 248, 0.15)" },
  { id: 'lemon-chiffon', bg: "bg-yellow-50", text: "text-yellow-900", accent: "text-yellow-600", highlightBg: "#fef08a", highlightText: "text-yellow-800", decoration: "bg-yellow-400", blob1: "rgba(250, 204, 21, 0.1)", blob2: "rgba(253, 224, 71, 0.15)" },
  { id: 'retro-yellow', bg: "bg-yellow-400", text: "text-black", accent: "text-red-600", highlightBg: "#000000", highlightText: "text-yellow-400", decoration: "bg-red-500", blob1: "rgba(0,0,0,0.1)", blob2: "rgba(239, 68, 68, 0.2)" },
  { id: 'red-power', bg: "bg-red-600", text: "text-white", accent: "text-yellow-300", highlightBg: "#ffffff", highlightText: "text-red-600", decoration: "bg-yellow-400", blob1: "rgba(255, 255, 255, 0.2)", blob2: "rgba(0, 0, 0, 0.2)" },
  { id: 'orange-soda', bg: "bg-orange-500", text: "text-white", accent: "text-yellow-300", highlightBg: "#ffffff", highlightText: "text-orange-500", decoration: "bg-yellow-400", blob1: "rgba(255, 255, 255, 0.3)", blob2: "rgba(252, 211, 77, 0.3)" },
  { id: 'lime-punch', bg: "bg-lime-400", text: "text-black", accent: "text-blue-700", highlightBg: "#2563eb", highlightText: "text-white", decoration: "bg-blue-500", blob1: "rgba(37, 99, 235, 0.2)", blob2: "rgba(29, 78, 216, 0.2)" },
  { id: 'hot-pink', bg: "bg-pink-500", text: "text-white", accent: "text-lime-300", highlightBg: "#bef264", highlightText: "text-pink-600", decoration: "bg-lime-400", blob1: "rgba(190, 242, 100, 0.3)", blob2: "rgba(255, 255, 255, 0.2)" },
  { id: 'deep-space', bg: "bg-slate-950", text: "text-cyan-50", accent: "text-cyan-400", highlightBg: "#06b6d4", highlightText: "text-slate-900", decoration: "bg-gradient-to-r from-cyan-500 to-blue-500", blob1: "rgba(6, 182, 212, 0.15)", blob2: "rgba(59, 130, 246, 0.15)" },
  { id: 'cyberpunk', bg: "bg-black", text: "text-green-50", accent: "text-green-400", highlightBg: "#22c55e", highlightText: "text-black", decoration: "bg-gradient-to-r from-green-400 to-lime-400", blob1: "rgba(74, 222, 128, 0.3)", blob2: "rgba(132, 204, 22, 0.2)" },
  { id: 'vampire-red', bg: "bg-[#2A0A0A]", text: "text-red-100", accent: "text-red-500", highlightBg: "#dc2626", highlightText: "text-black", decoration: "bg-red-700", blob1: "rgba(220, 38, 38, 0.2)", blob2: "rgba(153, 27, 27, 0.3)" },
  { id: 'indigo-night', bg: "bg-indigo-950", text: "text-indigo-100", accent: "text-pink-400", highlightBg: "#ec4899", highlightText: "text-white", decoration: "bg-gradient-to-r from-pink-500 to-purple-500", blob1: "rgba(236, 72, 153, 0.2)", blob2: "rgba(99, 102, 241, 0.2)" },
  { id: 'galaxy-void', bg: "bg-[#0F172A]", text: "text-purple-100", accent: "text-purple-400", highlightBg: "#9333ea", highlightText: "text-white", decoration: "bg-purple-500", blob1: "rgba(168, 85, 247, 0.2)", blob2: "rgba(192, 132, 252, 0.1)" },
  { id: 'corporate-blue', bg: "bg-blue-900", text: "text-white", accent: "text-blue-200", highlightBg: "#ffffff", highlightText: "text-blue-900", decoration: "bg-blue-400", blob1: "rgba(96, 165, 250, 0.2)", blob2: "rgba(37, 99, 235, 0.2)" },
  { id: 'slate-teal', bg: "bg-slate-800", text: "text-slate-100", accent: "text-teal-400", highlightBg: "#14b8a6", highlightText: "text-slate-900", decoration: "bg-gradient-to-tr from-teal-400 to-emerald-400", blob1: "rgba(45, 212, 191, 0.2)", blob2: "rgba(52, 211, 153, 0.2)" },
  { id: 'navy-gold', bg: "bg-blue-950", text: "text-slate-200", accent: "text-yellow-500", highlightBg: "#eab308", highlightText: "text-white", decoration: "bg-yellow-700", blob1: "rgba(234, 179, 8, 0.2)", blob2: "rgba(30, 58, 138, 0.5)" },
  { id: 'steel-gray', bg: "bg-gray-600", text: "text-white", accent: "text-gray-300", highlightBg: "#d1d5db", highlightText: "text-gray-800", decoration: "bg-gray-400", blob1: "rgba(255, 255, 255, 0.1)", blob2: "rgba(0, 0, 0, 0.2)" },
  { id: 'executive', bg: "bg-[#1C1C1C]", text: "text-gray-200", accent: "text-white", highlightBg: "#ffffff", highlightText: "text-black", decoration: "bg-gray-500", blob1: "rgba(255, 255, 255, 0.05)", blob2: "rgba(255, 255, 255, 0.05)" },
  { id: 'forest-calm', bg: "bg-[#2C3E2D]", text: "text-[#E8F5E9]", accent: "text-[#A5D6A7]", highlightBg: "#a5d6a7", highlightText: "text-[#1B5E20]", decoration: "bg-[#81C784]", blob1: "rgba(165, 214, 167, 0.15)", blob2: "rgba(200, 230, 201, 0.1)" },
  { id: 'coffee-house', bg: "bg-[#3E2723]", text: "text-[#EFEBE9]", accent: "text-[#D7CCC8]", highlightBg: "#a1887f", highlightText: "text-white", decoration: "bg-[#8D6E63]", blob1: "rgba(215, 204, 200, 0.1)", blob2: "rgba(161, 136, 127, 0.1)" },
  { id: 'sand-dune', bg: "bg-[#D7CCC8]", text: "text-[#3E2723]", accent: "text-[#5D4037]", highlightBg: "#5d4037", highlightText: "text-[#D7CCC8]", decoration: "bg-[#795548]", blob1: "rgba(62, 39, 35, 0.1)", blob2: "rgba(93, 64, 55, 0.1)" },
  { id: 'olive-garden', bg: "bg-[#556B2F]", text: "text-[#FFFFF0]", accent: "text-[#808000]", highlightBg: "#6b8e23", highlightText: "text-white", decoration: "bg-[#9ACD32]", blob1: "rgba(154, 205, 50, 0.2)", blob2: "rgba(107, 142, 35, 0.3)" },
  { id: 'ocean-breeze', bg: "bg-cyan-50", text: "text-cyan-900", accent: "text-cyan-600", highlightBg: "#bae6fd", highlightText: "text-cyan-800", decoration: "bg-gradient-to-r from-cyan-400 to-blue-400", blob1: "rgba(34, 211, 238, 0.2)", blob2: "rgba(6, 182, 212, 0.15)" },
  { id: 'royal-luxury', bg: "bg-zinc-900", text: "text-orange-50", accent: "text-yellow-500", highlightBg: "#ca8a04", highlightText: "text-black", decoration: "bg-gradient-to-r from-yellow-500 to-yellow-200", blob1: "rgba(234, 179, 8, 0.15)", blob2: "rgba(250, 204, 21, 0.1)" },
  { id: 'rose-gold', bg: "bg-[#B76E79]", text: "text-white", accent: "text-[#FFD700]", highlightBg: "#ffffff", highlightText: "text-[#B76E79]", decoration: "bg-[#E6C2C9]", blob1: "rgba(255, 215, 0, 0.2)", blob2: "rgba(255, 255, 255, 0.2)" },
  { id: 'platinum', bg: "bg-[#E5E4E2]", text: "text-slate-800", accent: "text-slate-500", highlightBg: "#94a3b8", highlightText: "text-white", decoration: "bg-slate-300", blob1: "rgba(100, 116, 139, 0.1)", blob2: "rgba(148, 163, 184, 0.1)" },
  { id: 'champagne', bg: "bg-[#F7E7CE]", text: "text-[#5C4033]", accent: "text-[#C2B280]", highlightBg: "#c2b280", highlightText: "text-white", decoration: "bg-[#D4C494]", blob1: "rgba(194, 178, 128, 0.2)", blob2: "rgba(92, 64, 51, 0.1)" },
  { id: 'ruby', bg: "bg-[#9B111E]", text: "text-white", accent: "text-[#FFD700]", highlightBg: "#ffd700", highlightText: "text-[#9B111E]", decoration: "bg-[#E0115F]", blob1: "rgba(255, 215, 0, 0.2)", blob2: "rgba(255, 255, 255, 0.1)" },
  { id: 'bubblegum', bg: "bg-gradient-to-b from-blue-300 to-pink-300", text: "text-white", accent: "text-purple-600", highlightBg: "#ffffff", highlightText: "text-pink-500", decoration: "bg-purple-400", blob1: "rgba(255, 255, 255, 0.4)", blob2: "rgba(236, 72, 153, 0.3)" },
  { id: 'tropical-punch', bg: "bg-gradient-to-tr from-green-400 to-blue-500", text: "text-white", accent: "text-yellow-200", highlightBg: "#ffffff", highlightText: "text-green-600", decoration: "bg-yellow-400", blob1: "rgba(253, 224, 71, 0.3)", blob2: "rgba(255, 255, 255, 0.2)" },
  { id: 'cherry-blossom', bg: "bg-pink-50", text: "text-pink-900", accent: "text-pink-500", highlightBg: "#fbcfe8", highlightText: "text-pink-700", decoration: "bg-pink-300", blob1: "rgba(244, 114, 182, 0.2)", blob2: "rgba(251, 207, 232, 0.4)" },
  { id: 'grape-soda', bg: "bg-purple-800", text: "text-purple-100", accent: "text-fuchsia-300", highlightBg: "#e879f9", highlightText: "text-purple-900", decoration: "bg-purple-500", blob1: "rgba(232, 121, 249, 0.2)", blob2: "rgba(192, 132, 252, 0.2)" },
  { id: 'pastel-dream', bg: "bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100", text: "text-slate-700", accent: "text-pink-500", highlightBg: "#fbcfe8", highlightText: "text-pink-800", decoration: "bg-gradient-to-r from-pink-300 to-purple-300", blob1: "rgba(244, 114, 182, 0.2)", blob2: "rgba(251, 207, 232, 0.2)" }
];

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

const markdownToHtml = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/__(.*?)__/g, '<u>$1</u>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>');
};

const processHtmlForPreview = (html: string, theme: any, isHeader: boolean, forExport: boolean = false) => {
  if (!html) return '';

  if (forExport) {
    const headerColor = theme.accent.includes('#') ? theme.accent : 'inherit';

    // Helper to resolve text color from Tailwind class for html2canvas
    const getTextColorFromClass = (className: string) => {
      if (!className) return '#000000';

      // Handle arbitrary values like text-[#1B5E20]
      const hexMatch = className.match(/text-\[#([0-9A-Fa-f]{6})\]/);
      if (hexMatch) return `#${hexMatch[1]}`;

      // Standard Tailwind classes used in themes
      if (className.includes('text-white')) return '#ffffff';
      if (className.includes('text-black')) return '#000000';

      // Grays / Slates / Zincs / Neutrals
      if (className.includes('text-gray-800')) return '#1f2937';
      if (className.includes('text-gray-900')) return '#111827';
      if (className.includes('text-slate-900')) return '#0f172a';
      if (className.includes('text-neutral-900')) return '#171717';

      // Reds / Pinks / Roses
      if (className.includes('text-red-600')) return '#dc2626';
      if (className.includes('text-rose-600')) return '#e11d48';
      if (className.includes('text-pink-500')) return '#ec4899';
      if (className.includes('text-pink-600')) return '#db2777';
      if (className.includes('text-pink-700')) return '#be185d';
      if (className.includes('text-pink-800')) return '#9d174d';

      // Oranges / Yellows / Ambers
      if (className.includes('text-orange-500')) return '#f97316';
      if (className.includes('text-orange-900')) return '#7c2d12';
      if (className.includes('text-yellow-400')) return '#facc15';
      if (className.includes('text-yellow-800')) return '#854d0e';

      // Greens / Emeralds / Teals
      if (className.includes('text-green-600')) return '#16a34a';
      if (className.includes('text-emerald-800')) return '#065f46';
      if (className.includes('text-emerald-900')) return '#064e3b';
      if (className.includes('text-teal-900')) return '#134e4a';

      // Blues / Cyans / Skys / Indigos
      if (className.includes('text-blue-900')) return '#1e3a8a';
      if (className.includes('text-cyan-800')) return '#155e75';
      if (className.includes('text-sky-800')) return '#075985';
      if (className.includes('text-indigo-900')) return '#312e81';

      // Purples / Violets
      if (className.includes('text-purple-800')) return '#6b21a8';
      if (className.includes('text-purple-900')) return '#581c87';

      return '#000000'; // Default fallback
    };

    const highlightTextColor = getTextColorFromClass(theme.highlightText);

    // Export-Optimized Rendering Strategy:
    // Highlighting now changes text color only, removing background to fix vertical alignment and wrapping issues.
    return html
      .replace(/<b>(.*?)<\/b>/g, (match, p1) => {
        if (isHeader) return `<span class="${theme.accent.includes('#') ? '' : theme.accent}" style="color: ${theme.accent.includes('#') ? theme.accent : ''}; display: inline;">${p1}</span>`;

        // Highlight: Change text color to highlightBg (accent color), remove background
        return `<span style="color: ${theme.highlightBg}; display: inline;">${p1}</span>`;
      })
      .replace(/<strong>(.*?)<\/strong>/g, (match, p1) => {
        if (isHeader) return `<span class="${theme.accent.includes('#') ? '' : theme.accent}" style="color: ${theme.accent.includes('#') ? theme.accent : ''}; display: inline;">${p1}</span>`;

        // Highlight: Change text color to highlightBg (accent color), remove background
        return `<span style="color: ${theme.highlightBg}; display: inline;">${p1}</span>`;
      });
  }

  // Normal preview style using Tailwind classes
  const decorationClass = 'box-decoration-clone';
  // Removed padding/rounded/highlightText from highlightClass as we are now just coloring the text
  const highlightClass = isHeader
    ? `${theme.accent} inline`
    : `font-bold ${decorationClass} leading-snug`;

  // We use an inline style for the text color (previously background color)
  return html
    .replace(/<b>/g, `<span class="${highlightClass}" style="${!isHeader ? `color: ${theme.highlightBg};` : ''}">`)
    .replace(/<\/b>/g, '</span>')
    .replace(/<strong>/g, `<span class="${highlightClass}" style="${!isHeader ? `color: ${theme.highlightBg};` : ''}">`)
    .replace(/<\/strong>/g, '</span>');
};

const ContentEditableInput = ({ html, setHtml, styleState, setStyleState, placeholder, className = "" }: any) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (contentEditableRef.current && contentEditableRef.current.innerHTML !== html) {
      contentEditableRef.current.innerHTML = html;
    }
  }, [html]);

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand('styleWithCSS', false, (cmd === 'bold' || cmd === 'italic' || cmd === 'underline') ? 'false' : 'true');
    document.execCommand(cmd, false, value);
    if (contentEditableRef.current) {
      contentEditableRef.current.focus();
      setHtml(contentEditableRef.current.innerHTML);
    }
  };

  const changeSize = (delta: number) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && contentEditableRef.current?.contains(selection.anchorNode) && !selection.isCollapsed) {
      let currentVal = 3;
      try { currentVal = parseInt(document.queryCommandValue('fontSize')) || 3; } catch (e) { }
      execCmd('fontSize', Math.min(Math.max(currentVal + delta, 1), 7).toString());
    } else {
      const currentIndex = SIZES.indexOf(styleState.fontSize);
      if (currentIndex !== -1) {
        setStyleState({ ...styleState, fontSize: SIZES[Math.min(Math.max(currentIndex + delta, 0), SIZES.length - 1)] });
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 bg-white rounded-xl border border-gray-200 overflow-visible shadow-sm z-10">
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-100 relative select-none">
        <button onClick={() => execCmd('undo')} className="p-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 shadow-sm mr-2"><Undo size={16} /></button>
        <div className="flex bg-white rounded-md border border-gray-200 mr-2 overflow-hidden shadow-sm">
          <button onClick={() => setStyleState({ ...styleState, align: 'left' })} className={`p-1.5 hover:bg-gray-50 ${styleState.align === 'left' ? 'bg-gray-100' : ''}`}><AlignLeft size={16} /></button>
          <button onClick={() => setStyleState({ ...styleState, align: 'center' })} className={`p-1.5 hover:bg-gray-50 ${styleState.align === 'center' ? 'bg-gray-100' : ''}`}><AlignCenter size={16} /></button>
          <button onClick={() => setStyleState({ ...styleState, align: 'right' })} className={`p-1.5 hover:bg-gray-50 ${styleState.align === 'right' ? 'bg-gray-100' : ''}`}><AlignRight size={16} /></button>
        </div>
        <div className="flex items-center bg-white rounded-md border border-gray-200 mr-2 overflow-hidden shadow-sm">
          <button onClick={() => changeSize(-1)} className="p-1.5 hover:bg-gray-50"><Minus size={14} /></button>
          <div className="px-2 text-xs font-bold w-8 text-center"><Type size={14} /></div>
          <button onClick={() => changeSize(1)} className="p-1.5 hover:bg-gray-50"><Plus size={14} /></button>
        </div>
        <div className="relative">
          <button onClick={() => setShowColorPicker(!showColorPicker)} className="p-1.5 bg-white border border-gray-200 rounded-md hover:bg-gray-50 mr-2 shadow-sm"><Palette size={16} /></button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-2 p-2 bg-white rounded-lg shadow-xl border border-gray-100 grid grid-cols-4 gap-2 z-50 w-48">
              {TEXT_COLORS.map((c, i) => (
                <button key={i} onClick={() => { if (c.hex) execCmd('foreColor', c.hex); else execCmd('removeFormat'); setShowColorPicker(false); }} className="w-8 h-8 rounded-full border" style={{ backgroundColor: c.hex || 'transparent' }}>
                  {!c.hex && <Eraser size={14} className="mx-auto text-gray-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button onClick={() => execCmd('bold')} className="p-1.5 font-bold hover:bg-gray-100 px-3">B</button>
        <button onClick={() => execCmd('italic')} className="p-1.5 italic hover:bg-gray-100 px-3">I</button>
        <button onClick={() => execCmd('underline')} className="p-1.5 underline hover:bg-gray-100 px-3">U</button>
        <button onClick={() => setShowHelp(!showHelp)} className="ml-auto p-1.5 text-gray-400 hover:text-primary"><HelpCircle size={18} /></button>
      </div>
      <div ref={contentEditableRef} className={`w-full p-4 outline-none min-h-[80px] break-keep break-words ${styleState.align === 'center' ? 'text-center' : styleState.align === 'right' ? 'text-right' : 'text-left'} ${className}`} contentEditable onInput={(e) => setHtml(e.currentTarget.innerHTML)} />
    </div>
  );
};

export const CardPreview: React.FC<CardPreviewProps> = ({ slide, themeIndex = 0, onUpdate, captureId, hideControls = false, forExport = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editHeader, setEditHeader] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editHeaderStyle, setEditHeaderStyle] = useState<TextStyle>({ align: 'left', fontSize: 'text-3xl', color: '' });
  const [editBodyStyle, setEditBodyStyle] = useState<TextStyle>({ align: 'left', fontSize: 'text-xl', color: '' });

  const theme = THEMES[Math.abs(themeIndex) % THEMES.length];
  const isCover = slide.pageNumber === 1;

  useEffect(() => {
    setEditHeader(/<\/?[a-z][\s\S]*>/i.test(slide.header) ? slide.header : markdownToHtml(slide.header));
    setEditBody(/<\/?[a-z][\s\S]*>/i.test(slide.body) ? slide.body : markdownToHtml(slide.body));
    setEditHeaderStyle(slide.headerStyle || { align: isCover ? 'center' : 'left', fontSize: isCover ? 'text-5xl' : 'text-3xl', color: '' });
    setEditBodyStyle(slide.bodyStyle || { align: 'left', fontSize: 'text-2xl', color: '' });
  }, [slide, isCover]);

  useEffect(() => { if (isEditing) onUpdate(editHeader, editBody, editHeaderStyle, editBodyStyle); }, [editHeader, editBody, editHeaderStyle, editBodyStyle, isEditing]);

  const renderContent = (content: string, isHeader: boolean, style: TextStyle | undefined) => (
    <div
      className={`${style?.align === 'center' ? 'text-center' : style?.align === 'right' ? 'text-right' : 'text-left'} ${style?.fontSize || (isHeader ? 'text-3xl' : 'text-2xl')} ${style?.color || theme.text} ${isHeader ? 'font-bold' : 'font-medium'} font-sans leading-tight break-keep break-words`}
      style={{ lineHeight: '1.4' }}
      dangerouslySetInnerHTML={{ __html: processHtmlForPreview(/<\/?[a-z][\s\S]*>/i.test(content) ? content : markdownToHtml(content), theme, isHeader, forExport) }}
    />
  );

  return (
    <div className="flex flex-col gap-6 w-full items-center">
      <div id={captureId} className={`relative w-full md:w-96 aspect-[4/5] overflow-hidden flex flex-col ${forExport ? '' : 'transition-colors duration-500 shadow-2xl'} ${theme.bg} select-none`}>
        <div className="absolute top-[-20%] right-[-20%] w-[100%] h-[70%] z-0" style={{ background: `radial-gradient(circle at center, ${theme.blob1} 0%, transparent 60%)` }}></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[60%] z-0" style={{ background: `radial-gradient(circle at center, ${theme.blob2} 0%, transparent 60%)` }}></div>
        <div className="relative z-10 h-full flex flex-col p-8 justify-center">
          <div className={`${isCover ? 'flex-1 flex flex-col items-center justify-center' : 'mb-6 pb-6 border-b border-black/10'}`}>
            {isCover && <div className={`w-12 h-1 mb-8 opacity-50 ${theme.accent.includes('#') ? '' : theme.accent.replace('text-', 'bg-')}`} style={theme.accent.includes('#') ? { backgroundColor: theme.accent } : {}}></div>}
            <div className="w-full">{renderContent(slide.header, true, slide.headerStyle)}</div>
            {isCover && <div className={`w-32 h-2.5 rounded-full mt-8 ${theme.decoration}`}></div>}
          </div>
          {!isCover && <div className="flex-1 relative">{renderContent(slide.body, false, slide.bodyStyle)}</div>}
        </div>
      </div>
      {!hideControls && (
        <div className="w-full md:w-96">
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="w-full py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all shadow-sm text-lg"><Wand2 size={20} />디자인 및 텍스트 수정</button>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-primary/20 p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="font-bold flex items-center gap-2"><Edit2 size={18} className="text-primary" /> 에디터</h3>
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-md hover:bg-red-500 transition-colors flex items-center gap-2"><Check size={16} /> 완료</button>
              </div>
              <ContentEditableInput html={editHeader} setHtml={setEditHeader} styleState={editHeaderStyle} setStyleState={setEditHeaderStyle} className="font-bold" />
              <ContentEditableInput html={editBody} setHtml={setEditBody} styleState={editBodyStyle} setStyleState={setEditBodyStyle} className="font-medium" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};