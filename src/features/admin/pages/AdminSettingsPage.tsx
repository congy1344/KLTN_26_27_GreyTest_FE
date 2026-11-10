import {
  AlertTriangle, ArrowLeft, CheckCircle2, CreditCard,
  FileText, RefreshCw, Save, Settings,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../../../shared/api/api-client';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { LoadingState } from '../../../shared/components/LoadingState';
import { AdminShell } from '../components/AdminShell';
import { useSystemSettings, useSystemSettingsMutation } from '../hooks/useAdmin';
import { useLanguage } from '../../../shared/i18n/language';

const DEFAULT_SETTINGS: Record<string, string> = {
  'ai.model': 'gemini-1.5-pro',
  'ai.batch_concurrency': '3',
  'vnpay.tmn_code': 'CGXZLS0Z',
  'vnpay.url': 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  'log.output_dir': '../log/llm-usage',
  'alert.quota_threshold_percent': '80',
};

export function AdminSettingsPage() {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();

  const settingsQuery = useSystemSettings();
  const updateMutation = useSystemSettingsMutation();

  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formValues = {
    ...DEFAULT_SETTINGS,
    ...(settingsQuery.data?.settings ?? {}),
    ...customValues,
  };

  const handleChange = (key: string, value: string) => {
    setCustomValues((prev) => ({ ...prev, [key]: value }));
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setConfirmOpen(true);
  };

  const handleConfirmSave = () => {
    updateMutation.mutate(
      { settings: formValues },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          setCustomValues({});
          setSuccessMsg(
            language === 'vi'
              ? 'Đã lưu cấu hình hệ thống thành công vào cơ sở dữ liệu!'
              : 'System settings saved successfully to PostgreSQL database!'
          );
        },
        onError: (err) => {
          setConfirmOpen(false);
          setErrorMsg(getErrorMessage(err));
        },
      }
    );
  };

  if (searchParams.get('tab') === 'health') {
    return <Navigate to="/admin/health" replace />;
  }

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
            <span className="text-[11px] font-bold uppercase tracking-wider text-fg-brand">
              System Configuration & Health
            </span>
            <span className="rounded-md bg-brand-softer px-2 py-0.5 text-[10px] font-sans font-bold text-fg-brand-strong">
              PostgreSQL · system_setting
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-heading sm:text-3xl">
            {language === 'vi' ? 'Cấu Hình Hệ Thống (Tham Số Vận Hành)' : 'System Configuration Settings'}
          </h1>
          <p className="mt-1 text-xs text-body-subtle">
            {language === 'vi'
              ? 'Tùy chỉnh thông số vận hành AI, cổng thanh toán VNPay, đường dẫn log và kiểm soát hạn ngạch.'
              : 'Configure live runtime settings for AI models, payment gateway, operational parameters and quota limits.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => settingsQuery.refetch()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-neutral-primary-soft px-3 py-1.5 text-xs font-semibold text-body hover:bg-neutral-secondary-soft shadow-xs"
        >
          <RefreshCw
            size={13}
            className={settingsQuery.isFetching ? 'animate-spin text-brand' : ''}
          />
          <span>{language === 'vi' ? 'Làm mới' : 'Reload'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-border-success-subtle bg-success-soft p-3.5 text-xs font-semibold text-fg-success-strong shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="underline text-[11px] cursor-pointer">
            Đóng
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-border-danger-subtle bg-danger-soft p-3.5 text-xs font-semibold text-fg-danger-strong shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="underline text-[11px] cursor-pointer">
            Đóng
          </button>
        </div>
      )}

      {settingsQuery.isLoading ? (
        <div className="p-8">
          <LoadingState label={language === 'vi' ? 'Đang tải cấu hình hệ thống...' : 'Loading system settings...'} />
        </div>
      ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* AI Runtime Configuration */}
              <section className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
                <div className="flex items-center gap-2 border-b border-border-default pb-3">
                  <Settings size={16} className="text-fg-brand" />
                  <div>
                    <h3 className="text-sm font-bold text-heading">
                      {language === 'vi' ? 'Cấu Hình Mô Hình AI & Sinh Test' : 'AI Inference & Model Configuration'}
                    </h3>
                    <p className="text-[11px] text-body-subtle">
                      {language === 'vi' ? 'Mô hình mặc định và mức độ song song khi sinh batch' : 'Default LLM model and concurrency'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2 text-xs">
                  <div>
                    <label className="block font-semibold text-heading mb-1">
                      {language === 'vi' ? 'Mô hình AI mặc định' : 'Default AI Model'}
                    </label>
                    <select
                      className="form-input w-full"
                      value={formValues['ai.model'] ?? 'gemini-1.5-pro'}
                      onChange={(e) => handleChange('ai.model', e.target.value)}
                    >
                      <optgroup label="Google Gemini">
                        <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (Recommended)</option>
                        <option value="gemini-1.5-flash">Google Gemini 1.5 Flash (Fast)</option>
                        <option value="gemini-2.0-flash">Google Gemini 2.0 Flash</option>
                      </optgroup>
                      <optgroup label="OpenAI">
                        <option value="gpt-4o">OpenAI GPT-4o</option>
                        <option value="gpt-4o-mini">OpenAI GPT-4o Mini</option>
                      </optgroup>
                    </select>
                    <span className="mt-1 block text-[11px] text-body-subtle">
                      Khóa cấu hình: <code>ai.model</code>
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-heading mb-1">
                      {language === 'vi' ? 'Số luồng xử lý song song (Batch Concurrency)' : 'Batch Concurrency'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="form-input w-full font-sans tabular-nums"
                      value={formValues['ai.batch_concurrency'] ?? '3'}
                      onChange={(e) => handleChange('ai.batch_concurrency', e.target.value)}
                    />
                    <span className="mt-1 block text-[11px] text-body-subtle">
                      Khóa cấu hình: <code>ai.batch_concurrency</code> (1 - 10 workers)
                    </span>
                  </div>
                </div>
              </section>

              {/* VNPay Sandbox Settings */}
              <section className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
                <div className="flex items-center gap-2 border-b border-border-default pb-3">
                  <CreditCard size={16} className="text-fg-brand" />
                  <div>
                    <h3 className="text-sm font-bold text-heading">
                      {language === 'vi' ? 'Cổng Thanh Toán VNPay Sandbox' : 'VNPay Payment Sandbox'}
                    </h3>
                    <p className="text-[11px] text-body-subtle">
                      {language === 'vi' ? 'Thông số kết nối cổng thanh toán VNPay' : 'VNPay connection credentials'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2 text-xs">
                  <div>
                    <label className="block font-semibold text-heading mb-1">TMN Code</label>
                    <input
                      type="text"
                      className="form-input w-full font-mono"
                      value={formValues['vnpay.tmn_code'] ?? 'CGXZLS0Z'}
                      onChange={(e) => handleChange('vnpay.tmn_code', e.target.value)}
                    />
                    <span className="mt-1 block text-[11px] text-body-subtle">
                      Khóa cấu hình: <code>vnpay.tmn_code</code>
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-heading mb-1">Hash Secret</label>
                    <input
                      type="password"
                      disabled
                      className="form-input w-full font-mono bg-neutral-secondary-soft cursor-not-allowed"
                      value="••••••••••••••••••••••••••••••••"
                    />
                    <span className="mt-1 block text-[11px] text-body-subtle">
                      Được bảo vệ trong biến môi trường máy chủ (Secure Vault)
                    </span>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-semibold text-heading mb-1">VNPay Payment URL</label>
                    <input
                      type="text"
                      className="form-input w-full font-mono"
                      value={formValues['vnpay.url'] ?? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'}
                      onChange={(e) => handleChange('vnpay.url', e.target.value)}
                    />
                    <span className="mt-1 block text-[11px] text-body-subtle">
                      Khóa cấu hình: <code>vnpay.url</code>
                    </span>
                  </div>
                </div>
              </section>

              {/* Logging & Alert Thresholds */}
              <section className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
                <div className="flex items-center gap-2 border-b border-border-default pb-3">
                  <FileText size={16} className="text-fg-brand" />
                  <div>
                    <h3 className="text-sm font-bold text-heading">
                      {language === 'vi' ? 'Nhật Ký & Cảnh Báo Quota' : 'Logging & Quota Alert Thresholds'}
                    </h3>
                    <p className="text-[11px] text-body-subtle">
                      {language === 'vi' ? 'Đường dẫn xuất file log và ngưỡng báo động' : 'Log directory and quota alert trigger'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2 text-xs">
                  <div>
                    <label className="block font-semibold text-heading mb-1">
                      {language === 'vi' ? 'Thư mục xuất log LLM' : 'Log Output Directory'}
                    </label>
                    <input
                      type="text"
                      className="form-input w-full font-mono"
                      value={formValues['log.output_dir'] ?? '../log/llm-usage'}
                      onChange={(e) => handleChange('log.output_dir', e.target.value)}
                    />
                    <span className="mt-1 block text-[11px] text-body-subtle">
                      Khóa cấu hình: <code>log.output_dir</code>
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-heading mb-1">
                      {language === 'vi' ? 'Ngưỡng cảnh báo vượt hạn mức (%)' : 'Quota Warning Threshold (%)'}
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="100"
                      className="form-input w-full font-sans tabular-nums"
                      value={formValues['alert.quota_threshold_percent'] ?? '80'}
                      onChange={(e) => handleChange('alert.quota_threshold_percent', e.target.value)}
                    />
                    <span className="mt-1 block text-[11px] text-body-subtle">
                      Khóa cấu hình: <code>alert.quota_threshold_percent</code> (Cảnh báo khi đạt &gt;= 80%)
                    </span>
                  </div>
                </div>
              </section>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="btn btn-brand px-5 py-2.5 text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Save size={14} />
                  <span>
                    {updateMutation.isPending
                      ? (language === 'vi' ? 'Đang lưu cấu hình...' : 'Saving...')
                      : (language === 'vi' ? 'Lưu Cấu Hình Hệ Thống' : 'Save System Settings')}
                  </span>
                </button>
              </div>
            </form>
          )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={language === 'vi' ? 'Xác nhận cập nhật cấu hình hệ thống' : 'Confirm System Settings Update'}
        description={
          language === 'vi'
            ? 'Bạn có chắc chắn muốn lưu các thay đổi cấu hình này? Các giá trị mới sẽ được ghi trực tiếp vào cơ sở dữ liệu PostgreSQL và áp dụng cho toàn bộ các dịch vụ liên quan.'
            : 'Are you sure you want to apply these system configuration updates? New values will be persisted in PostgreSQL and affect runtime services.'
        }
        confirmLabel={language === 'vi' ? 'Đồng ý lưu' : 'Save Changes'}
        cancelLabel={language === 'vi' ? 'Hủy' : 'Cancel'}
        pending={updateMutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSave}
      />
    </AdminShell>
  );
}
