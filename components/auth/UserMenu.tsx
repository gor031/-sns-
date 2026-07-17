import React, { useState } from 'react';
import { LogIn, LogOut, Trash2, UserRound } from 'lucide-react';
import { useAuth } from './AuthProvider';

export function UserMenu() {
  const { user, busy, error, login, logout, removeAccount, clearError } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => { clearError(); void login(); }}
          disabled={busy}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gray-900 px-3 text-sm font-bold text-white transition hover:bg-gray-700 disabled:cursor-wait disabled:opacity-60"
        >
          <LogIn size={17} />
          Google 로그인
        </button>
        {error && <p className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-red-100 bg-white p-3 text-xs font-bold leading-5 text-red-600 shadow-lg" role="alert">{error}</p>}
      </div>
    );
  }

  const handleDelete = async () => {
    if (!window.confirm('계정을 삭제할까요? Firebase 로그인 계정 정보가 삭제됩니다.')) return;
    try {
      await removeAccount();
      setOpen(false);
    } catch {
      // The provider keeps the menu open and renders the auth error below.
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { clearError(); setOpen((current) => !current); }}
        className="flex min-h-10 max-w-48 items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 text-left text-sm font-bold text-gray-800 shadow-sm hover:bg-gray-50"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="size-7 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="grid size-7 place-items-center rounded-full bg-gray-100"><UserRound size={16} /></span>
        )}
        <span className="truncate">{user.displayName || user.email || '내 계정'}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-52 rounded-lg border border-gray-200 bg-white p-1.5 shadow-xl" role="menu">
          <button
            type="button"
            onClick={() => void logout().then(() => setOpen(false))}
            disabled={busy}
            className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            role="menuitem"
          >
            <LogOut size={17} /> 로그아웃
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={busy}
            className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
            role="menuitem"
          >
            <Trash2 size={17} /> 계정 삭제
          </button>
          {error && <p className="px-3 py-2 text-xs font-bold leading-5 text-red-600" role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
