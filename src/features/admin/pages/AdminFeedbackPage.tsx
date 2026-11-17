import { IconButton } from '../../../shared/components/IconButton';
import { ArrowLeft, CheckCircle2, CircleDot, Clock, MessageSquare, MessageSquareText, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { Tag, type TagTone } from '../../../shared/components/Tag';
import { SelectMenu } from '../../../shared/components/SelectMenu';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../../../shared/api/api-client';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { EmptyState } from '../../../shared/components/EmptyState';
import { AdminShell } from '../components/AdminShell';
import { useFeedbackMutations, useFeedbackStats, useFeedbacks } from '../hooks/useAdmin';
import { useLanguage } from '../../../shared/i18n/language';
import type { FeedbackCategory, FeedbackStatus, UserFeedback } from '../types';

const CATEGORY_MAP: Record<string, { labelVi: string; labelEn: string; tone: TagTone }> = {
  BUG_GENERATION: {
    labelVi: 'Lỗi sinh test',
    labelEn: 'Generation Bug',
    tone: 'neutral',
  },
  COVERAGE_TESTPLAN: {
    labelVi: 'Độ phủ & Test Plan',
    labelEn: 'Coverage & Test Plan',
    tone: 'neutral',
  },
  ACCOUNT_QUOTA: {
    labelVi: 'Quota & Tài khoản',
    labelEn: 'Quota & Account',
    tone: 'neutral',
  },
  FEATURE_REQUEST: {
    labelVi: 'Đề xuất tính năng',
    labelEn: 'Feature Request',
    tone: 'neutral',
  },
  OTHER: {
    labelVi: 'Khác',
    labelEn: 'Other',
    tone: 'neutral',
  },
};

const STATUS_MAP: Record<FeedbackStatus, { labelVi: string; labelEn: string; tone: TagTone }> = {
  NEW: {
    labelVi: 'Mới tiếp nhận',
    labelEn: 'New',
    tone: 'warning',
  },
  IN_PROGRESS: {
    labelVi: 'Đang xử lý',
    labelEn: 'In Progress',
    tone: 'brand',
  },
  RESOLVED: {
    labelVi: 'Đã giải quyết',
    labelEn: 'Resolved',
    tone: 'success',
  },
  REJECTED: {
    labelVi: 'Từ chối',
    labelEn: 'Rejected',
    tone: 'danger',
  },
  CLOSED: {
    labelVi: 'Đã đóng',
    labelEn: 'Closed',
    tone: 'neutral',
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
            <span className="text-xs font-semibold text-body-subtle">
              User Experience & Support
            </span>
            <Tag variant="status" tone="brand" icon={CircleDot}>
              FeedbackGateway
            </Tag>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-heading sm:text-3xl">
            {language === 'vi' ? 'Quản lý phản hồi & ý kiến người dùng' : "User feedback & support desk"}
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
          <span>{language === 'vi' ? 'Tạo phản hồi thử nghiệm' : 'Submit Feedback'}</span>
        </button>
      </div>

      {/* 3 Summary Metric Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Tổng phản hồi' : 'Total Feedbacks'}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-control bg-brand-softer text-fg-brand-strong">
              <MessageSquare size={16} />
            </span>
          </div>
          <p className="mt-2 font-sans tabular-nums text-2xl font-bold text-heading">{stats.total}</p>
          <span className="text-xs text-body-subtle">Được ghi nhận từ người dùng</span>
        </div>

        <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Đang chờ xử lý' : 'Pending & In Progress'}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-control bg-warning-soft text-fg-warning">
              <Clock size={16} />
            </span>
          </div>
          <p className="mt-2 font-sans tabular-nums text-2xl font-bold text-fg-warning">{stats.pending}</p>
          <span className="text-xs text-body-subtle">Cần quản trị viên kiểm tra</span>
        </div>

        <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Đã giải quyết' : 'Resolved'}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-control bg-success-soft text-fg-success-strong">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <p className="mt-2 font-sans tabular-nums text-2xl font-bold text-fg-success-strong">{stats.resolved}</p>
          <span className="text-xs text-body-subtle">Đã khắc phục và phản hồi</span>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 rounded-base border border-border-danger-subtle bg-danger-soft p-3 text-xs text-fg-danger-strong flex items-center justify-between">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="btn btn-ghost rounded-control font-bold underline ml-2">
            Đóng
          </button>
        </div>
      )}

      {/* Main Feedback Table Container */}
      <div className="rounded-base border border-border-default bg-neutral-primary-soft">
        {/* Filter and Search Bar */}
        <div className="border-b border-border-default p-4 flex flex-wrap items-center justify-between gap-3 bg-neutral-primary-soft">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-body-subtle" />
              <input
                type="text"
                placeholder={language === 'vi' ? 'Tìm theo email, tiêu đề, nội dung...' : 'Search feedbacks...'}
                className="form-input h-10 w-full rounded-control border border-border-default bg-neutral-primary pl-9 pr-3 text-xs text-heading placeholder:text-body-subtle shadow-2xs focus:border-brand focus:outline-none leading-normal"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <SelectMenu aria-label="Lọc trạng thái"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              className="w-full sm:w-auto sm:min-w-[160px]"
              options={[{ value: "", label: language === 'vi' ? 'Mọi trạng thái' : 'All Status' },
                { value: "NEW", label: "Mới tiếp nhận", tone: 'warning' },
                { value: "IN_PROGRESS", label: "Đang xử lý", tone: 'brand' },
                { value: "RESOLVED", label: "Đã giải quyết", tone: 'success' },
                { value: "REJECTED", label: language === 'vi' ? 'Từ chối' : 'Rejected', tone: 'danger' },
                { value: "CLOSED", label: "Đã đóng", tone: 'neutral' }]} />

            <SelectMenu aria-label="Lọc danh mục"
              value={categoryFilter}
              onChange={(value) => setCategoryFilter(value)}
              className="w-full sm:w-auto sm:min-w-[160px]"
              options={[{ value: "", label: language === 'vi' ? 'Mọi danh mục' : 'All Categories' },
                { value: "BUG_GENERATION", label: "Lỗi sinh test" },
                { value: "COVERAGE_TESTPLAN", label: "Độ phủ & Test Plan" },
                { value: "ACCOUNT_QUOTA", label: "Quota & Tài khoản" },
                { value: "FEATURE_REQUEST", label: "Đề xuất tính năng" },
                { value: "OTHER", label: "Khác" }]} />

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
            <CheckCircle2 size={13} className="text-fg-brand-strong" />
            {displayedFeedbacks.length} {language === 'vi' ? 'phản hồi' : 'entries'}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-xs border-b border-border-default bg-neutral-secondary-soft font-semibold text-body-subtle">
              <tr>
                <th className="font-semibold text-body-subtle text-xs p-3.5">{language === 'vi' ? 'Người gửi' : 'Sender'}</th>
                <th className="font-semibold text-body-subtle text-xs p-3.5 min-w-[240px]">{language === 'vi' ? 'Nội dung phản hồi' : "Feedback content"}</th>
                <th className="font-semibold text-body-subtle text-xs p-3.5">{language === 'vi' ? 'Phân loại' : 'Category'}</th>
                <th className="font-semibold text-body-subtle text-xs p-3.5">{language === 'vi' ? 'Thời gian' : "Submitted at"}</th>
                <th className="font-semibold text-body-subtle text-xs p-3.5">{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                <th className="font-semibold text-body-subtle text-xs p-3.5">{language === 'vi' ? 'Ghi chú admin' : "Admin response"}</th>
                <th className="font-semibold text-body-subtle text-xs p-3.5 text-right">{language === 'vi' ? 'Thao tác' : 'Actions'}</th>
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
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-softer font-sans text-xs font-bold text-fg-brand-strong">
                          {(fb.userName || fb.userEmail).charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold text-heading text-xs">{fb.userName || 'Người dùng'}</p>
                          <p className="text-xs text-body-subtle">{fb.userEmail}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <p className="font-bold text-heading text-xs">{fb.title}</p>
                      <p className="mt-0.5 text-body-subtle text-xs line-clamp-2 max-w-sm" title={fb.content}>
                        {fb.content}
                      </p>
                      {fb.projectName && (
                        <Tag className="mt-1">
                          {fb.projectName}
                        </Tag>
                      )}
                    </td>

                    <td className="p-3.5">
                      <Tag variant="status" tone={cat.tone} icon={MessageSquare}>
                        {language === 'vi' ? cat.labelVi : cat.labelEn}
                      </Tag>
                    </td>

                    <td className="p-3.5 text-body-subtle whitespace-nowrap text-xs">
                      {new Date(fb.createdAt).toLocaleString('vi-VN')}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <Tag variant="status" tone={status.tone} icon={fb.status === 'RESOLVED' ? CheckCircle2 : Clock}>
                        <span>{language === 'vi' ? status.labelVi : status.labelEn}</span>
                      </Tag>
                    </td>

                    <td className="p-3.5 max-w-[200px]">
                      {fb.adminNote ? (
                        <p className="text-xs text-heading italic line-clamp-2" title={fb.adminNote}>
                          "{fb.adminNote}"
                        </p>
                      ) : (
                        <span className="text-xs text-body-subtle italic">Chưa có phản hồi</span>
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
                        <IconButton onClick={() => setDeleteTarget(fb)}
              title="Xóa phản hồi" label="Xóa phản hồi" icon={Trash2} className="hover:bg-danger-soft hover:text-fg-danger-strong" />
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
          <form style={{ boxShadow: 'var(--shadow-lg)' }}
            onSubmit={handleSaveStatus}
            className="w-full max-w-md rounded-base border border-border-default bg-neutral-primary-soft p-5 shadow-lg space-y-4"
          >
            <div className="flex items-start justify-between border-b border-border-default pb-3">
              <div>
                <div className="flex items-center gap-2 text-fg-brand-strong">
                  <MessageSquareText size={17} />
                  <span className="text-xs font-bold">Xử lý phản hồi</span>
                </div>
                <h2 className="mt-1 text-sm font-bold text-heading line-clamp-1">{selectedFeedback.title}</h2>
              </div>
              <IconButton onClick={() => setSelectedFeedback(null)} label="Đóng" icon={X} />
            </div>

            <div className="rounded-base border border-border-default-subtle bg-neutral-secondary-soft/50 p-3 text-xs space-y-1.5">
              <div className="text-body-subtle">
                <span>Người gửi: <strong>{selectedFeedback.userEmail}</strong></span>
              </div>
              <p className="text-heading text-xs mt-1">{selectedFeedback.content}</p>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Cập nhật trạng thái</span>
                <SelectMenu
                  value={editStatus}
                  onChange={(selectedValue) => setEditStatus(selectedValue as FeedbackStatus)}
                  aria-label={'Cập nhật trạng thái'}
                  options={[{ value: String("NEW"), label: "Mới tiếp nhận (NEW)" }, { value: String("IN_PROGRESS"), label: "Đang xử lý (IN_PROGRESS)" }, { value: String("RESOLVED"), label: "Đã giải quyết (RESOLVED)" }, { value: String("REJECTED"), label: "Từ chối (REJECTED)" }, { value: String("CLOSED"), label: "Đã đóng (CLOSED)" }]}
                />
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
              <p role="alert" className="text-xs text-fg-danger-strong bg-danger-soft p-2.5 rounded-base">
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
                <span>Lưu trạng thái</span>
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
          <form style={{ boxShadow: 'var(--shadow-lg)' }}
            onSubmit={handleCreateFeedback}
            className="w-full max-w-md rounded-base border border-border-default bg-neutral-primary-soft p-5 shadow-lg space-y-3.5"
          >
            <div className="flex items-start justify-between border-b border-border-default pb-3">
              <div>
                <div className="flex items-center gap-2 text-fg-brand-strong">
                  <Plus size={17} />
                  <span className="text-xs font-bold">Tạo phản hồi thử nghiệm</span>
                </div>
                <h2 className="mt-1 text-sm font-bold text-heading">Gửi ý kiến hoặc báo cáo lỗi</h2>
              </div>
              <IconButton onClick={() => setCreateModalOpen(false)} label="Đóng" icon={X} />
            </div>

            <div className="space-y-3 text-xs">
              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Danh mục</span>
                <SelectMenu
                  value={createCategory}
                  onChange={(selectedValue) => setCreateCategory(selectedValue as FeedbackCategory)}
                  aria-label={'Danh mục'}
                  options={[{ value: String("BUG_GENERATION"), label: "Lỗi sinh test" }, { value: String("COVERAGE_TESTPLAN"), label: "Độ phủ & Test Plan" }, { value: String("ACCOUNT_QUOTA"), label: "Quota & Tài khoản" }, { value: String("FEATURE_REQUEST"), label: "Đề xuất tính năng" }, { value: String("OTHER"), label: "Khác" }]}
                />
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
              <p role="alert" className="text-xs text-fg-danger-strong bg-danger-soft p-2.5 rounded-base">
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
                <span>Gửi phản hồi</span>
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

