import {
  ArrowLeft, CheckCircle2, Clock, MessageSquare,
  MessageSquareText, Pencil, Plus,
  Save, Search, Trash2, X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../../../shared/api/api-client';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { EmptyState } from '../../../shared/components/EmptyState';
import { AdminShell } from '../components/AdminShell';
import { useFeedbackMutations, useFeedbackStats, useFeedbacks } from '../hooks/useAdmin';
import { useLanguage } from '../../../shared/i18n/language';
import type { FeedbackCategory, FeedbackStatus, UserFeedback } from '../types';

const CATEGORY_MAP: Record<string, { labelVi: string; labelEn: string; color: string }> = {
  BUG_GENERATION: {
    labelVi: 'Lỗi sinh test',
    labelEn: 'Generation Bug',
    color: 'bg-danger-soft text-fg-danger-strong border-border-danger-subtle',
  },
  COVERAGE_TESTPLAN: {
    labelVi: 'Độ phủ & Test Plan',
    labelEn: 'Coverage & Test Plan',
    color: 'bg-brand-softer text-fg-brand-strong border-border-brand-subtle',
  },
  ACCOUNT_QUOTA: {
    labelVi: 'Quota & Tài khoản',
    labelEn: 'Quota & Account',
    color: 'bg-warning-soft text-fg-warning border-border-warning-subtle',
  },
  FEATURE_REQUEST: {
    labelVi: 'Đề xuất tính năng',
    labelEn: 'Feature Request',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  OTHER: {
    labelVi: 'Khác',
    labelEn: 'Other',
    color: 'bg-neutral-secondary text-body-subtle border-border-default',
  },
};

const STATUS_MAP: Record<FeedbackStatus, { labelVi: string; labelEn: string; badgeClass: string; dotClass: string }> = {
  NEW: {
    labelVi: 'Mới tiếp nhận',
    labelEn: 'New',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    dotClass: 'bg-blue-500',
  },
  IN_PROGRESS: {
    labelVi: 'Đang xử lý',
    labelEn: 'In Progress',
    badgeClass: 'bg-warning-soft text-fg-warning border-border-warning-subtle',
    dotClass: 'bg-amber-500 animate-pulse',
  },
  RESOLVED: {
    labelVi: 'Đã giải quyết',
    labelEn: 'Resolved',
    badgeClass: 'bg-success-soft text-fg-success-strong border-border-success-subtle',
    dotClass: 'bg-success',
  },
  REJECTED: {
    labelVi: 'Từ chối',
    labelEn: 'Rejected',
    badgeClass: 'bg-danger-soft text-fg-danger-strong border-border-danger-subtle',
    dotClass: 'bg-danger',
  },
  CLOSED: {
    labelVi: 'Đã đóng',
    labelEn: 'Closed',
    badgeClass: 'bg-neutral-secondary text-body-subtle border-border-default',
    dotClass: 'bg-neutral-400',
  },
};

export function AdminFeedbackPage() {
  const { language } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const feedbacksQuery = useFeedbacks(statusFilter || undefined, categoryFilter || undefined, searchTerm || undefined);
  const statsQuery = useFeedbackStats();
  const mutations = useFeedbackMutations();

  // State for Edit/Respond Modal
  const [selectedFeedback, setSelectedFeedback] = useState<UserFeedback | null>(null);
  const [editStatus, setEditStatus] = useState<FeedbackStatus>('NEW');
  const [adminNote, setAdminNote] = useState('');
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false);

  // State for Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [createCategory, setCreateCategory] = useState<FeedbackCategory>('FEATURE_REQUEST');
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createProjectName, setCreateProjectName] = useState('');

  // Delete Target
  const [deleteTarget, setDeleteTarget] = useState<UserFeedback | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const displayedFeedbacks = feedbacksQuery.data ?? [];

  const handleOpenEdit = (fb: UserFeedback) => {
    setActionError(null);
    setSelectedFeedback(fb);
    setEditStatus(fb.status);
    setAdminNote(fb.adminNote || '');
  };

  const handleSaveStatus = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback) return;
    setActionError(null);
    setConfirmStatusOpen(true);
  };

  const handleConfirmSaveStatus = () => {
    if (!selectedFeedback) return;
    setActionError(null);

    mutations.updateStatus.mutate(
      {
        id: selectedFeedback.id,
        data: {
          status: editStatus,
          adminNote: adminNote.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setConfirmStatusOpen(false);
          setSelectedFeedback(null);
        },
        onError: (err) => {
          setConfirmStatusOpen(false);
          setActionError(getErrorMessage(err));
        },
      },
    );
  };

  const handleCreateFeedback = (e: FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!createTitle.trim()) {
      setActionError(language === 'vi' ? 'Tiêu đề không được để trống' : 'Title is required');
      return;
    }
    setConfirmCreateOpen(true);
  };

  const handleConfirmCreateFeedback = () => {
    setActionError(null);
    mutations.create.mutate(
      {
        category: createCategory,
        title: createTitle.trim(),
        content: createContent.trim(),
        projectName: createProjectName.trim() || undefined,
      },
      {
        onSuccess: () => {
          setConfirmCreateOpen(false);
          setCreateModalOpen(false);
          setCreateTitle('');
          setCreateContent('');
          setCreateProjectName('');
        },
        onError: (err) => {
          setConfirmCreateOpen(false);
          setActionError(getErrorMessage(err));
        },
      },
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    mutations.deleteFeedback.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (err) => {
        setActionError(getErrorMessage(err));
        setDeleteTarget(null);
      },
    });
  };

  const stats = statsQuery.data ?? { total: 0, pending: 0, resolved: 0, averageRating: 5.0 };

  return (
    <AdminShell>
      {/* Top back navigation */}
      <div className="mb-4">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-body-subtle hover:text-heading transition-colors"
        >
          <ArrowLeft size={14} />
          <span>{language === 'vi' ? 'Quay lại Dashboard' : 'Back to Dashboard'}</span>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-fg-brand">
              User Experience & Support
            </span>
            <span className="rounded-md bg-brand-softer px-2 py-0.5 text-[10px] font-sans font-bold text-fg-brand-strong">
              FeedbackGateway
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-heading sm:text-3xl">
            {language === 'vi' ? 'Quản Lý Phản Hồi & Ý Kiến Người Dùng' : 'User Feedback & Support Desk'}
          </h1>
          <p className="mt-1 text-xs text-body-subtle">
            {language === 'vi'
              ? 'Theo dõi, phân loại và phản hồi các đánh giá, báo cáo lỗi từ người dùng trên toàn hệ thống.'
              : 'Review, triage and resolve user inquiries, ratings, and issue reports across GreyTest.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setActionError(null);
            setCreateModalOpen(true);
          }}
          className="btn btn-brand px-3.5 py-2 text-xs flex items-center gap-1.5 shadow-2xs"
        >
          <Plus size={14} />
          <span>{language === 'vi' ? 'Tạo Phản Hồi Thử Nghiệm' : 'Submit Feedback'}</span>
        </button>
      </div>

      {/* 3 Summary Metric Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Tổng phản hồi' : 'Total Feedbacks'}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-softer text-fg-brand">
              <MessageSquare size={16} />
            </span>
          </div>
          <p className="mt-2 font-sans tabular-nums text-2xl font-bold text-heading">{stats.total}</p>
          <span className="text-[11px] text-body-subtle">Được ghi nhận từ người dùng</span>
        </div>

        <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Đang chờ xử lý' : 'Pending & In Progress'}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-soft text-fg-warning">
              <Clock size={16} />
            </span>
          </div>
          <p className="mt-2 font-sans tabular-nums text-2xl font-bold text-fg-warning">{stats.pending}</p>
          <span className="text-[11px] text-body-subtle">Cần quản trị viên kiểm tra</span>
        </div>

        <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Đã giải quyết' : 'Resolved'}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-soft text-fg-success-strong">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <p className="mt-2 font-sans tabular-nums text-2xl font-bold text-fg-success-strong">{stats.resolved}</p>
          <span className="text-[11px] text-body-subtle">Đã khắc phục và phản hồi</span>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 rounded-lg border border-border-danger-subtle bg-danger-soft p-3 text-xs text-fg-danger-strong flex items-center justify-between">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="font-bold underline ml-2">
            Đóng
          </button>
        </div>
      )}

      {/* Main Feedback Table Container */}
      <div className="rounded-xl border border-border-default bg-neutral-primary-soft shadow-xs overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="border-b border-border-default p-4 flex flex-wrap items-center justify-between gap-3 bg-neutral-primary-soft">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-body-subtle" />
              <input
                type="text"
                placeholder={language === 'vi' ? 'Tìm theo email, tiêu đề, nội dung...' : 'Search feedbacks...'}
                className="h-10 w-full rounded-lg border border-border-default bg-neutral-primary pl-9 pr-3 text-xs text-heading placeholder:text-body-subtle shadow-2xs focus:border-brand focus:outline-none leading-normal"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              aria-label="Lọc trạng thái"
              className="h-10 min-h-[40px] rounded-lg border border-border-default-medium bg-neutral-primary px-3 py-2 text-xs font-sans text-heading shadow-2xs focus:border-brand focus:outline-none w-auto min-w-[140px] cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{language === 'vi' ? 'Mọi trạng thái' : 'All Status'}</option>
              <option value="NEW">Mới tiếp nhận</option>
              <option value="IN_PROGRESS">Đang xử lý</option>
              <option value="RESOLVED">Đã giải quyết</option>
              <option value="REJECTED">{language === 'vi' ? 'Từ chối' : 'Rejected'}</option>
              <option value="CLOSED">Đã đóng</option>
            </select>

            <select
              aria-label="Lọc danh mục"
              className="h-10 min-h-[40px] rounded-lg border border-border-default-medium bg-neutral-primary px-3 py-2 text-xs font-sans text-heading shadow-2xs focus:border-brand focus:outline-none w-auto min-w-[160px] cursor-pointer"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">{language === 'vi' ? 'Mọi danh mục' : 'All Categories'}</option>
              <option value="BUG_GENERATION">Lỗi sinh test</option>
              <option value="COVERAGE_TESTPLAN">Độ phủ & Test Plan</option>
              <option value="ACCOUNT_QUOTA">Quota & Tài khoản</option>
              <option value="FEATURE_REQUEST">Đề xuất tính năng</option>
              <option value="OTHER">Khác</option>
            </select>

            {(statusFilter || categoryFilter || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('');
                  setCategoryFilter('');
                  setSearchTerm('');
                }}
                className="btn btn-secondary h-10 px-3 text-xs whitespace-nowrap"
              >
                {language === 'vi' ? 'Xóa lọc' : 'Clear'}
              </button>
            )}
          </div>

          <span className="flex items-center gap-1 font-sans tabular-nums text-xs text-body-subtle">
            <CheckCircle2 size={13} className="text-fg-brand" />
            {displayedFeedbacks.length} {language === 'vi' ? 'phản hồi' : 'entries'}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border-default bg-neutral-secondary-soft font-bold uppercase text-body-subtle">
              <tr>
                <th className="p-3.5">{language === 'vi' ? 'Người Gửi' : 'Sender'}</th>
                <th className="p-3.5 min-w-[240px]">{language === 'vi' ? 'Nội Dung Phản Hồi' : 'Feedback Content'}</th>
                <th className="p-3.5">{language === 'vi' ? 'Phân Loại' : 'Category'}</th>
                <th className="p-3.5">{language === 'vi' ? 'Thời Gian' : 'Submitted At'}</th>
                <th className="p-3.5">{language === 'vi' ? 'Trạng Thái' : 'Status'}</th>
                <th className="p-3.5">{language === 'vi' ? 'Ghi Chú Admin' : 'Admin Response'}</th>
                <th className="p-3.5 text-right">{language === 'vi' ? 'Thao Tác' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default-subtle">
              {displayedFeedbacks.map((fb) => {
                const cat = CATEGORY_MAP[fb.category] || CATEGORY_MAP.OTHER;
                const status = STATUS_MAP[fb.status] || STATUS_MAP.NEW;

                return (
                  <tr key={fb.id} className="hover:bg-neutral-secondary-soft/50 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-softer font-sans text-xs font-bold text-fg-brand">
                          {(fb.userName || fb.userEmail).charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold text-heading text-xs">{fb.userName || 'Người dùng'}</p>
                          <p className="text-[11px] text-body-subtle">{fb.userEmail}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <p className="font-bold text-heading text-xs">{fb.title}</p>
                      <p className="mt-0.5 text-body-subtle text-[11px] line-clamp-2 max-w-sm" title={fb.content}>
                        {fb.content}
                      </p>
                      {fb.projectName && (
                        <span className="mt-1 inline-block rounded-md bg-neutral-secondary px-1.5 py-0.5 text-[10px] text-body-subtle font-sans">
                          {fb.projectName}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-[10.5px] font-bold ${cat.color}`}>
                        {language === 'vi' ? cat.labelVi : cat.labelEn}
                      </span>
                    </td>

                    <td className="p-3.5 text-body-subtle whitespace-nowrap text-[11px]">
                      {new Date(fb.createdAt).toLocaleString('vi-VN')}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${status.badgeClass}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
                        <span>{language === 'vi' ? status.labelVi : status.labelEn}</span>
                      </span>
                    </td>

                    <td className="p-3.5 max-w-[200px]">
                      {fb.adminNote ? (
                        <p className="text-[11px] text-heading italic line-clamp-2" title={fb.adminNote}>
                          "{fb.adminNote}"
                        </p>
                      ) : (
                        <span className="text-[10px] text-body-subtle italic">Chưa có phản hồi</span>
                      )}
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          className="btn btn-secondary px-2.5 py-1 text-xs flex items-center gap-1"
                          onClick={() => handleOpenEdit(fb)}
                          title="Xử lý và phản hồi cho người dùng"
                        >
                          <Pencil size={12} />
                          <span>{language === 'vi' ? 'Xử lý' : 'Triage'}</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary px-2 py-1 text-xs text-danger hover:bg-danger-soft"
                          onClick={() => setDeleteTarget(fb)}
                          title="Xóa phản hồi"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!displayedFeedbacks.length && (
            <div className="p-8">
              <EmptyState
                icon={MessageSquareText}
                title="Không có phản hồi nào"
                hint="Chưa có phản hồi phù hợp với tiêu chí tìm kiếm hiện tại."
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal Xử Lý / Phản Hồi Feedback */}
      {selectedFeedback && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-primary/75 px-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && setSelectedFeedback(null)}
        >
          <form
            onSubmit={handleSaveStatus}
            className="w-full max-w-md rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xl space-y-4"
          >
            <div className="flex items-start justify-between border-b border-border-default pb-3">
              <div>
                <div className="flex items-center gap-2 text-fg-brand">
                  <MessageSquareText size={17} />
                  <span className="text-xs font-bold uppercase tracking-wide">Xử Lý Phản Hồi</span>
                </div>
                <h2 className="mt-1 text-sm font-bold text-heading line-clamp-1">{selectedFeedback.title}</h2>
              </div>
              <button
                type="button"
                className="btn btn-secondary p-1"
                onClick={() => setSelectedFeedback(null)}
              >
                <X size={14} />
              </button>
            </div>

            <div className="rounded-lg border border-border-default-subtle bg-neutral-secondary-soft/50 p-3 text-xs space-y-1.5">
              <div className="text-body-subtle">
                <span>Người gửi: <strong>{selectedFeedback.userEmail}</strong></span>
              </div>
              <p className="text-heading text-xs mt-1">{selectedFeedback.content}</p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Cập nhật trạng thái</span>
                <select
                  className="form-input"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as FeedbackStatus)}
                >
                  <option value="NEW">Mới tiếp nhận (NEW)</option>
                  <option value="IN_PROGRESS">Đang xử lý (IN_PROGRESS)</option>
                  <option value="RESOLVED">Đã giải quyết (RESOLVED)</option>
                  <option value="REJECTED">Từ chối (REJECTED)</option>
                  <option value="CLOSED">Đã đóng (CLOSED)</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-heading">
                  Ghi chú xử lý / Nội dung phản hồi lại cho người dùng
                </span>
                <textarea
                  rows={3}
                  placeholder="Ghi chú nguyên nhân hoặc kết quả xử lý đã thông báo cho người dùng..."
                  className="form-input"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
              </label>
            </div>

            {actionError && (
              <p role="alert" className="text-xs text-fg-danger-strong bg-danger-soft p-2.5 rounded-lg">
                {actionError}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-border-default pt-3">
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => setSelectedFeedback(null)}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-brand text-xs flex items-center gap-1.5"
                disabled={mutations.updateStatus.isPending}
              >
                <Save size={13} />
                <span>Lưu Trạng Thái</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Tạo Phản Hồi Thử Nghiệm */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-primary/75 px-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && setCreateModalOpen(false)}
        >
          <form
            onSubmit={handleCreateFeedback}
            className="w-full max-w-md rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xl space-y-3.5"
          >
            <div className="flex items-start justify-between border-b border-border-default pb-3">
              <div>
                <div className="flex items-center gap-2 text-fg-brand">
                  <Plus size={17} />
                  <span className="text-xs font-bold uppercase tracking-wide">Tạo Phản Hồi Thử Nghiệm</span>
                </div>
                <h2 className="mt-1 text-sm font-bold text-heading">Gửi ý kiến hoặc báo cáo lỗi</h2>
              </div>
              <button
                type="button"
                className="btn btn-secondary p-1"
                onClick={() => setCreateModalOpen(false)}
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Danh mục</span>
                <select
                  className="form-input"
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value as FeedbackCategory)}
                >
                  <option value="BUG_GENERATION">Lỗi sinh test</option>
                  <option value="COVERAGE_TESTPLAN">Độ phủ & Test Plan</option>
                  <option value="ACCOUNT_QUOTA">Quota & Tài khoản</option>
                  <option value="FEATURE_REQUEST">Đề xuất tính năng</option>
                  <option value="OTHER">Khác</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Tiêu đề phản hồi *</span>
                <input
                  type="text"
                  required
                  placeholder="VD: Cải thiện prompt sinh JUnit 5"
                  className="form-input"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Nội dung chi tiết</span>
                <textarea
                  rows={3}
                  placeholder="Mô tả cụ thể vấn đề hoặc đề xuất..."
                  className="form-input"
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Dự án liên quan (tùy chọn)</span>
                <input
                  type="text"
                  placeholder="VD: PaymentService, Project #1133"
                  className="form-input"
                  value={createProjectName}
                  onChange={(e) => setCreateProjectName(e.target.value)}
                />
              </label>
            </div>

            {actionError && (
              <p role="alert" className="text-xs text-fg-danger-strong bg-danger-soft p-2.5 rounded-lg">
                {actionError}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-border-default pt-3">
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => setCreateModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-brand text-xs flex items-center gap-1.5"
                disabled={mutations.create.isPending}
              >
                <Save size={13} />
                <span>Gửi Phản Hồi</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Cập nhật trạng thái phản hồi */}
      <ConfirmDialog
        open={confirmStatusOpen}
        variant="brand"
        title={language === 'vi' ? 'Xác nhận cập nhật trạng thái phản hồi?' : 'Confirm Feedback Status Update?'}
        description={
          selectedFeedback
            ? language === 'vi'
              ? `Bạn có chắc muốn cập nhật trạng thái phản hồi #${selectedFeedback.id} sang "${STATUS_MAP[editStatus].labelVi}"?`
              : `Are you sure you want to change feedback status to "${STATUS_MAP[editStatus].labelEn}"?`
            : ''
        }
        confirmLabel={language === 'vi' ? 'Xác nhận lưu' : 'Confirm Save'}
        cancelLabel={language === 'vi' ? 'Hủy' : 'Cancel'}
        pending={mutations.updateStatus.isPending}
        onCancel={() => setConfirmStatusOpen(false)}
        onConfirm={handleConfirmSaveStatus}
      />

      {/* Confirm Tạo phản hồi */}
      <ConfirmDialog
        open={confirmCreateOpen}
        variant="brand"
        title={language === 'vi' ? 'Xác nhận gửi phản hồi?' : 'Confirm Submit Feedback?'}
        description={
          language === 'vi'
            ? `Bạn có chắc muốn tạo bản ghi phản hồi "${createTitle}"?`
            : `Are you sure you want to submit feedback "${createTitle}"?`
        }
        confirmLabel={language === 'vi' ? 'Xác nhận gửi' : 'Confirm Submit'}
        cancelLabel={language === 'vi' ? 'Hủy' : 'Cancel'}
        pending={mutations.create.isPending}
        onCancel={() => setConfirmCreateOpen(false)}
        onConfirm={handleConfirmCreateFeedback}
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xác nhận xóa phản hồi"
        description={
          deleteTarget
            ? `Bạn có chắc muốn xóa phản hồi "${deleteTarget.title}" của tài khoản ${deleteTarget.userEmail}?`
            : ''
        }
        confirmLabel="Xóa phản hồi"
        cancelLabel="Hủy"
        pending={mutations.deleteFeedback.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </AdminShell>
  );
}

