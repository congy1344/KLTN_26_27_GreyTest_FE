import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Beaker, Loader2, LogIn, UserPlus } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { useLogin, useRegister } from '../hooks/useAuth';
import { useLanguage } from '../../../shared/i18n/language';
import { LanguageToggle } from '../../../shared/components/LanguageToggle';

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const isPending = loginMutation.isPending || registerMutation.isPending;
  const error = loginMutation.error ?? registerMutation.error;
  const { t } = useLanguage();

  if (localStorage.getItem('greytest.token')) {
    return <Navigate to="/projects" replace />;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const onSuccess = () => navigate('/projects', { replace: true });
    if (mode === 'login') {
      loginMutation.mutate({ email, password }, { onSuccess });
    } else {
      registerMutation.mutate({ email, password, fullName }, { onSuccess });
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-neutral-primary px-4 py-10 text-body">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-px w-[82vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-border-brand-subtle to-transparent" />
        <div className="absolute right-[8%] top-[-18rem] h-[34rem] w-[34rem] rounded-full bg-brand/[0.08] blur-[110px]" />
        <div className="absolute left-[4%] bottom-[-16rem] h-[28rem] w-[28rem] rounded-full bg-brand/[0.05] blur-[100px]" />
      </div>
      <section className="relative w-full max-w-md rounded-base border border-border-default bg-neutral-primary-soft p-6 shadow-md animate-fade-in-up">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-default border border-border-brand-subtle bg-brand-softer text-fg-brand-strong">
            <Beaker size={18} strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-heading">GreyTest</h1>
            <p className="text-xs text-body-subtle">{t('Đăng nhập để quản lý project và workflow AI QA.', 'Sign in to manage projects and the AI QA workflow.')}</p>
          </div>
          <div className="ml-auto"><LanguageToggle /></div>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-default border border-border-default bg-neutral-secondary-soft p-1">
          <button
            type="button"
            aria-pressed={mode === 'login'}
            onClick={() => setMode('login')}
            className={`rounded-sm px-3 py-2 text-sm font-semibold transition-colors duration-200 ${mode === 'login' ? 'bg-neutral-primary-soft text-heading shadow-xs' : 'text-body-subtle hover:text-body'}`}
          >
            {t('Đăng nhập', 'Sign in')}
          </button>
          <button
            type="button"
            aria-pressed={mode === 'register'}
            onClick={() => setMode('register')}
            className={`rounded-sm px-3 py-2 text-sm font-semibold transition-colors duration-200 ${mode === 'register' ? 'bg-neutral-primary-soft text-heading shadow-xs' : 'text-body-subtle hover:text-body'}`}
          >
            {t('Đăng ký', 'Register')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-heading">{t('Họ tên', 'Full name')}</span>
              <input className="form-input" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-heading">Email</span>
            <input
              className="form-input"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-heading">{t('Mật khẩu', 'Password')}</span>
            <input
              className="form-input"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && (
            <div className="rounded-default border border-border-danger-subtle bg-danger-soft p-3 text-sm font-medium text-fg-danger-strong animate-fade-in">
              {getErrorMessage(error)}
            </div>
          )}

          <button className="btn btn-brand w-full" disabled={isPending}>
            {isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : mode === 'login' ? (
              <LogIn size={15} />
            ) : (
              <UserPlus size={15} />
            )}
            {isPending
              ? t('Đang xử lý...', 'Processing...')
              : mode === 'login' ? t('Đăng nhập', 'Sign in') : t('Tạo tài khoản', 'Create account')}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-body-subtle">
          {t('GreyTest · Hệ thống AI QA Agent hướng Grey-box', 'GreyTest · Grey-box AI QA Agent system')}
        </p>
      </section>
    </div>
  );
}
