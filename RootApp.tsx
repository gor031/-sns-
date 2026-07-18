import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Captions, ChevronRight, Hammer, ImagePlus, MessageCircleQuestion, Mic2 } from 'lucide-react';
import { DisplayAd } from './components/DisplayAd';
import { LegalPage } from './components/LegalPage';
import { SignInGate } from './components/auth/SignInGate';
import { UserMenu } from './components/auth/UserMenu';
import { useAuth } from './components/auth/AuthProvider';

const CardNewsTool = lazy(() => import('./App'));
const VoiceTtsTool = lazy(() => import('./components/VoiceTtsTool'));
const SubtitleTool = lazy(() => import('./components/SubtitleTool'));
const InquiryPage = lazy(() => import('./components/InquiryPage').then((module) => ({ default: module.InquiryPage })));

type Route = 'home' | 'cardnews' | 'voice' | 'subtitles' | 'inquiry' | 'terms' | 'privacy';

const routeFromHash = (): Route => {
  const route = window.location.hash.replace(/^#\/?/, '') as Route;
  return ['cardnews', 'voice', 'subtitles', 'inquiry', 'terms', 'privacy'].includes(route) ? route : 'home';
};

function LoadingTool() {
  return (
    <div className="grid min-h-[55vh] place-items-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 font-bold text-gray-600">
        <span className="size-5 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
        도구 불러오는 중
      </div>
    </div>
  );
}

export default function RootApp() {
  const [route, setRoute] = useState<Route>(() => routeFromHash());
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleHashChange = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (next: Route) => {
    if (next === 'home') {
      history.pushState(null, '', `${window.location.pathname}${window.location.search}`);
      setRoute('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.location.hash = next;
  };

  if (route === 'terms' || route === 'privacy') {
    return <LegalPage kind={route} onBack={() => navigate('home')} />;
  }

  if (loading) {
    return <LoadingTool />;
  }

  if (route !== 'home' && !user) {
    return (
      <SignInGate
        onBack={() => navigate('home')}
        onOpenTerms={() => navigate('terms')}
        onOpenPrivacy={() => navigate('privacy')}
      />
    );
  }

  if (route === 'inquiry') {
    return <Suspense fallback={<LoadingTool />}><InquiryPage onBack={() => navigate('home')} /></Suspense>;
  }

  if (route !== 'home') {
    return (
      <Suspense fallback={<LoadingTool />}>
        {route === 'cardnews' && <CardNewsTool onBack={() => navigate('home')} />}
        {route === 'voice' && <VoiceTtsTool onBack={() => navigate('home')} />}
        {route === 'subtitles' && <SubtitleTool onBack={() => navigate('home')} />}
      </Suspense>
    );
  }

  const tools = [
    {
      route: 'cardnews' as const,
      title: '카드뉴스 만들기',
      detail: 'AI 자동 생성 · 직접 입력 · JSON 변환',
      icon: ImagePlus,
      iconClass: 'bg-[#FF6B6B] text-white',
    },
    {
      route: 'voice' as const,
      title: '음성 만들기',
      detail: '한국어 · 영어 · 일본어 MP3',
      icon: Mic2,
      iconClass: 'bg-[#22577A] text-white',
    },
    {
      route: 'subtitles' as const,
      title: '자막 만들기',
      detail: '자동 인식 · 편집 · SRT · MP4',
      icon: Captions,
      iconClass: 'bg-[#2A9D8F] text-white',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFF8F7]">
      <header className="border-b border-rose-100 bg-white">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-primary text-white">
              <Hammer size={21} />
            </span>
            <h1 className="text-xl font-black text-gray-900">모두뚝딱</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('inquiry')}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-black text-gray-600 transition hover:bg-rose-50 hover:text-primary focus-visible:ring-4 focus-visible:ring-primary/25 sm:px-3"
            >
              <MessageCircleQuestion size={18} aria-hidden="true" />
              <span className="hidden sm:inline">문의 사항</span>
              <span className="sr-only sm:hidden">문의 사항</span>
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-7">
          <p className="text-sm font-bold text-primary">오늘의 작업</p>
          <h2 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">무엇을 만들까요?</h2>
        </div>
        <div className="mb-7 empty:hidden">
          <DisplayAd />
        </div>


        <section className="grid gap-3 md:grid-cols-3" aria-label="제작 도구">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                type="button"
                key={tool.route}
                onClick={() => navigate(tool.route)}
                className="group flex min-h-36 w-full items-center gap-4 rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 md:min-h-52 md:flex-col md:items-start md:justify-between"
              >
                <span className={`grid size-12 shrink-0 place-items-center rounded-lg ${tool.iconClass}`}>
                  <Icon size={24} />
                </span>
                <span className="min-w-0 flex-1 md:flex-none">
                  <span className="block text-lg font-black text-gray-900">{tool.title}</span>
                  <span className="mt-1 block text-sm font-medium leading-6 text-gray-500">{tool.detail}</span>
                </span>
                <ChevronRight className="shrink-0 text-gray-400 transition group-hover:translate-x-1 group-hover:text-gray-700" size={22} />
              </button>
            );
          })}
        </section>
      </main>
      <footer className="border-t border-rose-100 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-5 text-xs font-bold text-gray-500 sm:px-6">
          <span>모두뚝딱</span>
          <button type="button" onClick={() => navigate('terms')} className="hover:text-gray-900">이용약관</button>
          <button type="button" onClick={() => navigate('privacy')} className="hover:text-gray-900">개인정보처리방침</button>
          <button type="button" onClick={() => navigate('inquiry')} className="hover:text-gray-900">문의 사항</button>
        </div>
      </footer>
    </div>
  );
}
