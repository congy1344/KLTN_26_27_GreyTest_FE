import { Tag } from './Tag';
﻿import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useUserQuota } from '../../features/auth/hooks/useAuth';
import { useLanguage } from '../i18n/language';
import { UpgradeToProModal } from './UpgradeToProModal';

// Quota dates describe calendar days, independent of the browser's UTC offset.
function quotaDate(value: string) {
  const [year, month, day] = (value ?? '').slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function QuotaMeter() {
  const { data: quota, isLoading, error } = useUserQuota();
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [upgrade, setUpgrade] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const close = () => { setOpen(false); trigger.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  if (isLoading) return <span role="status" aria-label={t('Đang tải hạn mức AI', 'Loading AI quota')} className="h-[38px] w-[180px] animate-pulse rounded-control bg-neutral-secondary" />;
  if (error || !quota) return null;

  const unlimited = quota.limit === null;
  const remaining = quota.remaining ?? (quota.limit === null ? null : Math.max(0, quota.limit - quota.used));
  const exhausted = quota.exceeded || remaining === 0;
  const ratio = unlimited ? 0 : quota.limit! > 0 ? Math.min(1, Math.max(0, quota.used / quota.limit!)) : 1;
  const tone = exhausted ? 'bg-danger' : ratio >= 0.8 ? 'bg-warning' : 'bg-brand';
  const label = unlimited ? t('Hạn mức AI: không giới hạn', 'AI quota: unlimited')
    : t(`Hạn mức AI: còn ${remaining} trên ${quota.limit} lượt`, `AI quota: ${remaining} of ${quota.limit} credits remaining`);
  const reset = quotaDate(quota.resetDate);
  const periodEnd = new Date(reset); periodEnd.setDate(periodEnd.getDate() - 1);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((Date.UTC(reset.getFullYear(), reset.getMonth(), reset.getDate()) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000);
  const format = (date: Date) => Number.isNaN(date.getTime()) ? t('Chưa có dữ liệu', 'Unavailable') : date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const bar = (mini: boolean) => <span aria-hidden="true" className={`block overflow-hidden rounded-full bg-neutral-tertiary ${mini ? 'h-[6px] w-[72px]' : 'h-2 w-full'}`}><span className={`block h-full rounded-full ${tone}`} style={{ width: `${ratio * 100}%` }} /></span>;

  return <div ref={root} className="relative">
    <button type="button" ref={trigger} onClick={() => open ? close() : setOpen(true)} aria-label={label} aria-expanded={open} aria-controls={open ? panelId : undefined}
      className="flex h-[38px] items-center gap-2.5 rounded-control border border-border-default bg-neutral-primary-soft px-3 text-sm text-body hover:border-border-default-strong">
      <Zap size={14} aria-hidden="true" />
      {!unlimited && bar(true)}
      <span className="font-mono text-xs font-medium text-heading">{unlimited ? t('Không giới hạn', 'Unlimited') : `${remaining}/${quota.limit}`}</span>
    </button>
    {open && <section id={panelId} aria-label={t('Hạn mức gọi AI', 'AI usage quota')} className="quota-popover">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-heading">{t('Hạn mức gọi AI', 'AI usage quota')}</h2>
        <Tag>{quota.tier}</Tag>
      </div>
      <p className="mb-2 mt-4 font-display text-[28px] font-bold text-heading">{unlimited ? t('Không giới hạn', 'Unlimited') : remaining}{!unlimited && <span className="ml-2 font-sans text-sm font-normal text-body-subtle">{t('lượt còn lại', 'credits remaining')}</span>}</p>
      {!unlimited && bar(false)}
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
        <dt className="text-body-subtle">{t('Đã dùng', 'Used')}</dt><dd className="text-right font-mono text-heading">{quota.used}{!unlimited && ` / ${quota.limit}`}</dd>
        <dt className="text-body-subtle">{t('Kỳ hiện tại', 'Current period')}</dt><dd className="text-right text-heading">{format(quotaDate(quota.periodStart))} {t('đến', 'to')} {format(periodEnd)}</dd>
        {days >= 0 && <><dt className="text-body-subtle">{t('Làm mới', 'Resets')}</dt><dd className="text-right text-heading">{format(reset)}<br /><span>{t(`sau ${days} ngày`, `in ${days} days`)}</span></dd></>}
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-body-subtle">{t('1 lượt tương ứng với 2 Unit Test, 2 Test Case, 2 Test Plan hoặc 3 phương thức mã nguồn.', '1 credit corresponds to 2 Unit Tests, 2 Test Cases, 2 Test Plans, or 3 source methods.')}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/settings" onClick={close} className="btn btn-secondary flex-1 text-xs">{t('Xem chi tiết', 'View details')}</Link>
        {quota.tier !== 'PRO' && <button type="button" onClick={() => { close(); setUpgrade(true); }} className="btn btn-brand flex-1 text-xs">{t('Nâng cấp gói', 'Upgrade plan')}</button>}
      </div>
    </section>}
    {upgrade && <UpgradeToProModal open onClose={() => { setUpgrade(false); trigger.current?.focus(); }} currentTier={quota.tier} defaultTier="PRO" />}
  </div>;
}
