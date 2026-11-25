import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useGithubLogin } from '../hooks/useAuth';
import { getErrorMessage } from '../../../shared/api/api-client';
import { useLanguage } from '../../../shared/i18n/language';
import { BrandMark } from '../../../shared/components/BrandMark';

export function GithubCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const githubLoginMutation = useGithubLogin();

  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const errorParam = searchParams.get('error_description') || searchParams.get('error');
  const calledRef = useRef(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loginError, setLoginError] = useState<unknown>(null);

  // Chụp state từ sessionStorage 1 lần khi mount để không mất giá trị khi re-render sau khi xóa nonce.
  const [savedState] = useState(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('github_oauth_state') : null
  );
  const isStateInvalid = Boolean(code && (!savedState || !stateParam || savedState !== stateParam));

  const getTargetUrl = () => {
    const target = sessionStorage.getItem('github_redirect_after') || '/projects';
    sessionStorage.removeItem('github_redirect_after');
    return target;
  };

  useEffect(() => {
    if (calledRef.current) return;
    if (isStateInvalid || !code) {
      sessionStorage.removeItem('github_oauth_mode');
      return;
    }
    calledRef.current = true;
    if (savedState) sessionStorage.removeItem('github_oauth_state');
    // Lưu kết quả qua state cục bộ vì StrictMode cleanup làm MutationObserver của TanStack Query tách khỏi request đang bay.
    const handleSuccess = () => {
      sessionStorage.removeItem('github_oauth_mode');
      setLoginSuccess(true);
      const target = getTargetUrl();
      navigate(target, { replace: true });
    };
    const handleError = (err: unknown) => {
      sessionStorage.removeItem('github_oauth_mode');
      setLoginError(err);
    };
    if (typeof githubLoginMutation.mutateAsync === 'function') {
      githubLoginMutation.mutateAsync({ code }).then(handleSuccess, handleError);
    } else {
      githubLoginMutation.mutate({ code }, { onSuccess: handleSuccess, onError: handleError });
    }
  }, [code, isStateInvalid, githubLoginMutation, navigate, savedState]);

  const rawError = loginError ?? githubLoginMutation.error;
  const isSuccess = loginSuccess || githubLoginMutation.isSuccess;
  const error = isStateInvalid
    ? t('Mã xác thực trạng thái (state) không hợp lệ, có thể yêu cầu đã bị giả mạo.', 'Invalid state parameter, possible CSRF attack.')
    : errorParam || (rawError ? getErrorMessage(rawError, true) : null);

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-neutral-primary px-4 py-10 text-body">
      <section className="relative w-full max-w-md rounded-base border border-border-default bg-neutral-primary-soft p-6 text-center animate-fade-in-up">
        <div className="mb-6 flex justify-center">
          <BrandMark size={48} decorative />
        </div>

        {error ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-fg-danger-strong">
              <AlertCircle size={22} className="shrink-0" />
              <h2 className="text-base font-semibold">{t('Đăng nhập GitHub thất bại', 'GitHub sign-in failed')}</h2>
            </div>
            <p className="rounded-base border border-border-danger-subtle bg-danger-soft p-3 text-xs font-medium text-fg-danger-strong">
              {error}
            </p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="btn btn-brand w-full justify-center"
            >
              <ArrowLeft size={15} />
              {t('Quay lại trang đăng nhập', 'Back to sign in')}
            </button>
          </div>
        ) : isSuccess ? (
          <div className="space-y-4 py-4">
            <CheckCircle2 size={36} className="mx-auto text-fg-success" />
            <h2 className="text-base font-semibold text-heading font-display">
              {t('Kết nối GitHub thành công!', 'Connected to GitHub!')}
            </h2>
            <p className="text-xs text-body-subtle">
              {t('Đang chuyển hướng vào hệ thống...', 'Redirecting into the app...')}
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Loader2 size={36} className="mx-auto animate-spin text-fg-brand" />
            <h2 className="text-base font-semibold text-heading font-display">
              {t('Đang xác thực với GitHub...', 'Authenticating with GitHub...')}
            </h2>
            <p className="text-xs text-body-subtle">
              {t('Vui lòng đợi trong giây lát, hệ thống đang kết nối tài khoản của bạn.', 'Please wait while we connect your account.')}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
