import React from 'react';
import { ArrowLeft, Hammer, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface SignInGateProps {
  onBack: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

export function SignInGate({ onBack, onOpenTerms, onOpenPrivacy }: SignInGateProps) {
  const { busy, error, login, clearError } = useAuth();

  return (
    <div className="min-h-screen bg-[#FFF8F7]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <button type="button" onClick={onBack} className="tool-icon-button" aria-label="홈으로 돌아가기">
            <ArrowLeft size={21} />
          </button>
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-white"><Hammer size={19} /></span>
          <span className="font-black text-gray-900">모두뚝딱</span>
        </div>
      </header>
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-xl place-items-center px-5 py-12 text-center">
        <section>
          <span className="mx-auto grid size-14 place-items-center rounded-lg bg-gray-900 text-white"><ShieldCheck size={27} /></span>
          <h1 className="mt-5 text-2xl font-black text-gray-900">로그인이 필요합니다</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-gray-600">
            AI 생성 API를 안전하게 제공하기 위해 Google 계정으로 사용자를 확인합니다.
          </p>
          <button
            type="button"
            onClick={() => { clearError(); void login(); }}
            disabled={busy}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 font-bold text-white hover:bg-gray-700 disabled:cursor-wait disabled:opacity-60"
          >
            <LogIn size={19} /> {busy ? '로그인 확인 중' : 'Google로 계속'}
          </button>
          {error && <p className="mt-3 text-sm font-bold text-red-600" role="alert">{error}</p>}
          <p className="mt-4 text-xs leading-5 text-gray-500">
            계속하면{' '}
            <button type="button" onClick={onOpenTerms} className="font-bold underline">이용약관</button>
            과{' '}
            <button type="button" onClick={onOpenPrivacy} className="font-bold underline">개인정보처리방침</button>
            을 확인한 것으로 봅니다.
          </p>
        </section>
      </main>
    </div>
  );
}
