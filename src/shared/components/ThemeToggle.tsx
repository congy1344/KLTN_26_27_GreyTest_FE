import { Moon, Sun } from 'lucide-react';
import { useLanguage } from '../i18n/language';
import { useTheme } from '../theme/theme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  const label = isDark
    ? t('Chuyển sang nền sáng', 'Switch to light theme')
    : t('Chuyển sang nền tối', 'Switch to dark theme');

  return (
    <button
      type="button"
      className="flex h-8 w-8 items-center justify-center rounded-default border border-border-default bg-neutral-secondary-soft text-body-subtle shadow-xs transition-colors hover:border-border-default-strong hover:bg-neutral-secondary-medium hover:text-heading"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
