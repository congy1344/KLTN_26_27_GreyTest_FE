import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Beaker, Loader2, LogIn, UserPlus } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { useLogin, useRegister } from '../hooks/useAuth';

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
    <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-primary px-4 py-10 text-body">
      <section className="w-full max-w-md rounded-base border border-border-default bg-neutral-primary-soft p-6 shadow-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-default border border-border-brand-subtle bg-brand-softer text-fg-brand-strong">
            <Beaker size={18} strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-heading">GreyTest</h1>
            <p className="text-xs text-body-subtle">Dang nhap de quan ly project va workflow AI QA.</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-default border border-border-default bg-neutral-secondary-soft p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-sm px-3 py-2 text-sm font-semibold ${mode === 'login' ? 'bg-neutral-primary-soft text-heading shadow-xs' : 'text-body-subtle'}`}
          >
            Dang nhap
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`rounded-sm px-3 py-2 text-sm font-semibold ${mode === 'register' ? 'bg-neutral-primary-soft text-heading shadow-xs' : 'text-body-subtle'}`}
          >
            Dang ky
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-heading">Ho ten</span>
              <input className="form-input" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-heading">Email</span>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-heading">Mat khau</span>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && (
            <div className="rounded-default border border-border-danger-subtle bg-danger-soft p-3 text-sm font-medium text-fg-danger-strong">
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
            {mode === 'login' ? 'Dang nhap' : 'Tao tai khoan'}
          </button>
        </form>
      </section>
    </div>
  );
}
