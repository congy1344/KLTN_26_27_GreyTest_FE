import { Boxes, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../../shared/i18n/language';
import type { ProjectServiceScope } from '../types';

interface ProjectServiceSelectorProps {
  services: ProjectServiceScope[];
  servicePath?: string;
  onChange: (servicePath: string) => void;
}

export function ProjectServiceSelector({ services, servicePath, onChange }: ProjectServiceSelectorProps) {
  const { t } = useLanguage();
  if (services.length <= 1) return null;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-base border border-border-default bg-neutral-primary-soft px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-default border border-border-brand-subtle bg-brand-softer text-fg-brand-strong">
          <Boxes size={17} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-heading">{t('Phạm vi đang xử lý', 'Active scope')}</p>
            <span className="rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] font-semibold text-body-subtle">
              {services.length} {t('service', 'services')}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-body-subtle">{t('Chọn service để xem và sinh pipeline tương ứng.', 'Choose a service to view and generate its pipeline.')}</p>
        </div>
      </div>
      <label className="relative w-full shrink-0 sm:w-auto">
        <span className="sr-only">{t('Chọn service', 'Select service')}</span>
        <select
          aria-label={t('Chọn service', 'Select service')}
          className="form-input min-w-64 appearance-none bg-neutral-secondary-soft pr-10 font-medium text-heading transition-colors hover:border-border-brand-subtle focus:border-border-brand focus:ring-brand"
          value={servicePath ?? ''}
          onChange={(event) => onChange(event.target.value)}
        >
          {!servicePath && <option value="">{t('Chọn một service', 'Select a service')}</option>}
          {services.map((service) => (
            <option key={service.servicePath} value={service.servicePath}>
              {service.name} ({service.servicePath})
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" size={16} strokeWidth={1.8} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-body-subtle" />
      </label>
    </div>
  );
}
