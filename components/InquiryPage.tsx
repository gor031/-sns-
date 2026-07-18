import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Hammer,
  Inbox,
  Loader2,
  MessageCircleQuestion,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { UserMenu } from './auth/UserMenu';
import { useAuth } from './auth/AuthProvider';
import {
  answerInquiry,
  createInquiry,
  getAllInquiries,
  getMyInquiries,
  isInquiryAdmin,
  type Inquiry,
} from '../services/inquiryService';

type InquiryPageProps = { onBack: () => void };
type View = 'mine' | 'new' | 'admin' | 'detail';

const formatDate = (inquiry: Inquiry) => {
  const date = inquiry.createdAt?.toDate();
  if (!date) return '방금 전';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date);
};

function StatusBadge({ status }: { status: Inquiry['status'] }) {
  return status === 'answered' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
      <CheckCircle2 size={13} aria-hidden="true" /> 답변 완료
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
      <Clock3 size={13} aria-hidden="true" /> 답변 대기
    </span>
  );
}

export function InquiryPage({ onBack }: InquiryPageProps) {
  const { user } = useAuth();
  const admin = isInquiryAdmin(user);
  const [view, setView] = useState<View>(() => admin ? 'admin' : 'mine');
  const [previousView, setPreviousView] = useState<View>(() => admin ? 'admin' : 'mine');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [category, setCategory] = useState('서비스 이용');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');

  const loadInquiries = useCallback(async (targetView: View = view) => {
    if (!user) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const next = targetView === 'admin' && admin
        ? await getAllInquiries()
        : await getMyInquiries(user.uid);
      setInquiries(next);
      if (selected) setSelected(next.find((item) => item.id === selected.id) || selected);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '문의 내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [admin, selected, user, view]);

  useEffect(() => {
    if (view === 'mine' || view === 'admin') void loadInquiries(view);
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeView = (next: View) => {
    setView(next);
    setSelected(null);
    setErrorMessage('');
  };

  const openDetail = (item: Inquiry) => {
    setPreviousView(view);
    setSelected(item);
    setReply(item.reply);
    setErrorMessage('');
    setView('detail');
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !message.trim()) {
      setErrorMessage('제목과 문의 내용을 모두 작성해 주세요.');
      return;
    }
    setBusy(true);
    setErrorMessage('');
    try {
      await createInquiry({ category, title: title.trim(), message: message.trim() });
      setCategory('서비스 이용');
      setTitle('');
      setMessage('');
      setView('mine');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '문의를 등록하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleAnswer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !reply.trim()) {
      setErrorMessage('답변 내용을 작성해 주세요.');
      return;
    }
    setBusy(true);
    setErrorMessage('');
    try {
      await answerInquiry(selected.id, reply.trim());
      const updated: Inquiry = { ...selected, reply: reply.trim(), status: 'answered' };
      setSelected(updated);
      setInquiries((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '답변을 등록하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F7]">
      <header className="border-b border-rose-100 bg-white">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <button type="button" onClick={onBack} className="flex min-h-11 items-center gap-3 rounded-lg pr-2 text-left focus-visible:ring-4 focus-visible:ring-primary/25" aria-label="모두뚝딱 홈으로 이동">
            <span className="grid size-10 place-items-center rounded-lg bg-primary text-white"><Hammer size={21} aria-hidden="true" /></span>
            <span className="text-xl font-black text-gray-900">모두뚝딱</span>
          </button>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-5 border-b border-rose-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button type="button" onClick={onBack} className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-gray-600 hover:text-gray-900">
              <ArrowLeft size={18} aria-hidden="true" /> 홈으로
            </button>
            <p className="text-sm font-black text-primary">문의 사항</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-gray-900">문의 게시판</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-gray-600">내가 작성한 문의와 관리자 답변은 본인만 볼 수 있습니다.</p>
          </div>
          <button type="button" onClick={() => changeView('new')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-black text-white shadow-sm transition hover:bg-[#ef5d5d] focus-visible:ring-4 focus-visible:ring-primary/25">
            <Plus size={19} aria-hidden="true" /> 새 문의 작성
          </button>
        </div>

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="문의 게시판 메뉴">
          <button type="button" onClick={() => changeView('mine')} aria-current={view === 'mine' ? 'page' : undefined} className={`min-h-11 shrink-0 rounded-lg px-4 text-sm font-black transition ${view === 'mine' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
            내 문의
          </button>
          {admin && (
            <button type="button" onClick={() => changeView('admin')} aria-current={view === 'admin' ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${view === 'admin' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
              <ShieldCheck size={17} aria-hidden="true" /> 전체 문의 관리
            </button>
          )}
        </nav>

        <section className="mt-5">
          {(view === 'mine' || view === 'admin') && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-6">
                <div>
                  <h2 className="font-black text-gray-900">{view === 'admin' ? '전체 문의' : '내 문의'}</h2>
                  <p className="mt-0.5 text-xs font-medium text-gray-500">총 {inquiries.length}건</p>
                </div>
                <button type="button" onClick={() => void loadInquiries(view)} className="tool-icon-button" aria-label="문의 내역 새로고침" disabled={loading}>
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
                </button>
              </div>
              {errorMessage && <p className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700" role="alert">{errorMessage}</p>}
              {loading ? (
                <div className="grid min-h-56 place-items-center" role="status"><Loader2 className="animate-spin text-primary" size={28} /><span className="sr-only">문의 내역 불러오는 중</span></div>
              ) : inquiries.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-gray-100 text-gray-500"><Inbox size={23} aria-hidden="true" /></span>
                  <h3 className="mt-4 font-black text-gray-900">아직 문의가 없습니다</h3>
                  <p className="mt-1 text-sm font-medium text-gray-500">궁금한 점이 생기면 새 문의를 남겨주세요.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {inquiries.map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => openDetail(item)} className="group flex min-h-24 w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-rose-50/50 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/25 sm:px-6">
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2"><StatusBadge status={item.status} /><span className="text-xs font-bold text-gray-400">{item.category}</span></span>
                          <span className="mt-2 block truncate font-black text-gray-900">{item.title}</span>
                          <span className="mt-1 block text-xs font-medium text-gray-500">{view === 'admin' ? `${item.userName} · ${item.userEmail} · ` : ''}{formatDate(item)}</span>
                        </span>
                        <ChevronRight className="shrink-0 text-gray-400 transition group-hover:translate-x-1" size={20} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {view === 'new' && (
            <form onSubmit={(event) => void handleCreate(event)} className="mx-auto max-w-2xl space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
                <span className="grid size-11 place-items-center rounded-lg bg-primary text-white"><MessageCircleQuestion size={22} aria-hidden="true" /></span>
                <div><h2 className="text-xl font-black text-gray-900">새 문의 작성</h2><p className="text-sm font-medium text-gray-500">관리자만 내용을 확인할 수 있습니다.</p></div>
              </div>
              <div>
                <label className="tool-label" htmlFor="inquiry-category">문의 유형</label>
                <select className="tool-input cursor-pointer" id="inquiry-category" value={category} onChange={(event) => setCategory(event.target.value)} required>
                  <option>서비스 이용</option><option>오류 신고</option><option>기능 제안</option><option>결제 및 계정</option><option>기타</option>
                </select>
              </div>
              <div>
                <label className="tool-label" htmlFor="inquiry-title">제목</label>
                <input className="tool-input" id="inquiry-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required placeholder="문의 제목을 입력해 주세요" />
              </div>
              <div>
                <div className="mb-2 flex items-end justify-between"><label className="text-sm font-bold text-gray-700" htmlFor="inquiry-message">문의 내용</label><span className="text-xs font-bold tabular-nums text-gray-400">{message.length}/2,000</span></div>
                <textarea className="tool-input min-h-52 resize-y leading-7" id="inquiry-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} required placeholder="문의 내용을 자세히 적어주세요." />
                <p className="mt-2 text-xs font-medium text-gray-500">작성자 정보는 로그인한 Google 계정으로 자동 저장됩니다.</p>
              </div>
              {errorMessage && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700" role="alert">{errorMessage}</p>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => changeView('mine')} className="min-h-12 rounded-lg border border-gray-300 px-5 font-black text-gray-700 hover:bg-gray-50">취소</button>
                <button type="submit" disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-black text-white hover:bg-[#ef5d5d] disabled:cursor-wait disabled:opacity-50">
                  {busy ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} {busy ? '등록 중' : '문의 등록'}
                </button>
              </div>
            </form>
          )}

          {view === 'detail' && selected && (
            <article className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <header className="border-b border-gray-100 p-5 sm:p-7">
                <button type="button" onClick={() => changeView(previousView === 'admin' && admin ? 'admin' : 'mine')} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-gray-600 hover:text-gray-900"><ArrowLeft size={17} /> 목록으로</button>
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={selected.status} /><span className="text-xs font-bold text-gray-400">{selected.category}</span></div>
                <h2 className="mt-3 text-2xl font-black leading-tight text-gray-900">{selected.title}</h2>
                <p className="mt-2 text-xs font-medium text-gray-500">{admin && <>{selected.userName} · {selected.userEmail} · </>}{formatDate(selected)}</p>
              </header>
              <div className="p-5 sm:p-7">
                <h3 className="text-sm font-black text-gray-500">문의 내용</h3>
                <p className="mt-3 whitespace-pre-wrap text-[15px] font-medium leading-8 text-gray-800">{selected.message}</p>
              </div>
              <div className="border-t border-gray-100 bg-gray-50 p-5 sm:p-7">
                <h3 className="flex items-center gap-2 font-black text-gray-900"><ShieldCheck size={19} className="text-primary" /> 관리자 답변</h3>
                {admin ? (
                  <form onSubmit={(event) => void handleAnswer(event)} className="mt-4">
                    <textarea className="tool-input min-h-40 resize-y bg-white leading-7" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={3000} required placeholder="사용자에게 전달할 답변을 작성해 주세요." aria-label="관리자 답변" />
                    {errorMessage && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700" role="alert">{errorMessage}</p>}
                    <button type="submit" disabled={busy} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-6 font-black text-white hover:bg-gray-700 disabled:cursor-wait disabled:opacity-50 sm:w-auto">
                      {busy ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} {busy ? '저장 중' : selected.reply ? '답변 수정' : '답변 등록'}
                    </button>
                  </form>
                ) : selected.reply ? (
                  <div className="mt-4 rounded-lg border border-emerald-100 bg-white p-4 sm:p-5"><p className="whitespace-pre-wrap text-[15px] font-medium leading-8 text-gray-800">{selected.reply}</p></div>
                ) : (
                  <p className="mt-3 text-sm font-medium leading-6 text-gray-500">관리자가 확인 중입니다. 답변이 등록되면 이곳에서 확인할 수 있어요.</p>
                )}
              </div>
            </article>
          )}
        </section>
      </main>
    </div>
  );
}
