import {
  AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Pencil,
  Save, SlidersHorizontal, Users, X,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../../../shared/api/api-client';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { AdminShell } from '../components/AdminShell';
import { useAdminOverview, useAiRuntimeConfig, useAiRuntimeMutations, useTopUsers } from '../hooks/useAdmin';
import { useLanguage } from '../../../shared/i18n/language';

const STAGE_CONFIGS: Array<{
  stage: string;
  labelVi: string;
  labelEn: string;
  envKey: string;
  defaultLimit: number;
}> = [
  { stage: 'business-rule', labelVi: 'Trích xuất Quy tắc (Business Rule)', labelEn: 'Business Rule Extraction', envKey: 'LLM_MAX_TOKENS_BUSINESS_RULE', defaultLimit: 4096 },
  { stage: 'business-rule-review', labelVi: 'Đánh giá & Thẩm định Rule', labelEn: 'Business Rule Review', envKey: 'LLM_MAX_TOKENS_BUSINESS_RULE_REVIEW', defaultLimit: 4096 },
  { stage: 'test-plan', labelVi: 'Hoạch định Chiến lược (Test Plan)', labelEn: 'Test Plan Synthesis', envKey: 'LLM_MAX_TOKENS_TEST_PLAN', defaultLimit: 6144 },
  { stage: 'test-case', labelVi: 'Thiết kế Ca kiểm thử (Test Case)', labelEn: 'Test Case Design', envKey: 'LLM_MAX_TOKENS_TEST_CASE', defaultLimit: 8192 },
  { stage: 'unit-test', labelVi: 'Sinh Mã Unit Test (JUnit 5)', labelEn: 'Unit Test Code Generation', envKey: 'LLM_MAX_TOKENS_UNIT_TEST', defaultLimit: 12288 },
  { stage: 'coverage-refinement', labelVi: 'Vòng lặp Cải thiện Độ bao phủ', labelEn: 'Coverage Refinement Loop', envKey: 'LLM_MAX_TOKENS_COVERAGE_REFINEMENT', defaultLimit: 6144 },
];

export function AdminAiProvidersPage() {
  const { language } = useLanguage();
  const overview = useAdminOverview();
  const topUsers = useTopUsers(30);
  const aiConfig = useAiRuntimeConfig();
  const mutations = useAiRuntimeMutations();

  // State chỉnh sửa Model AI
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [confirmModelOpen, setConfirmModelOpen] = useState(false);
  const [modelInput, setModelInput] = useState('');
  const [providerInput, setProviderInput] = useState('openai');

  // State chỉnh sửa Stage Token Limits
  const [isEditingLimits, setIsEditingLimits] = useState(false);
  const [confirmLimitsOpen, setConfirmLimitsOpen] = useState(false);
  const [limitsForm, setLimitsForm] = useState<Record<string, number>>({});
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (aiConfig.data?.stageLimits) {
      setLimitsForm(aiConfig.data.stageLimits);
    }
  }, [aiConfig.data?.stageLimits]);

  const handleOpenModelModal = () => {
    setModelInput(aiConfig.data?.model || 'gpt-4o-mini');
    setProviderInput(aiConfig.data?.provider || 'openai');
    setModelModalOpen(true);
  };

  const handleSaveModel = (e: FormEvent) => {
    e.preventDefault();
    if (!modelInput.trim() || mutations.updateModel.isPending) return;
    setConfirmModelOpen(true);
  };

  const handleConfirmSaveModel = () => {
    if (!modelInput.trim() || mutations.updateModel.isPending) return;
    mutations.updateModel.mutate(
      { model: modelInput.trim(), provider: providerInput },
      {
        onSuccess: () => {
          setConfirmModelOpen(false);
          setModelModalOpen(false);
          showSuccess(
            language === 'vi'
              ? `Đã cập nhật mô hình hoạt động thành "${modelInput.trim()}" và áp dụng trực tiếp!`
              : `Active AI model updated to "${modelInput.trim()}" and applied live!`
          );
        },
        onError: () => setConfirmModelOpen(false),
      }
    );
  };

  const handleSaveLimits = (e: FormEvent) => {
    e.preventDefault();
    if (mutations.updateLimits.isPending) return;
    setConfirmLimitsOpen(true);
  };

  const handleConfirmSaveLimits = () => {
    if (mutations.updateLimits.isPending) return;
    mutations.updateLimits.mutate({
      stageLimits: limitsForm,
    }, {
      onSuccess: () => {
        setConfirmLimitsOpen(false);
        setIsEditingLimits(false);
        showSuccess(language === 'vi' ? 'Đã cập nhật và áp dụng trực tiếp giới hạn token theo giai đoạn!' : 'Stage token limits updated and applied live to runtime!');
      },
      onError: () => setConfirmLimitsOpen(false),
    });
  };

  const showSuccess = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const keys = aiConfig.data?.keys ?? [];
  const activeKeysCount = keys.filter((k) => k.configured).length;

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

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-fg-brand">
            AI Inference Architecture
          </span>
          <span className="rounded-md bg-brand-softer px-2 py-0.5 text-[10px] font-sans font-bold text-fg-brand-strong">
            Live Project Runtime
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-heading sm:text-3xl">
          {language === 'vi' ? 'Cổng Mô Hình AI & Bể Khóa Xoay Vòng' : 'AI Providers & Dynamic Key Management'}
        </h1>
        <p className="mt-1 text-xs text-body-subtle">
          {language === 'vi'
            ? 'Quản lý khóa API, giới hạn token từng giai đoạn và theo dõi số liệu gọi mô hình được áp dụng trực tiếp vào dự án.'
            : 'Manage API key pool, stage token limits, and view LLM inference metrics directly connected to project runtime.'}
        </p>
      </div>

      {actionSuccessMessage && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-border-success-subtle bg-success-soft p-3 text-xs font-semibold text-fg-success-strong">
          <CheckCircle2 size={16} />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Module 1: Live Inference Metrics from DB & Runtime */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-4 shadow-xs">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Tổng số lượt gọi LLM (Toàn hệ thống)' : 'Total Recorded LLM Calls'}
            </span>
            <p className="mt-2 font-sans tabular-nums text-2xl sm:text-3xl font-extrabold text-heading">
              {overview.data?.totalLlmCalls?.toLocaleString() ?? '—'}
            </p>
            <p className="mt-1 text-[11px] text-fg-success font-medium flex items-center gap-1">
              <CheckCircle2 size={12} />
              {language === 'vi' ? 'Lượt gọi suy luận thực tế đã lưu DB' : 'Recorded in database'}
            </p>
          </div>

          <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-body-subtle">
                {language === 'vi' ? 'Trạng thái kết nối Gateway' : 'Gateway Status'}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-sans font-bold ${
                  activeKeysCount > 0
                    ? 'bg-success-soft text-fg-success-strong border border-border-success-subtle'
                    : 'bg-warning-soft text-fg-warning border border-border-warning-subtle'
                }`}
              >
                {activeKeysCount > 0 ? (language === 'vi' ? 'SẴN SÀNG' : 'READY') : (language === 'vi' ? 'CHƯA CẤU HÌNH KEY' : 'NO KEYS')}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${activeKeysCount > 0 ? 'bg-success animate-pulse' : 'bg-warning'}`} />
              <span className="font-sans tabular-nums text-xl font-bold text-heading">
                {activeKeysCount > 0
                  ? (language === 'vi' ? `${activeKeysCount} / 8 khóa sẵn sàng` : `${activeKeysCount} / 8 keys ready`)
                  : (language === 'vi' ? 'Cần cấu hình ít nhất 1 key' : 'Configure at least 1 key')}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-body-subtle truncate" title={aiConfig.data?.endpoint}>
              <span className="font-semibold text-fg-brand uppercase">{aiConfig.data?.provider || 'openai'}</span> · {aiConfig.data?.endpoint || 'https://api.openai.com/v1/chat/completions'}
            </p>
          </div>

          <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-body-subtle">
                  {language === 'vi' ? 'Mô hình hoạt động & Suy luận' : 'Active Model & Concurrency'}
                </span>
                <button
                  type="button"
                  onClick={handleOpenModelModal}
                  className="inline-flex items-center gap-1 rounded-lg border border-border-default bg-neutral-secondary-soft px-2 py-0.5 text-xs font-bold text-fg-brand hover:bg-brand-softer hover:border-brand-subtle transition-colors shadow-2xs"
                  title={language === 'vi' ? 'Chọn mô hình LLM tương ứng với API key' : 'Select AI model matching API key'}
                >
                  <Pencil size={11} />
                  <span>{language === 'vi' ? 'Đổi mô hình' : 'Change Model'}</span>
                </button>
              </div>
              <p className="mt-2 font-sans tabular-nums text-xl font-bold text-heading text-fg-brand">
                {aiConfig.data?.model || 'gpt-4o-mini'}
              </p>
            </div>
            <p className="mt-2 text-[11px] text-body-subtle border-t border-border-default-subtle pt-2">
              {aiConfig.data?.batchConcurrency ?? 4} {language === 'vi' ? 'luồng chạy song song (GREYTEST_LLM_BATCH_CONCURRENCY)' : 'concurrent batches'}
            </p>
          </div>
        </section>

        {/* Module 2: Bể Khóa API Xoay Vòng (Read-only Runtime Pool) */}
        <section className="rounded-xl border border-border-default bg-neutral-primary-soft shadow-xs overflow-hidden">
          <div className="border-b border-border-default p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-fg-brand" />
              <div>
                <h3 className="text-sm font-bold text-heading">
                  {language === 'vi' ? 'Bể Khóa API Xoay Vòng' : 'API Key Rotation Pool'}
                </h3>
                <p className="text-xs text-body-subtle">
                  {language === 'vi'
                    ? 'Danh sách các biến môi trường và trạng thái khóa API trong rotation pool.'
                    : 'List of environment variables and API key statuses in the rotation pool.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-neutral-secondary px-3 py-1 text-xs font-semibold text-body">
                {activeKeysCount} / 8 {language === 'vi' ? 'vị trí đã nạp key' : 'slots active'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border-default bg-neutral-secondary-soft font-bold uppercase text-body-subtle">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">{language === 'vi' ? 'Biến môi trường' : 'Env Variable'}</th>
                  <th className="p-3">{language === 'vi' ? 'Vai trò trong Rotation Pool' : 'Pool Role'}</th>
                  <th className="p-3">{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default-subtle">
                {keys.map((k) => (
                  <tr key={k.slot} className="hover:bg-neutral-secondary-soft/50 transition-colors">
                    <td className="p-3 font-sans tabular-nums font-bold text-body-subtle">{k.slot + 1}</td>
                    <td className="p-3 font-mono font-bold text-heading">{k.envVar}</td>
                    <td className="p-3 text-body">{k.role}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2.5 py-0.5 font-sans text-[10px] font-bold ${
                        k.configured
                          ? 'bg-success-soft text-fg-success-strong'
                          : 'bg-neutral-secondary text-body-subtle'
                      }`}>
                        {k.configured ? (language === 'vi' ? 'ĐANG KÍCH HOẠT' : 'ACTIVE') : (language === 'vi' ? 'TRỐNG' : 'EMPTY')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Module 3: Giới Hạn Token Theo Giai Đoạn (Edit & Apply Directly) */}
        <section className="rounded-xl border border-border-default bg-neutral-primary-soft shadow-xs overflow-hidden">
          <div className="border-b border-border-default p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-fg-brand" />
              <div>
                <h3 className="text-sm font-bold text-heading">
                  {language === 'vi' ? 'Giới Hạn Token Theo Giai Đoạn' : 'Stage Token Limits'}
                </h3>
                <p className="text-xs text-body-subtle">
                  {language === 'vi'
                    ? 'Tùy chỉnh trần token cho từng giai đoạn sinh test. Giá trị lưu được nạp thẳng vào runtime của dự án.'
                    : 'Customize token output ceilings per pipeline stage. Saved values apply directly to runtime.'}
                </p>
              </div>
            </div>
            <div>
              {!isEditingLimits ? (
                <button
                  type="button"
                  onClick={() => setIsEditingLimits(true)}
                  className="btn btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                >
                  <Pencil size={13} />
                  <span>{language === 'vi' ? 'Chỉnh sửa giới hạn' : 'Edit Token Limits'}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingLimits(false);
                      if (aiConfig.data?.stageLimits) setLimitsForm(aiConfig.data.stageLimits);
                    }}
                    className="btn btn-secondary px-3 py-1.5 text-xs font-semibold"
                  >
                    {language === 'vi' ? 'Hủy' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveLimits}
                    disabled={mutations.updateLimits.isPending}
                    className="btn btn-brand inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold shadow-xs"
                  >
                    <Save size={13} />
                    <span>{mutations.updateLimits.isPending ? 'Đang lưu...' : (language === 'vi' ? 'Lưu giới hạn Token' : 'Save Limits')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="divide-y divide-border-default-subtle">
            {STAGE_CONFIGS.map((cfg) => {
              const currentVal = limitsForm[cfg.stage] ?? cfg.defaultLimit;

              return (
                <div key={cfg.stage} className="flex flex-wrap items-center justify-between p-3.5 text-xs hover:bg-neutral-secondary-soft/50 transition-colors">
                  <div>
                    <span className="font-semibold text-heading">
                      {language === 'vi' ? cfg.labelVi : cfg.labelEn}
                    </span>
                    <p className="font-mono text-[11px] text-body-subtle mt-0.5">{cfg.envKey}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isEditingLimits ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={512}
                          max={32768}
                          step={512}
                          className="form-input h-8 w-28 font-sans tabular-nums text-xs text-right"
                          value={currentVal}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setLimitsForm((prev) => ({ ...prev, [cfg.stage]: val }));
                          }}
                        />
                        <span className="font-sans text-body-subtle text-xs">tokens</span>
                      </div>
                    ) : (
                      <span className="rounded-lg bg-neutral-secondary px-3 py-1 font-sans tabular-nums font-bold text-heading">
                        {currentVal?.toLocaleString()} tokens
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {mutations.updateLimits?.error && (
            <p role="alert" className="mt-3 text-xs text-fg-danger-strong bg-danger-soft p-2.5 rounded-lg">
              {getErrorMessage(mutations.updateLimits.error)}
            </p>
          )}
        </section>

        {/* Module 4: Top Người Dùng Gọi LLM Nhiều Nhất */}
        <section className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border-default pb-3">
            <Users size={16} className="text-fg-brand" />
            <h3 className="text-sm font-bold text-heading">
              {language === 'vi' ? 'Top Người Dùng Gọi LLM Nhiều Nhất' : 'Top LLM Users'}
            </h3>
          </div>
          <div className="mt-4 space-y-2">
            {(topUsers.data ?? []).map((u, i) => (
              <div key={u.userId} className="flex items-center justify-between rounded-lg border border-border-default-subtle bg-neutral-secondary-soft/40 p-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-softer font-sans tabular-nums text-xs font-bold text-fg-brand">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-heading">{u.email}</span>
                </div>
                <div className="font-sans tabular-nums font-bold text-heading">
                  {u.totalLlmCalls?.toLocaleString()} <span className="font-normal text-body-subtle">calls</span>
                </div>
              </div>
            ))}
            {!topUsers.data?.length && (
              <p className="py-4 text-center text-xs text-body-subtle">
                {language === 'vi' ? 'Chưa có lượt gọi LLM nào được ghi nhận.' : 'No LLM calls recorded in period.'}
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Confirm Dialog Lưu Giới hạn Token theo giai đoạn */}
      <ConfirmDialog
        open={confirmLimitsOpen}
        variant="brand"
        title={language === 'vi' ? 'Xác nhận cập nhật Giới hạn Token?' : 'Confirm Token Limits Update?'}
        description={
          language === 'vi'
            ? 'Bạn có chắc muốn lưu cấu hình giới hạn token cho từng giai đoạn? Cấu hình mới sẽ áp dụng trực tiếp cho các tác vụ suy luận tiếp theo.'
            : 'Are you sure you want to save stage token limits? Changes will apply live to subsequent generation tasks.'
        }
        confirmLabel={language === 'vi' ? 'Xác nhận lưu' : 'Confirm Save'}
        cancelLabel={language === 'vi' ? 'Hủy' : 'Cancel'}
        pending={mutations.updateLimits.isPending}
        onCancel={() => setConfirmLimitsOpen(false)}
        onConfirm={handleConfirmSaveLimits}
      />

      {/* Confirm Dialog Thay đổi Model AI */}
      <ConfirmDialog
        open={confirmModelOpen}
        variant="brand"
        title={language === 'vi' ? 'Xác nhận thay đổi Mô hình AI?' : 'Confirm AI Model Change?'}
        description={
          language === 'vi'
            ? `Bạn có chắc muốn áp dụng mô hình "${modelInput}" (Nhà cung cấp: ${providerInput}) cho toàn bộ dự án? Thay đổi này sẽ ảnh hưởng trực tiếp đến tất cả tác vụ sinh kiểm thử.`
            : `Are you sure you want to apply AI model "${modelInput}" (${providerInput}) across all generation stages?`
        }
        confirmLabel={language === 'vi' ? 'Xác nhận áp dụng' : 'Confirm Apply'}
        cancelLabel={language === 'vi' ? 'Hủy' : 'Cancel'}
        pending={mutations.updateModel.isPending}
        onCancel={() => setConfirmModelOpen(false)}
        onConfirm={handleConfirmSaveModel}
      />

      {/* Modal Lựa chọn & Cấu hình Mô hình Hoạt động */}
      {modelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-border-default bg-neutral-primary p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-fg-brand" />
                <h3 className="text-base font-bold text-heading">
                  {language === 'vi' ? 'Chọn Mô Hình AI Hoạt Động Cho Dự Án' : 'Select Active AI Model'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModelModalOpen(false)}
                className="text-body-subtle hover:text-heading"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModel} className="mt-4 space-y-4">
              {mutations.updateModel.error && (
                <div className="flex items-center gap-2 rounded-lg border border-border-danger-subtle bg-danger-soft p-3 text-xs font-semibold text-fg-danger-strong">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{getErrorMessage(mutations.updateModel.error)}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-body-subtle">
                  {language === 'vi' ? 'Nhà cung cấp dịch vụ LLM' : 'LLM Service Provider'}
                </label>
                <div className="mt-1.5 flex items-center justify-between rounded-lg border border-border-default bg-neutral-secondary-soft/70 p-3">
                  <div>
                    <span className="font-sans text-xs font-bold uppercase text-heading">
                      {providerInput === 'google' ? 'Google Gemini' : 'OpenAI Gateway'}
                    </span>
                    <p className="text-[11px] text-body-subtle">
                      {language === 'vi'
                        ? 'Đang hoạt động trực tiếp trong runtime của hệ thống'
                        : 'Currently active in server runtime'}
                    </p>
                  </div>
                  <span className="rounded-full bg-success-soft border border-border-success-subtle px-2 py-0.5 text-[10px] font-bold text-fg-success-strong">
                    {language === 'vi' ? 'RUNTIME ACTIVE' : 'ACTIVE'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-body-subtle">
                  {language === 'vi' ? 'Mô hình gợi ý phù hợp với API Key' : 'Recommended Models for Active Key'}
                </label>
                <div className="mt-1.5 space-y-1.5">
                  {providerInput === 'openai' ? (
                    <>
                      {[
                        {
                          id: 'gpt-4o-mini',
                          name: 'gpt-4o-mini',
                          badge: 'Khuyên dùng',
                          desc: 'Tốc độ cao, tối ưu quota, chuẩn cú pháp Spring Boot JUnit 5.',
                        },
                        {
                          id: 'gpt-4o',
                          name: 'gpt-4o',
                          badge: 'Chất lượng cao',
                          desc: 'Khả năng phân tích AST và logic phức tạp mạnh mẽ nhất.',
                        },
                        {
                          id: 'gpt-4-turbo',
                          name: 'gpt-4-turbo',
                          badge: 'Reasoning',
                          desc: 'Mô hình reasoning chuyên sâu cho các ca kiểm thử phức tạp.',
                        },
                        {
                          id: 'gpt-3.5-turbo',
                          name: 'gpt-3.5-turbo',
                          badge: 'Tiết kiệm',
                          desc: 'Chi phí token thấp, phù hợp các bài kiểm thử cơ bản.',
                        },
                      ].map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setModelInput(item.id)}
                          className={`cursor-pointer rounded-lg border p-2.5 text-xs transition-all ${
                            modelInput === item.id
                              ? 'border-brand bg-brand-softer text-heading ring-1 ring-brand'
                              : 'border-border-default bg-neutral-primary-soft text-body hover:bg-neutral-secondary-soft'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-sans font-bold">{item.name}</span>
                            <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-fg-brand">
                              {item.badge}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-body-subtle">{item.desc}</p>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {[
                        {
                          id: 'gemini-1.5-flash',
                          name: 'gemini-1.5-flash',
                          badge: 'Khuyên dùng',
                          desc: 'Tốc độ phản hồi cực nhanh, độ trễ thấp, sinh test tức thì.',
                        },
                        {
                          id: 'gemini-1.5-pro',
                          name: 'gemini-1.5-pro',
                          badge: 'Context 1M tokens',
                          desc: 'Cửa sổ ngữ cảnh cực lớn, hỗ trợ phân tích toàn bộ project.',
                        },
                      ].map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setModelInput(item.id)}
                          className={`cursor-pointer rounded-lg border p-2.5 text-xs transition-all ${
                            modelInput === item.id
                              ? 'border-brand bg-brand-softer text-heading ring-1 ring-brand'
                              : 'border-border-default bg-neutral-primary-soft text-body hover:bg-neutral-secondary-soft'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-sans font-bold">{item.name}</span>
                            <span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-fg-brand">
                              {item.badge}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-body-subtle">{item.desc}</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-body-subtle">
                  {language === 'vi' ? 'Tên mô hình cụ thể (Model Identifier)' : 'Specific Model Identifier'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="ví dụ: gpt-4o-mini hoặc gemini-1.5-flash"
                  className="form-input mt-1 w-full font-mono text-xs"
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-body-subtle">
                  {language === 'vi'
                    ? 'Bạn có thể chọn từ danh sách trên hoặc tự gõ tên model bất kỳ được hỗ trợ bởi API key của bạn.'
                    : 'Select a preset above or type any custom model ID supported by your API key.'}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setModelModalOpen(false)}
                  className="btn btn-secondary px-4 py-2 text-xs font-semibold"
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={mutations.updateModel.isPending || !modelInput.trim()}
                  className="btn btn-brand inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold shadow-xs"
                >
                  <Save size={14} />
                  <span>
                    {mutations.updateModel.isPending
                      ? language === 'vi' ? 'Đang áp dụng...' : 'Applying...'
                      : language === 'vi' ? 'Lưu & Áp dụng trực tiếp' : 'Save & Apply Live'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
