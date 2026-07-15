import React from 'react';
import { ArrowLeft, Hammer } from 'lucide-react';

interface ToolHeaderProps {
  title: string;
  onBack: () => void;
  actions?: React.ReactNode;
}

export function ToolHeader({ title, onBack, actions }: ToolHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-3 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="tool-icon-button"
          aria-label="도구 선택으로 돌아가기"
          title="뒤로"
        >
          <ArrowLeft size={21} />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-white">
            <Hammer size={19} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-400">모두뚝딱</p>
            <h1 className="truncate text-base font-black text-gray-900 sm:text-lg">{title}</h1>
          </div>
        </div>
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
