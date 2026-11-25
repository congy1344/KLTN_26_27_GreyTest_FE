import { SelectMenu } from '../../../shared/components/SelectMenu';
import { IconButton } from '../../../shared/components/IconButton';
import { AlertTriangle, ArrowLeft, BarChart3, Calendar, CheckCircle2, CircleDot, Package, PauseCircle, Pencil, PlayCircle, Plus, Save, Trash2, Users, X } from 'lucide-react';
import { Tag } from '../../../shared/components/Tag';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../../../shared/api/api-client';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { AdminShell } from '../components/AdminShell';
import {
  useAdminOverview,
  useTierPackageMutations,
  useTierPackages,
  useTopUsers,
} from '../hooks/useAdmin';
import { useLanguage } from '../../../shared/i18n/language';
import type { TierPackage } from '../types';

interface PackageFormState {
  code: string;
  name: string;
  price: number;
  cycle: string;
  resetCycle: string;
  quotaLimit: number;
  batchConcurrency: number;
  featuresText: string;
  description: string;
  active: boolean;
  isNew: boolean;
}

const SYSTEM_TIER_CODES = new Set(['FREE', 'PLUS', 'PRO']);

export function AdminQuotasPage() {
  const { language } = useLanguage();
  const overview = useAdminOverview();
  const top = useTopUsers(30);
  const tierPackagesQuery = useTierPackages();
  const packageMutations = useTierPackageMutations();

  const [modalPackage, setModalPackage] = useState<PackageFormState | null>(null);
  const [confirmSavePackageOpen, setConfirmSavePackageOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TierPackage | null>(null);
  const [statusToggleTarget, setStatusToggleTarget] = useState<TierPackage | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const packages: TierPackage[] = tierPackagesQuery.data ?? [];

  const handleOpenCreate = () => {
    setFormError(null);
    setModalPackage({
      code: '',
      name: '',
      price: 0,
      cycle: 'MONTHLY',
      resetCycle: 'WEEKLY',
      quotaLimit: 100,
      batchConcurrency: 2,
      featuresText: 'Sinh Test Plan\nSinh Test Case\nSinh Unit Test (JUnit 5)',
      description: '',
      active: true,
      isNew: true,
    });
  };

  const handleOpenEdit = (pkg: TierPackage) => {
    setFormError(null);
    setModalPackage({
      code: pkg.code,
      name: pkg.name,
      price: pkg.price ?? 0,
      cycle: pkg.cycle || 'MONTHLY',
      resetCycle: pkg.resetCycle || 'WEEKLY',
      quotaLimit: pkg.quotaLimit ?? 100,
      batchConcurrency: pkg.batchConcurrency ?? 2,
      featuresText: (pkg.features || []).join('\n'),
      description: pkg.description || '',
      active: pkg.active,
      isNew: false,
    });
  };

  const handleSavePackage = (e: FormEvent) => {
    e.preventDefault();
    if (!modalPackage) return;
    setFormError(null);

    const code = modalPackage.code.trim().toUpperCase();
    if (!code) {
      setFormError(language === 'vi' ? 'Vui lòng nhập mã gói (viết hoa, không dấu).' : 'Tier code is required.');
      return;
    }
    if (!modalPackage.name.trim()) {
      setFormError(language === 'vi' ? 'Vui lòng nhập tên gói.' : 'Tier name is required.');
      return;
    }

    setConfirmSavePackageOpen(true);
  };

  const handleConfirmSavePackage = () => {
    if (!modalPackage) return;
    setFormError(null);

    const code = modalPackage.code.trim().toUpperCase();
    const features = modalPackage.featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    const payload = {
      code,
      name: modalPackage.name.trim(),
      price: Number(modalPackage.price) || 0,
      cycle: modalPackage.cycle,
      resetCycle: modalPackage.resetCycle,
      quotaLimit: Number(modalPackage.quotaLimit) || 100,
      batchConcurrency: Number(modalPackage.batchConcurrency) || 2,
      features,
      description: modalPackage.description.trim(),
      active: modalPackage.active,
    };

    if (modalPackage.isNew) {
      packageMutations.create.mutate(payload, {
        onSuccess: () => {
          setConfirmSavePackageOpen(false);
          setModalPackage(null);
        },
        onError: (err) => {
          setConfirmSavePackageOpen(false);
          setFormError(getErrorMessage(err));
        },
      });
    } else {
      packageMutations.update.mutate({ code: modalPackage.code, data: payload }, {
        onSuccess: () => {
          setConfirmSavePackageOpen(false);
          setModalPackage(null);
        },
        onError: (err) => {
          setConfirmSavePackageOpen(false);
          setFormError(getErrorMessage(err));
        },
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setFormError(null);
    packageMutations.deletePackage.mutate(deleteTarget.code, {
      onSuccess: () => setDeleteTarget(null),
      onError: (err) => {
        setFormError(getErrorMessage(err));
        setDeleteTarget(null);
      },
    });
  };

  const handleConfirmToggleStatus = () => {
    if (!statusToggleTarget) return;
    setFormError(null);
    const newActive = !statusToggleTarget.active;
    packageMutations.update.mutate(
      { code: statusToggleTarget.code, data: { active: newActive } },
      {
        onSuccess: () => setStatusToggleTarget(null),
        onError: (err) => {
          setFormError(getErrorMessage(err));
          setStatusToggleTarget(null);
        },
      }
    );
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const formatBillingCycle = (c?: string) => {
    const cycle = (c || 'MONTHLY').toUpperCase();
    if (cycle === 'WEEKLY') return language === 'vi' ? 'Hàng tuần (WEEKLY)' : 'Weekly';
    if (cycle === 'YEARLY') return language === 'vi' ? 'Hàng năm (YEARLY)' : 'Yearly';
    return language === 'vi' ? 'Hàng tháng (MONTHLY)' : 'Monthly';
  };

  const formatResetCycle = (c?: string) => {
    const cycle = (c || 'WEEKLY').toUpperCase();
    if (cycle === 'DAILY') return language === 'vi' ? 'hàng ngày' : 'daily';
    if (cycle === 'MONTHLY') return language === 'vi' ? 'hàng tháng' : 'monthly';
    return language === 'vi' ? 'hàng tuần' : 'weekly';
  };

  return (
    <AdminShell>
      <div className="mb-4">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-body-subtle hover:text-heading transition-colors"
        >
          <ArrowLeft size={14} />
          <span>{language === 'vi' ? 'Quay lại Dashboard' : 'Back to Dashboard'}</span>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Quản lý gói & hạn ngạch' : 'Tier & Quota Management'}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-heading sm:text-3xl">
            {language === 'vi' ? 'Quản lý hạn ngạch & gói dịch vụ Tier' : "Tier packages & usage policies"}
          </h1>
        </div>

        <div className="flex items-center gap-2 rounded-base border border-border-default bg-neutral-primary-soft px-3 py-1.5 text-xs text-body shadow-xs">
          <Calendar size={13} className="text-fg-brand-strong" />
          <span>
            {language === 'vi'
              ? 'Chu kỳ làm mới hạn ngạch: Hàng tuần (theo ngày đăng ký)'
              : 'Quota reset cycle: Weekly (by registration date)'}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Module 1: Dynamic Subscription Tiers Overview Cards */}
        <section className="grid gap-4 md:grid-cols-3">
          {packages.map((pkg) => (
            <div
              key={pkg.code}
              className={`rounded-base border p-5 shadow-xs transition-colors ${
                pkg.active
                  ? 'border-border-default bg-neutral-primary-soft'
                  : 'border-dashed border-border-default-subtle bg-neutral-secondary-soft/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <Tag variant="status" tone={pkg.code === 'PRO' ? "brand" : pkg.code === 'PLUS' ? "brand" : "neutral"} icon={CircleDot}>
                  {pkg.code} TIER
                </Tag>
                <span className="flex items-center gap-1 text-xs font-bold text-fg-brand-strong">
                  <Package size={14} />
                  <span>{formatCurrency(pkg.price)}</span>
                </span>
              </div>

              <h3 className="mt-3 font-sans text-xl font-bold text-heading">
                {pkg.quotaLimit.toLocaleString()} requests
              </h3>
              <p className="mt-0.5 text-xs font-semibold text-fg-brand-strong">
                Hồi Quota {formatResetCycle(pkg.resetCycle)} • {formatBillingCycle(pkg.cycle)}
              </p>
              <p className="mt-1 text-xs text-body-subtle">{pkg.description || pkg.name}</p>

              <div className="mt-4 border-t border-border-default-subtle pt-3 text-xs text-body-subtle space-y-1">
                <div className="flex justify-between">
                  <span>{language === 'vi' ? 'Độ song song' : 'Concurrency'}:</span>
                  <strong className="text-heading">{pkg.batchConcurrency} batch đồng thời</strong>
                </div>
                <div className="flex justify-between">
                  <span>{language === 'vi' ? 'Người dùng đang dùng' : 'Active users'}:</span>
                  <span className="font-sans tabular-nums font-bold text-fg-brand-strong">{pkg.activeUsersCount ?? 0} tài khoản</span>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Module 2: Quota Alerts & Top Consumers */}
        <section className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <div className="rounded-base border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-border-default pb-3">
              <AlertTriangle size={16} className="text-fg-warning" />
              <h3 className="text-sm font-bold text-heading">
                {language === 'vi' ? 'Cảnh báo vượt hạn ngạch' : "Quota warning alerts"}
              </h3>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="font-sans tabular-nums text-3xl font-extrabold text-heading">
                  {overview.data?.quotaAlerts ?? 0}
                </span>
                <span className="text-xs text-body-subtle">
                  {language === 'vi' ? 'tài khoản cần chú ý' : 'accounts flagged'}
                </span>
              </div>
              <p className="mt-2 text-xs text-body-subtle">
                {language === 'vi'
                  ? 'Các tài khoản đã sử dụng trên 90% giới hạn token của kỳ hiện tại.'
                  : 'Accounts that exceeded or reached 90% of their current period allocation.'}
              </p>
            </div>
          </div>

          <div className="rounded-base border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-fg-brand-strong" />
                <h3 className="text-sm font-bold text-heading">
                  {language === 'vi' ? 'Bảng xếp hạng tiêu thụ LLM (30 ngày)' : "Top LLM consumers (last 30 days)"}
                </h3>
              </div>
              <span className="text-xs text-body-subtle">
                {language === 'vi' ? 'Top người dùng tích cực' : 'Top Active Users'}
              </span>
            </div>
            <div className="mt-4 divide-y divide-border-default-subtle">
              {(top.data ?? []).map((u, idx) => (
                <Link
                  key={u.userId}
                  to={`/admin/users/${u.userId}`}
                  className="group flex min-w-0 items-center justify-between gap-3 py-2 text-xs hover:bg-neutral-secondary-soft/50 rounded-sm px-1.5 -mx-1.5 transition-colors focus:outline-none focus:ring-1 focus:ring-brand"
                  title={language === 'vi' ? `Xem chi tiết người dùng: ${u.email}` : `View user details: ${u.email}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-softer font-sans tabular-nums text-xs font-bold text-fg-brand-strong group-hover:bg-brand group-hover:text-on-brand transition-colors">
                      {idx + 1}
                    </span>
                    <span className="min-w-0 truncate font-medium text-heading group-hover:text-fg-brand-strong group-hover:underline" title={u.email}>{u.email}</span>
                  </div>
                  <span className="shrink-0 font-sans tabular-nums font-bold text-heading">{u.totalLlmCalls} calls</span>
                </Link>
              ))}
              {!top.data?.length && (
                <p className="py-6 text-center text-xs text-body-subtle">
                  {language === 'vi' ? 'Chưa có dữ liệu gọi LLM.' : 'No data recorded.'}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Module 3: Tier Package Management Table (Full CRUD) */}
        <section className="rounded-base border border-border-default bg-neutral-primary-soft shadow-xs overflow-hidden">
          <div className="border-b border-border-default p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Package size={17} className="text-fg-brand-strong" />
                <h2 className="text-base font-bold text-heading">
                  {language === 'vi' ? 'Quản lý danh mục gói dịch vụ & hạn mức Tier' : "Tier package management & policies"}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-sans tabular-nums text-xs text-body-subtle">
                <CheckCircle2 size={13} className="text-fg-brand-strong" />
                {packages.length} {language === 'vi' ? 'gói cấu hình' : 'tiers'}
              </span>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="btn btn-brand px-3 py-1.5 text-xs flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>{language === 'vi' ? 'Thêm gói mới' : 'Add New Tier'}</span>
              </button>
            </div>
          </div>

          {formError && !modalPackage && (
            <div className="border-b border-border-danger-subtle bg-danger-soft p-3 text-xs text-fg-danger-strong flex items-center justify-between">
              <span>{formError}</span>
              <button type="button" onClick={() => setFormError(null)} className="btn btn-ghost rounded-control font-bold underline ml-2">Đóng</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-xs border-b border-border-default bg-neutral-secondary-soft font-semibold text-body-subtle">
                <tr>
                  <th className="font-semibold text-body-subtle text-xs p-3.5">{language === 'vi' ? 'Mã & tên gói' : "Code & tier name"}</th>
                  <th className="font-semibold text-body-subtle text-xs p-3.5">{language === 'vi' ? 'Giá cước' : 'Price'}</th>
                  <th className="font-semibold text-body-subtle text-xs p-3.5">{language === 'vi' ? 'Hạn mức quota' : "Quota limit"}</th>
                  <th className="font-semibold text-body-subtle text-xs p-3.5">{language === 'vi' ? 'Độ song song' : 'Concurrency'}</th>
                  <th className="font-semibold text-body-subtle text-xs p-3.5 min-w-[200px]">{language === 'vi' ? 'Tính năng nổi bật' : "Key features"}</th>
                  <th className="font-semibold text-body-subtle text-xs p-3.5">{language === 'vi' ? 'User đang dùng' : 'Subscribers'}</th>
                  <th className="font-semibold text-body-subtle text-xs p-3.5">{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                  <th className="font-semibold text-body-subtle text-xs p-3.5 text-right">{language === 'vi' ? 'Thao tác' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {packages.map((pkg) => {
                  const isSystem = SYSTEM_TIER_CODES.has(pkg.code);
                  return (
                    <tr key={pkg.code} className="hover:bg-neutral-secondary-soft/50 transition-colors">
                      <td className="p-3.5 border-r border-border-default-subtle">
                        <div className="flex items-center gap-2">
                          <Tag variant="status" tone={pkg.code === 'PRO' ? "brand" : pkg.code === 'PLUS' ? "brand" : "neutral"} icon={CircleDot}>
                            {pkg.code}
                          </Tag>
                          {isSystem && (
                            <Tag>
                              Hệ thống
                            </Tag>
                          )}
                        </div>
                        <p className="mt-1 font-semibold text-heading text-xs">{pkg.name}</p>
                        {pkg.description && (
                          <p className="mt-1 text-xs text-body-subtle leading-relaxed" title={pkg.description}>
                            {pkg.description}
                          </p>
                        )}
                      </td>

                      <td className="p-3.5 border-r border-border-default-subtle">
                        <span className="font-sans tabular-nums font-bold text-heading">
                          {formatCurrency(pkg.price)}
                        </span>
                        <p className="text-xs text-body-subtle">
                          / {pkg.cycle || 'MONTHLY'}
                        </p>
                      </td>

                      <td className="p-3.5 border-r border-border-default-subtle">
                        <span className="font-sans tabular-nums font-bold text-heading">
                          {pkg.quotaLimit.toLocaleString()}
                        </span>
                        <p className="text-xs text-body-subtle">
                          requests / hồi lại {formatResetCycle(pkg.resetCycle)}
                        </p>
                      </td>

                      <td className="p-3.5 border-r border-border-default-subtle">
                        <span className="font-sans tabular-nums font-bold text-heading">
                          {pkg.batchConcurrency}
                        </span>
                        <span className="text-xs text-body-subtle ml-1">batch</span>
                      </td>

                      <td className="p-3.5 border-r border-border-default-subtle">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(pkg.features || []).map((feat, i) => (
                            <Tag key={i}>
                              <span>{feat}</span>
                            </Tag>
                          ))}
                        </div>
                      </td>

                      <td className="p-3.5 border-r border-border-default-subtle whitespace-nowrap min-w-[120px]">
                        {isSystem ? (
                          <Link
                            to={`/admin/users?tier=${pkg.code}`}
                            className="inline-flex items-center gap-1.5 rounded-base border border-border-default bg-neutral-primary-soft px-2.5 py-1 font-sans tabular-nums text-xs font-bold text-fg-brand-strong hover:bg-brand-softer hover:border-border-brand-subtle transition-colors shadow-2xs whitespace-nowrap"
                            title={language === 'vi' ? 'Xem danh sách tài khoản thuộc gói này' : 'View users in this tier'}
                          >
                            <Users size={13} className="shrink-0" />
                            <span>{pkg.activeUsersCount ?? 0} tài khoản</span>
                          </Link>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-base border border-border-default bg-neutral-secondary-soft/60 px-2.5 py-1 font-sans tabular-nums text-xs font-semibold text-body-subtle whitespace-nowrap"
                            title={language === 'vi' ? 'Gói tùy chỉnh chưa gắn trực tiếp vào bộ lọc tài khoản' : 'Custom tier package'}
                          >
                            <Users size={13} className="shrink-0" />
                            <span>{pkg.activeUsersCount ?? 0} tài khoản</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 border-r border-border-default-subtle whitespace-nowrap min-w-[130px]">
                        <button
                          type="button"
                          onClick={() => setStatusToggleTarget(pkg)}
                          className="btn btn-ghost rounded-control p-0"
                          title={language === 'vi' ? 'Nhấp để đổi trạng thái sang Tạm dừng / Kích hoạt' : 'Click to toggle package status'}
                          aria-label={pkg.active ? (language === 'vi' ? 'Trạng thái: Kích hoạt' : 'Status: ACTIVE') : (language === 'vi' ? 'Trạng thái: Tạm dừng' : 'Status: INACTIVE')}
                        >
                          <Tag variant="status" tone={pkg.active ? 'success' : 'neutral'} icon={CircleDot}>
                            <span>{pkg.active ? (language === 'vi' ? 'Kích hoạt' : 'ACTIVE') : (language === 'vi' ? 'Tạm dừng' : 'INACTIVE')}</span>
                          </Tag>
                        </button>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex justify-end items-center gap-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setStatusToggleTarget(pkg)}
                            className={`btn inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1 text-xs font-semibold shadow-2xs transition-colors ${
                              pkg.active
                                ? 'border-border-warning-subtle bg-warning-soft text-fg-warning hover:bg-warning-soft  '
                                : 'border-border-success-subtle bg-success-soft text-fg-success-strong hover:bg-success-soft  '
                            }`}
                            title={pkg.active ? (language === 'vi' ? 'Tạm dừng gói dịch vụ này' : 'Pause package') : (language === 'vi' ? 'Kích hoạt lại gói' : 'Activate package')}
                          >
                            {pkg.active ? <PauseCircle size={13} className="text-fg-warning" /> : <PlayCircle size={13} className="text-fg-success-strong" />}
                            <span>{pkg.active ? (language === 'vi' ? 'Tạm dừng' : 'Pause') : (language === 'vi' ? 'Kích hoạt' : 'Activate')}</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary border border-border-default px-2.5 py-1 text-xs shadow-2xs"
                            onClick={() => handleOpenEdit(pkg)}
                            title={language === 'vi' ? 'Chỉnh sửa thông số gói' : 'Edit tier package'}
                          >
                            <Pencil size={13} />
                            <span>{language === 'vi' ? 'Sửa' : 'Edit'}</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary px-2.5 py-1 text-xs text-fg-danger-strong hover:bg-danger-soft"
                            onClick={() => setDeleteTarget(pkg)}
                            title={language === 'vi' ? 'Xóa hoặc tạm dừng gói dịch vụ' : 'Delete or deactivate tier package'}
                          >
                            <Trash2 size={13} />
                            <span>{language === 'vi' ? 'Xóa' : 'Delete'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Modal Thêm Mới / Chỉnh Sửa Gói Dịch Vụ Tier */}
      {modalPackage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-primary/75 px-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && setModalPackage(null)}
        >
          <form style={{ boxShadow: 'var(--shadow-lg)' }}
            onSubmit={handleSavePackage}
            className="w-full max-w-lg rounded-base border border-border-default bg-neutral-primary-soft p-6 shadow-lg space-y-4"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border-default pb-3">
              <div>
                <div className="flex items-center gap-2 text-fg-brand-strong">
                  <Package size={18} />
                  <span className="text-xs font-bold">
                    {modalPackage.isNew ? 'Thêm gói dịch vụ mới' : `Chỉnh Sửa Gói ${modalPackage.code}`}
                  </span>
                </div>
                <h2 className="mt-1 text-base font-bold text-heading">
                  {modalPackage.isNew ? 'Thiết lập thông số gói và hạn mức' : modalPackage.name}
                </h2>
              </div>
              <IconButton onClick={() => setModalPackage(null)} label="Đóng" icon={X} />
            </div>

            {formError && (
              <p role="alert" className="rounded-base bg-danger-soft p-2.5 text-xs text-fg-danger-strong border border-border-danger-subtle">
                {formError}
              </p>
            )}

            <div className="grid gap-3.5 sm:grid-cols-2 text-xs">
              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Mã gói (Tier Code)</span>
                <input
                  type="text"
                  required
                  disabled={!modalPackage.isNew}
                  placeholder="VD: VIP_ENTERPRISE"
                  className="form-input font-sans tabular-nums"
                  value={modalPackage.code}
                  onChange={(e) => setModalPackage({ ...modalPackage, code: e.target.value.toUpperCase() })}
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Tên hiển thị</span>
                <input
                  type="text"
                  required
                  placeholder="VD: Gói Doanh Nghiệp"
                  className="form-input"
                  value={modalPackage.name}
                  onChange={(e) => setModalPackage({ ...modalPackage, name: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Giá cước (VNĐ)</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  className="form-input font-sans tabular-nums"
                  value={modalPackage.price}
                  onChange={(e) => setModalPackage({ ...modalPackage, price: Number(e.target.value) })}
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Chu kỳ gia hạn (Billing Cycle)</span>
                <SelectMenu
                  value={modalPackage.cycle}
                  onChange={(selectedValue) => setModalPackage({ ...modalPackage, cycle: selectedValue })}
                  aria-label={'Chu kỳ gia hạn'}
                  options={[{ value: String("MONTHLY"), label: "Hàng tháng (MONTHLY)" }, { value: String("WEEKLY"), label: "Hàng tuần (WEEKLY)" }, { value: String("YEARLY"), label: "Hàng năm (YEARLY)" }]}
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Chu kỳ làm mới Quota (Reset Cycle)</span>
                <SelectMenu
                  value={modalPackage.resetCycle}
                  onChange={(selectedValue) => setModalPackage({ ...modalPackage, resetCycle: selectedValue })}
                  aria-label={'Chu kỳ làm mới Quota'}
                  options={[{ value: String("DAILY"), label: "Hàng ngày (DAILY)" }, { value: String("WEEKLY"), label: "Hàng tuần (WEEKLY)" }, { value: String("MONTHLY"), label: "Hàng tháng (MONTHLY)" }]}
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Hạn mức Quota LLM (lượt gọi)</span>
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  required
                  className="form-input font-sans tabular-nums"
                  value={modalPackage.quotaLimit}
                  onChange={(e) => setModalPackage({ ...modalPackage, quotaLimit: Number(e.target.value) })}
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Độ song song (Batch Concurrency)</span>
                <input
                  type="number"
                  min="1"
                  max="8"
                  required
                  className="form-input font-sans tabular-nums"
                  value={modalPackage.batchConcurrency}
                  onChange={(e) => setModalPackage({ ...modalPackage, batchConcurrency: Number(e.target.value) })}
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Trạng thái gói</span>
                <SelectMenu
                  value={modalPackage.active ? 'ACTIVE' : 'INACTIVE'}
                  onChange={(selectedValue) => setModalPackage({ ...modalPackage, active: selectedValue === 'ACTIVE' })}
                  aria-label={'Trạng thái gói'}
                  options={[{ value: String("ACTIVE"), label: "● Kích hoạt (Sẵn sàng cung cấp)" }, { value: String("INACTIVE"), label: "○ Tạm dừng (Ẩn khỏi hệ thống)" }]}
                />
              </label>
            </div>

            <label className="block text-xs">
              <span className="mb-1 block font-semibold text-heading">Mô tả tóm tắt</span>
              <input
                type="text"
                placeholder="Mô tả mục đích và đối tượng sử dụng gói"
                className="form-input"
                value={modalPackage.description}
                onChange={(e) => setModalPackage({ ...modalPackage, description: e.target.value })}
              />
            </label>

            <label className="block text-xs">
              <span className="mb-1 block font-semibold text-heading">
                Danh sách tính năng nổi bật (Mỗi tính năng một dòng)
              </span>
              <textarea
                rows={3}
                placeholder="VD:&#10;Trích xuất Business Rules&#10;Sinh Test Plan tự động&#10;Hỗ trợ 4 luồng song song"
                className="form-input font-sans text-xs"
                value={modalPackage.featuresText}
                onChange={(e) => setModalPackage({ ...modalPackage, featuresText: e.target.value })}
              />
            </label>

            <div className="flex justify-end gap-2 border-t border-border-default pt-3">
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => setModalPackage(null)}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-brand text-xs flex items-center gap-1.5"
                disabled={packageMutations.create.isPending || packageMutations.update.isPending}
              >
                <Save size={14} />
                <span>Lưu gói dịch vụ</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Save Package (Create/Update) */}
      <ConfirmDialog
        open={confirmSavePackageOpen}
        variant="brand"
        title={
          modalPackage?.isNew
            ? language === 'vi' ? 'Xác nhận tạo gói dịch vụ mới?' : 'Confirm Create Tier Package?'
            : language === 'vi' ? 'Xác nhận lưu thay đổi gói dịch vụ?' : 'Confirm Update Tier Package?'
        }
        description={
          modalPackage
            ? language === 'vi'
              ? `Bạn có chắc muốn lưu cấu hình cho gói "${modalPackage.name}" (${modalPackage.code.toUpperCase()}) với hạn mức ${modalPackage.quotaLimit} lượt và ${modalPackage.batchConcurrency} batch song song?`
              : `Are you sure you want to save package "${modalPackage.name}" (${modalPackage.code})?`
            : ''
        }
        confirmLabel={language === 'vi' ? 'Xác nhận lưu' : 'Confirm Save'}
        cancelLabel={language === 'vi' ? 'Hủy' : 'Cancel'}
        pending={packageMutations.create.isPending || packageMutations.update.isPending}
        onCancel={() => setConfirmSavePackageOpen(false)}
        onConfirm={handleConfirmSavePackage}
      />

      {/* Confirm Delete Custom Package or Deactivate System Tier */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={
          deleteTarget && SYSTEM_TIER_CODES.has(deleteTarget.code)
            ? (language === 'vi' ? 'Xác nhận tạm dừng gói hệ thống' : 'Confirm Deactivate System Tier')
            : (language === 'vi' ? 'Xác nhận xóa gói dịch vụ' : 'Confirm Delete Tier Package')
        }
        description={
          deleteTarget
            ? SYSTEM_TIER_CODES.has(deleteTarget.code)
              ? (language === 'vi'
                  ? `Bạn có chắc muốn tạm dừng gói hệ thống "${deleteTarget.name}" (${deleteTarget.code})? Gói này sẽ chuyển sang trạng thái Tạm dừng và không hiển thị trên trang đăng ký/nâng cấp của người dùng.`
                  : `Are you sure you want to deactivate system tier "${deleteTarget.name}" (${deleteTarget.code})?`)
              : (language === 'vi'
                  ? `Bạn có chắc muốn xóa gói "${deleteTarget.name}" (${deleteTarget.code})? Hành động này sẽ loại bỏ gói khỏi danh mục.`
                  : `Are you sure you want to delete package "${deleteTarget.name}" (${deleteTarget.code})?`)
            : ''
        }
        confirmLabel={
          deleteTarget && SYSTEM_TIER_CODES.has(deleteTarget.code)
            ? (language === 'vi' ? 'Tạm dừng gói' : 'Deactivate')
            : (language === 'vi' ? 'Xóa gói' : 'Delete')
        }
        cancelLabel={language === 'vi' ? 'Hủy' : 'Cancel'}
        pending={packageMutations.deletePackage.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
      {/* Confirm Toggle Status */}
      <ConfirmDialog
        open={Boolean(statusToggleTarget)}
        title={
          statusToggleTarget?.active
            ? (language === 'vi' ? 'Xác nhận tạm dừng gói dịch vụ' : 'Confirm Deactivate Tier Package')
            : (language === 'vi' ? 'Xác nhận kích hoạt gói dịch vụ' : 'Confirm Activate Tier Package')
        }
        description={
          statusToggleTarget
            ? statusToggleTarget.active
              ? (language === 'vi'
                  ? `Bạn có chắc muốn tạm dừng gói "${statusToggleTarget.name}" (${statusToggleTarget.code})? Gói này sẽ chuyển sang trạng thái Tạm dừng và không hiển thị trên trang đăng ký/nâng cấp của người dùng.`
                  : `Are you sure you want to deactivate package "${statusToggleTarget.name}" (${statusToggleTarget.code})?`)
              : (language === 'vi'
                  ? `Bạn có chắc muốn kích hoạt lại gói "${statusToggleTarget.name}" (${statusToggleTarget.code})? Gói này sẽ hiển thị công khai để người dùng có thể lựa chọn đăng ký hoặc nâng cấp.`
                  : `Are you sure you want to activate package "${statusToggleTarget.name}" (${statusToggleTarget.code})?`)
            : ''
        }
        confirmLabel={
          statusToggleTarget?.active
            ? (language === 'vi' ? 'Tạm dừng gói' : 'Deactivate')
            : (language === 'vi' ? 'Kích hoạt gói' : 'Activate')
        }
        cancelLabel={language === 'vi' ? 'Hủy' : 'Cancel'}
        variant={statusToggleTarget?.active ? 'danger' : 'brand'}
        pending={packageMutations.update.isPending}
        onCancel={() => setStatusToggleTarget(null)}
        onConfirm={handleConfirmToggleStatus}
      />
    </AdminShell>
  );
}
