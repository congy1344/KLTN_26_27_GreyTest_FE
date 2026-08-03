import { useLanguage } from '../i18n/language';

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className="flex rounded-default border border-border-default bg-neutral-secondary-soft p-0.5" role="group" aria-label={t('Chọn ngôn ngữ', 'Choose language')}>
      {(['vi', 'en'] as const).map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={language === item}
          className={`rounded px-2 py-1 text-[11px] font-semibold transition-colors ${language === item ? 'bg-neutral-primary-soft text-heading shadow-xs' : 'text-body-subtle hover:text-heading'}`}
          onClick={() => setLanguage(item)}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
