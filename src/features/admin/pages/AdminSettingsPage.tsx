import { AlertTriangle, ArrowLeft, CheckCircle2, CircleDot, CreditCard, RefreshCw, Save, Settings } from 'lucide-react';
import { Tag } from '../../../shared/components/Tag';
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
};

const PRESET_AI_MODELS = new Set([
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gpt-4o',
  'gpt-4o-mini',
  'o3-mini',
  'o1',
]);

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

  // Giữ model runtime custom từ server hiển thị trong dropdown ngay cả khi admin tạm chọn preset khác.
  const runtimeActiveModels = Array.from(
    new Set(
      [settingsQuery.data?.settings?.['ai.model'], formValues['ai.model']]
        .filter((model): model is string => typeof model === 'string' && model.length > 0)
        .filter((model) => !PRESET_AI_MODELS.has(model)),
    ),
  );

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
    // Chỉ gửi ô admin thực sự đã sửa, để lưu VNPay không vô tình ghi đè model AI đang chạy.
    const changed = Object.fromEntries(
      Object.entries(customValues).filter(([key, value]) => value !== (settingsQuery.data?.settings?.[key] ?? DEFAULT_SETTINGS[key])),
    );
    if (Object.keys(changed).length === 0) {
      setConfirmOpen(false);
      setSuccessMsg(language === 'vi' ? 'Không có thay đổi nào để lưu.' : 'Nothing changed.');
      return;
    }
    updateMutation.mutate(
      { settings: changed },
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
            <span className="text-xs font-semibold text-body-subtle">
              System Configuration & Health
            </span>
            <Tag variant="status" tone="brand" icon={CircleDot}>
              PostgreSQL, system_setting
            </Tag>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-heading sm:text-3xl">
            {language === 'vi' ? 'Cấu hình hệ thống (tham số vận hành)' : "System configuration settings"}
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
          className="btn btn-secondary rounded-control inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
        >
          <RefreshCw
            size={13}
            className={settingsQuery.isFetching ? 'animate-spin text-brand' : ''}
          />
          <span>{language === 'vi' ? 'Làm mới' : 'Reload'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 flex items-center justify-between rounded-base border border-border-success-subtle bg-success-soft p-3.5 text-xs font-semibold text-fg-success-strong shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="btn btn-ghost rounded-control underline text-xs cursor-pointer">
            Đóng
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 flex items-center justify-between rounded-base border border-border-danger-subtle bg-danger-soft p-3.5 text-xs font-semibold text-fg-danger-strong shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="btn btn-ghost rounded-control underline text-xs cursor-pointer">
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
              <section className="rounded-base border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
                <div className="flex items-center gap-2 border-b border-border-default pb-3">
                  <Settings size={16} className="text-fg-brand-strong" />
                  <div>
                    <h3 className="text-sm font-bold text-heading">
                      {language === 'vi' ? 'Cấu hình mô hình AI & sinh test' : "AI inference & model configuration"}
                    </h3>
                    <p className="text-xs text-body-subtle">
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
                      {runtimeActiveModels.length > 0 && (
                        <optgroup label="Runtime Active">
                          {runtimeActiveModels.map((model) => (
                            <option key={model} value={model}>
                              {model} (Runtime Active)
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Google Gemini">
                        <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (Recommended)</option>
                        <option value="gemini-1.5-flash">Google Gemini 1.5 Flash (Fast)</option>
                        <option value="gemini-2.0-flash">Google Gemini 2.0 Flash</option>
                      </optgroup>
                      <optgroup label="OpenAI">
                        <option value="gpt-4o">OpenAI GPT-4o (Chất lượng cao)</option>
                        <option value="gpt-4o-mini">OpenAI GPT-4o Mini (Khuyên dùng)</option>
                        <option value="o3-mini">OpenAI o3-mini (Reasoning Code)</option>
                        <option value="o1">OpenAI o1 (Deep Reasoning)</option>
                      </optgroup>
                    </select>
                    <span className="mt-1 block text-xs text-body-subtle">
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
                    <span className="mt-1 block text-xs text-body-subtle">
                      Khóa cấu hình: <code>ai.batch_concurrency</code> (1 - 10 workers)
                    </span>
                  </div>
                </div>
              </section>

              {/* VNPay Sandbox Settings */}
              <section className="rounded-base border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
                <div className="flex items-center gap-2 border-b border-border-default pb-3">
                  <CreditCard size={16} className="text-fg-brand-strong" />
                  <div>
                    <h3 className="text-sm font-bold text-heading">
                      {language === 'vi' ? 'Cổng thanh toán VNPay Sandbox' : "VNPay payment sandbox"}
                    </h3>
                    <p className="text-xs text-body-subtle">
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
                    <span className="mt-1 block text-xs text-body-subtle">
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
                    <span className="mt-1 block text-xs text-body-subtle">
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
                    <span className="mt-1 block text-xs text-body-subtle">
                      Khóa cấu hình: <code>vnpay.url</code>
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
                      : (language === 'vi' ? 'Lưu cấu hình hệ thống' : 'Save System Settings')}
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
