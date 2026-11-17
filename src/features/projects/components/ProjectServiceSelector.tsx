import { SelectMenu } from '../../../shared/components/SelectMenu';
import { Tag } from '../../../shared/components/Tag';
import { Boxes } from 'lucide-react';
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
    <div className="mb-6 flex flex-col gap-3 rounded-base border border-border-default bg-neutral-primary-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-border-brand-subtle bg-brand-softer text-fg-brand-strong">
          <Boxes size={17} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-heading">{t('Phạm vi đang xử lý', 'Active scope')}</p>
            <Tag className="font-mono tabular-nums">
              {services.length} {t('service', 'services')}
            </Tag>
          </div>
          <p className="mt-0.5 truncate text-xs text-body-subtle">{t('Chọn service để xem và sinh pipeline tương ứng.', 'Choose a service to view and generate its pipeline.')}</p>
        </div>
      </div>
      <label className="relative w-full min-w-0 sm:w-80 sm:max-w-[50%]">
        <span className="sr-only">{t('Chọn service', 'Select service')}</span>
        <SelectMenu
          aria-label={t('Chọn service', 'Select service')}
          value={servicePath ?? ''}
          onChange={onChange}
          searchable
          options={[
            ...(!servicePath ? [{ value: '', label: t('Chọn một service', 'Select a service') }] : []),
            ...services.map((service) => ({ value: service.servicePath, label: `${service.name} (${service.servicePath})` })),
          ]}
        />
      </label>
    </div>
  );
}
