import { SelectMenu } from '../../../shared/components/SelectMenu';
import { Tag } from '../../../shared/components/Tag';
import { useState, type FormEvent } from 'react';
import { Check, X,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { useLanguage } from '../../../shared/i18n/language';
import { getErrorMessage } from '../../../shared/api/api-client';
import { useMyFeedbacks, useSubmitFeedback } from '../hooks/useUserFeedback';
import { useProjects } from '../../projects/hooks/useProjects';

const CATEGORY_OPTIONS = [
  { value: 'BUG_GENERATION', vi: 'Lỗi sinh test / Test gen bug', en: 'Test generation bug' },
  { value: 'COVERAGE_TESTPLAN', vi: 'Độ phủ JaCoCo & Test Plan', en: 'JaCoCo & Test Plan' },
  { value: 'ACCOUNT_QUOTA', vi: 'Quota & Nâng cấp tài khoản', en: 'Quota & Account upgrade' },
  { value: 'FEATURE_REQUEST', vi: 'Góp ý / Đề xuất tính năng mới', en: 'Feature request' },
  { value: 'OTHER', vi: 'Khác / Báo cáo sự cố', en: 'Other / Issue report' },
];

const STATUS_BADGES: Record<string, { vi: string; en: string }> = {
  NEW: {
    vi: 'Mới tiếp nhận',
    en: 'New',
  },
  IN_PROGRESS: {
    vi: 'Đang xử lý',
    en: 'In Progress',
  },
  RESOLVED: {
    vi: 'Đã giải quyết',
    en: 'Resolved',
  },
  CLOSED: {
    vi: 'Đã đóng',
    en: 'Closed',
  },
};

export function UserFeedbackSection() {
  const { t, language } = useLanguage();
  const { data: feedbacks, isLoading: isFeedbacksLoading } = useMyFeedbacks();
  const { data: projects } = useProjects();
  const submitMutation = useSubmitFeedback();

  const [category, setCategory] = useState('BUG_GENERATION');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [projectName, setProjectName] = useState('');
  const [successNotice, setSuccessNotice] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    submitMutation.mutate(
      {
        category,
        title: title.trim(),
        content: content.trim(),
        projectName: projectName.trim() || undefined,
      },
      {
        onSuccess: () => {
          setTitle('');
          setContent('');
          setProjectName('');
          setSuccessNotice(true);
          setTimeout(() => setSuccessNotice(false), 5000);
        },
      }
    );
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? dateStr
        : d.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Khối 1: Form gửi phản hồi cho admin */}
      <div className="rounded-base border border-border-default bg-neutral-primary-soft p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-control bg-brand-softer text-fg-brand-strong">
            <MessageSquare size={16} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-heading font-display">
              {t('Gửi phản hồi cho Quản trị viên', 'Submit Feedback to Admin')}
            </h2>
            <p className="text-xs text-body-subtle mt-0.5">
              {t(
                'Báo cáo lỗi, đề xuất tính năng hoặc thông báo các vấn đề gặp phải để ban quản trị xử lý và hỗ trợ.',
                'Report bugs, suggest features, or inform admins of issues you encounter.'
              )}
            </p>
          </div>
        </div>

        {successNotice && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2 rounded-base border border-border-success-subtle bg-success-soft p-3 text-xs font-medium text-fg-success-strong dark:text-fg-success-strong animate-fade-in"
          >
            <CheckCircle2 size={15} className="shrink-0" />
            <span>
              {t(
                'Cảm ơn bạn! Phản hồi đã được gửi tới Quản trị viên thành công. Chúng tôi sẽ xử lý sớm nhất có thể.',
                'Thank you! Your feedback has been sent to the administrators. We will look into it shortly.'
              )}
            </span>
          </div>
        )}

        {submitMutation.isError && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-base border border-border-danger-subtle bg-danger-soft p-3 text-xs font-medium text-fg-danger-strong animate-fade-in"
          >
            <AlertCircle size={15} className="shrink-0" />
            <span>{getErrorMessage(submitMutation.error)}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="feedback-category"
                className="block text-xs font-semibold text-heading mb-1.5"
              >
                {t('Danh mục vấn đề', 'Category')} <span className="text-fg-danger-strong">*</span>
              </label>
              <SelectMenu
                id="feedback-category"
                data-testid="feedback-category-select"
                value={category}
                onChange={(selectedValue) => setCategory(selectedValue)}
                className="w-full"
                options={CATEGORY_OPTIONS.map((opt) => ({ value: opt.value, label: language === 'vi' ? opt.vi : opt.en }))}
              />
            </div>

            <div>
              <label
                htmlFor="feedback-project"
                className="block text-xs font-semibold text-heading mb-1.5"
              >
                {t('Dự án liên quan (tùy chọn)', 'Related Project (Optional)')}
              </label>
              <input
                id="feedback-project"
                data-testid="feedback-project-input"
                type="text"
                list="user-projects-datalist"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={t('Chọn hoặc nhập tên dự án...', 'Select or enter project name...')}
                className="w-full rounded-base border border-border-default bg-neutral-primary-soft px-3 py-2 text-xs text-body placeholder:text-body-subtle transition-colors"
              />
              {projects && projects.length > 0 && (
                <datalist id="user-projects-datalist">
                  {projects.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="feedback-title"
              className="block text-xs font-semibold text-heading mb-1.5"
            >
              {t('Tiêu đề phản hồi', 'Title')} <span className="text-fg-danger-strong">*</span>
            </label>
            <input
              id="feedback-title"
              data-testid="feedback-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('Tóm tắt vấn đề bạn gặp phải hoặc góp ý...', 'Brief summary of the issue or idea...')}
              className="w-full rounded-base border border-border-default bg-neutral-primary-soft px-3 py-2 text-xs text-body placeholder:text-body-subtle transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="feedback-content"
              className="block text-xs font-semibold text-heading mb-1.5"
            >
              {t('Nội dung chi tiết', 'Detailed Description')} <span className="text-fg-danger-strong">*</span>
            </label>
            <textarea
              id="feedback-content"
              data-testid="feedback-content-input"
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t(
                'Mô tả các bước xảy ra lỗi, mong muốn xử lý hoặc đóng góp ý kiến cải tiến cho hệ thống...',
                'Describe reproduction steps, expected behavior, or suggestions...'
              )}
              className="w-full rounded-base border border-border-default bg-neutral-primary-soft p-3 text-xs text-body placeholder:text-body-subtle transition-colors"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              data-testid="submit-feedback-btn"
              disabled={submitMutation.isPending || !title.trim() || !content.trim()}
              className="btn btn-brand px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>{t('Đang gửi...', 'Submitting...')}</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>{t('Gửi phản hồi', 'Submit Feedback')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Khối 2: Lịch sử phản hồi của người dùng */}
      <div className="rounded-base border border-border-default bg-neutral-primary-soft p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-heading font-display">
              {t('Lịch sử phản hồi đã gửi', 'Submitted Feedbacks History')}
            </h2>
            <p className="text-xs text-body-subtle mt-0.5">
              {t(
                'Theo dõi tiến độ tiếp nhận và phản hồi từ Quản trị viên đối với các yêu cầu của bạn.',
                'Track the status and admin notes for your submitted requests.'
              )}
            </p>
          </div>
          {feedbacks && feedbacks.length > 0 && (
            <Tag className="font-mono tabular-nums">
              {feedbacks.length}
            </Tag>
          )}
        </div>

        {isFeedbacksLoading ? (
          <div className="py-8 text-center text-xs text-body-subtle flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin text-brand" />
            <span>{t('Đang tải lịch sử phản hồi...', 'Loading feedback history...')}</span>
          </div>
        ) : !feedbacks || feedbacks.length === 0 ? (
          <div className="py-8 text-center">
            <Inbox size={28} className="mx-auto text-body-subtle mb-2" />
            <p className="text-xs font-medium text-heading">
              {t('Bạn chưa gửi phản hồi nào', 'No feedbacks submitted yet')}
            </p>
            <p className="mt-1 text-xs text-body-subtle">
              {t('Mọi ý kiến đóng góp hoặc báo lỗi sẽ được lưu lại tại đây.', 'Any feedback or bug reports you submit will appear here.')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((item) => {
              const statusCfg = STATUS_BADGES[item.status] ?? STATUS_BADGES.NEW;
              const matchedCat = CATEGORY_OPTIONS.find((c) => c.value === item.category);
              const catLabel = matchedCat
                ? language === 'vi'
                  ? matchedCat.vi
                  : matchedCat.en
                : item.category;

              return (
                <div
                  key={item.id}
                  className="border-t border-t-border-default p-4 transition-colors hover:border-t-border-default"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag>
                        {catLabel}
                      </Tag>
                      {item.projectName && (
                        <Tag>
                          {item.projectName}
                        </Tag>
                      )}
                      <h4 className="text-sm font-semibold text-heading">{item.title}</h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Tag variant="status" tone={item.status === 'NEW' ? 'brand' : item.status === 'IN_PROGRESS' ? 'warning' : item.status === 'RESOLVED' ? 'success' : 'neutral'} icon={item.status === 'IN_PROGRESS' ? Loader2 : item.status === 'RESOLVED' ? Check : item.status === 'CLOSED' ? X : Clock}>
                        {language === 'vi' ? statusCfg.vi : statusCfg.en}
                      </Tag>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-body leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </p>

                  <div className="mt-3 flex items-center gap-1.5 text-xs text-body-subtle">
                    <Clock size={12} className="text-body-subtle" />
                    <span>{t('Gửi lúc:', 'Submitted at:')} {formatDate(item.createdAt)}</span>
                  </div>

                  {/* Phản hồi từ Quản trị viên (nếu có) */}
                  {item.adminNote && (
                    <div className="mt-3 rounded-base border border-border-brand-subtle bg-brand-softer p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-fg-brand-strong dark:text-fg-brand-strong mb-1">
                        <Sparkles size={13} />
                        <span>{t('Phản hồi từ Quản trị viên:', 'Admin Response:')}</span>
                      </div>
                      <p className="text-heading whitespace-pre-wrap pl-4 border-l-2 border-border-brand-subtle">
                        {item.adminNote}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
