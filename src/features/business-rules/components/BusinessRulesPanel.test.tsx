// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BusinessRulesPanel } from './BusinessRulesPanel';
import type { ReviewStatus, RuleSource } from '../types';
import { LanguageProvider } from '../../../shared/i18n/language';
import { LanguageToggle } from '../../../shared/components/LanguageToggle';

const mocks = vi.hoisted(() => ({
  traceRows: [] as import("../../traceability/types").TraceabilityRow[],
  generate: vi.fn(),
  generating: false,
  progress: undefined as unknown,
  review: vi.fn(),
  update: vi.fn(),
  plans: [] as { id: number; businessRuleId: number; coveredRuleIds?: number[] }[],
  classes: [] as unknown[],
  rules: [{
    id: 1,
    projectId: 1,
    methodId: 11,
    ruleCode: 'BR-001',
    description: 'Email phai hop le.',
    reviewNote: null as string | null,
    suggestedDescription: null as string | null,
    source: 'AI_GENERATED' as RuleSource,
    status: 'PENDING_REVIEW' as ReviewStatus,
    isModified: false,
    createdAt: '',
    updatedAt: '',
    sourceBranchId: null as string | null,
  }],
}));

vi.mock('../../traceability/hooks/useTraceability', () => ({ useTraceability: () => ({ data: { rows: mocks.traceRows, uncoveredRules: [] } }) }));


vi.mock('../../../shared/hooks/useGenerationProgress', () => ({
  useGenerationProgress: () => ({ data: mocks.progress }),
}));

vi.mock('../../projects/hooks/useProjects', () => ({
  useAnalysis: () => ({ data: { classes: mocks.classes } }),
}));

vi.mock('../../test-plans/hooks/useTestPlans', () => ({
  useTestPlans: () => ({ data: mocks.plans, isLoading: false, error: null }),
}));

vi.mock('../hooks/useBusinessRules', () => {
  const idleMutation = () => ({ isPending: false, error: null, mutate: vi.fn() });
  return {
    useBusinessRules: () => ({
      data: mocks.rules,
      isLoading: false,
      error: null,
    }),
    useCreateBusinessRules: idleMutation,
    useAcceptBusinessRuleSuggestion: idleMutation,
    useGenerateBusinessRules: () => ({ isPending: mocks.generating, error: null, mutate: mocks.generate }),
    useReviewBusinessRules: () => ({ isPending: false, error: null, mutate: mocks.review }),
    useApproveBusinessRules: idleMutation,
    useUpdateBusinessRule: () => ({ isPending: false, error: null, mutate: mocks.update }),
    useDeleteBusinessRule: idleMutation,
  };
});

const serviceWithMethods = (...methodIds: number[]) => [{
  id: 10,
  packageName: 'demo',
  className: 'UserService',
  qualifiedName: 'demo.UserService',
  classType: 'SERVICE',
  filePath: 'src/main/java/demo/UserService.java',
  methods: methodIds.map((id) => ({
    id,
    methodName: `method${id}`,
    returnType: 'void',
    parameters: [],
    throwsList: [],
    visibility: 'PUBLIC',
    sourceCode: '',
    lineStart: id,
    lineEnd: id,
    endpoints: [],
  })),
}];

describe('BusinessRulesPanel', () => {
  afterEach(() => {
    cleanup();
    localStorage.removeItem('greytest.language');
  });

  beforeEach(() => {
    mocks.traceRows = [];
    mocks.rules.splice(1);
    mocks.rules[0].source = 'AI_GENERATED';
    mocks.rules[0].status = 'PENDING_REVIEW';
    mocks.rules[0].isModified = false;
    mocks.rules[0].reviewNote = null;
    mocks.rules[0].suggestedDescription = null;
    mocks.rules[0].sourceBranchId = null;
    mocks.review.mockReset();
    mocks.generate.mockReset();
    mocks.update.mockReset();
    mocks.plans = [];
    mocks.classes = [];
    mocks.generating = false;
    mocks.progress = undefined;
  });

  it('does not offer a Business Rule download button', () => {
    render(<LanguageProvider><MemoryRouter><BusinessRulesPanel projectId={1} servicePath="service-a" /></MemoryRouter></LanguageProvider>);
    expect(screen.queryByRole('button', { name: 'Tải BR (JSON)' })).not.toBeInTheDocument();
  });

  it('switches every rule source and review status tag with the system language', () => {
    mocks.rules[0].source = 'USER_MODIFIED';
    mocks.rules[0].isModified = true;
    mocks.rules.push(
      { ...mocks.rules[0], id: 2, ruleCode: 'BR-002', source: 'AI_GENERATED', status: 'APPROVED', isModified: false },
      { ...mocks.rules[0], id: 3, ruleCode: 'BR-003', source: 'USER_ADDED', status: 'REJECTED', isModified: false },
      { ...mocks.rules[0], id: 4, ruleCode: 'BR-004', source: 'AI_REVIEW_SUGGESTED', isModified: false },
    );
    render(<LanguageProvider><LanguageToggle /><MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter></LanguageProvider>);

    for (const label of ['Người dùng chỉnh sửa', 'AI sinh', 'Người dùng thêm', 'AI đề xuất', 'Đã chỉnh sửa', 'Đã duyệt', 'Đã từ chối']) {
      expect(screen.getByText(label)).toBeVisible();
    }
    expect(screen.getAllByText('Chờ duyệt')).toHaveLength(2);
    expect(screen.queryByText(/USER_MODIFIED|PENDING REVIEW|AI_GENERATED/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    for (const label of ['User modified', 'AI generated', 'User added', 'AI suggested', 'Edited', 'Approved', 'Rejected']) {
      expect(screen.getByText(label)).toBeVisible();
    }
    expect(screen.getAllByText('Pending review')).toHaveLength(2);
    expect(screen.queryByText('Người dùng chỉnh sửa')).not.toBeInTheDocument();
    expect(screen.getByText('BR-002')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'VI' }));
    expect(screen.getByText('Người dùng chỉnh sửa')).toBeVisible();
    expect(screen.getByText('Đã chỉnh sửa')).toBeVisible();
    expect(screen.queryByText('User modified')).not.toBeInTheDocument();
  });

  it('shows generation progress next to the AI action while pending', () => {
    mocks.generating = true;
    mocks.classes = [{
      id: 10,
      className: 'UserService',
      qualifiedName: 'demo.UserService',
      packageName: 'demo',
      classType: 'SERVICE',
      filePath: 'src/main/java/demo/UserService.java',
      methods: [{
        id: 11,
        methodName: 'register',
        parameters: [{ name: 'email', type: 'String' }],
        returnType: 'void',
        lineStart: 1,
        lineEnd: 20,
        branches: [{ id: 1, branchId: 'IF-1', branchType: 'IF', conditionText: 'email != null', lineStart: 5, lineEnd: 10 }],
        rules: [],
      }],
    }];
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);

    expect(screen.getByRole('button', { name: /Tiếp tục sinh/ })).toBeDisabled();
    expect(screen.getByRole('complementary', { name: 'Tiến trình AI đang chạy' })).toBeVisible();
  });

  it('hides the resume action once every service method has a rule', () => {
    mocks.classes = serviceWithMethods(11);
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);

    expect(screen.queryByRole('button', { name: /Tiếp tục sinh/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sinh lại BR' })).toBeInTheDocument();
  });

  it('closes the editor without saving when the text did not change', () => {
    mocks.plans = [{ id: 5, businessRuleId: 1 }];
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Sửa rule' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Lưu' })).not.toBeInTheDocument();
  });

  it('asks before a real edit deletes the plans covering the rule', () => {
    mocks.plans = [{ id: 5, businessRuleId: 9, coveredRuleIds: [1, 9] }];
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Sửa rule' }));
    fireEvent.change(screen.getByDisplayValue('Email phai hop le.'), { target: { value: 'Email moi.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và xóa phần liên quan' }));
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it('saves a real edit directly when no plan covers the rule', () => {
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Sửa rule' }));
    fireEvent.change(screen.getByDisplayValue('Email phai hop le.'), { target: { value: 'Email moi.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it('keeps manual entry collapsed until the user opens it', () => {
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);

    expect(screen.queryByRole('button', { name: 'Thêm BR' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm Business Rule thủ công' }));
    expect(screen.getByRole('button', { name: 'Thêm BR' })).toBeInTheDocument();
  });

  it('shows the background acceptance message without hiding the rule list', () => {
    mocks.classes = serviceWithMethods(11, 99);
    mocks.generate.mockImplementation((_value, options) => options.onSuccess({
      stage: 'BUSINESS_RULE',
      status: 'QUEUED',
      message: 'Tác vụ AI đang chạy nền.',
    }));
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục sinh/ }));

    expect(screen.getByText('Tác vụ AI đang chạy nền.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Thu gọn|Mở tất cả/ })).not.toBeInTheDocument();
  });

  it('groups selectable rule rows by method inside each service', () => {
    mocks.classes = serviceWithMethods(11, 12);
    mocks.rules.push({ ...mocks.rules[0], id: 2, methodId: 12, ruleCode: 'BR-002', description: 'Second rule.' });
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);
    const list = screen.getByRole('region', { name: 'Danh sách Business Rule' });
    expect(within(list).getByText('method11')).toHaveClass('text-fg-brand-strong');
    expect(within(list).getByText('method12')).toBeVisible();
    const detail = screen.getByRole('complementary', { name: 'Chi tiết Business Rule' });
    expect(within(detail).getByRole('heading', { name: 'Email phai hop le.' })).toBeVisible();
    fireEvent.click(within(list).getByRole('button', { name: /BR-002/ }));
    expect(within(detail).getByRole('heading', { name: 'Second rule.' })).toBeVisible();
    expect(within(list).getByRole('button', { name: /BR-002/ })).toHaveStyle({ boxShadow: 'inset 3px 0 0 var(--brand)' });
    expect(within(detail).getByRole('button', { name: 'Sửa rule' })).toBeVisible();
  });

  it('hides the resume button when all decisions are covered (generation completed)', () => {
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /Tiếp tục sinh/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sinh lại BR' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Duyệt tất cả' })).toBeEnabled();
  });

  it('continues with resume and requires confirmation before regenerating BRs', () => {
    mocks.classes = [{
      id: 10,
      className: 'UserService',
      qualifiedName: 'demo.UserService',
      packageName: 'demo',
      classType: 'SERVICE',
      filePath: 'src/main/java/demo/UserService.java',
      methods: [{
        id: 11,
        methodName: 'register',
        parameters: [{ name: 'email', type: 'String' }],
        returnType: 'void',
        lineStart: 1,
        lineEnd: 20,
        branches: [{ id: 1, branchId: 'IF-1', branchType: 'IF', conditionText: 'email != null', lineStart: 5, lineEnd: 10 }],
        rules: [],
      }],
    }];
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục sinh/ }));
    expect(mocks.generate).toHaveBeenCalledWith(true, expect.any(Object));
    mocks.generate.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Sinh lại BR' }));
    expect(mocks.generate).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: 'Sinh lại Business Rule?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Giữ BR hiện tại' }));
    expect(mocks.generate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Sinh lại BR' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Sinh lại Business Rule?' }))
      .getByRole('button', { name: 'Xác nhận sinh lại' }));
    expect(mocks.generate).toHaveBeenCalledWith(false, expect.any(Object));
  });

  it('groups TRUE and FALSE outcomes under one covered source decision', () => {
    mocks.rules[0].sourceBranchId = 'IF-1';
    mocks.rules.push({
      ...mocks.rules[0],
      id: 2,
      ruleCode: 'BR-002',
      description: 'Region determines the tax rate.',
      sourceBranchId: 'SWITCH-1',
    });
    mocks.classes = [{
      id: 10,
      packageName: 'demo',
      className: 'UserService',
      qualifiedName: 'demo.UserService',
      classType: 'SERVICE',
      filePath: 'module-a/src/main/java/demo/UserService.java',
      methods: [{
        id: 11,
        methodName: 'createUser',
        returnType: 'User',
        parameters: [],
        throwsList: [],
        visibility: 'PUBLIC',
        sourceCode: 'if (exists) return user;',
        lineStart: 20,
        lineEnd: 30,
        endpoints: [],
        branches: [
          { branchId: 'IF-1-TRUE', kind: 'IF', outcome: 'TRUE', condition: 'exists', lineStart: 22, lineEnd: 22 },
          { branchId: 'IF-1-FALSE', kind: 'IF', outcome: 'FALSE', condition: 'exists', lineStart: 22, lineEnd: 22 },
          { branchId: 'SWITCH-1::CASE-1', kind: 'SWITCH', outcome: '"VN"', condition: 'region', lineStart: 23, lineEnd: 23 },
          { branchId: 'SWITCH-1::DEFAULT', kind: 'SWITCH', outcome: 'DEFAULT', condition: 'region', lineStart: 23, lineEnd: 23 },
        ],
      }],
    }];

    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Thêm Business Rule thủ công' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chọn Service method' }));
    const method = screen.getByRole('option', { name: /src\/main\/java\/demo\/UserService.java/ });
    expect(method).toHaveAttribute('title', 'module-a/src/main/java/demo/UserService.java');
    fireEvent.click(method);
    expect(screen.getByRole('button', { name: 'Chọn Service method' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chọn quyết định source' }));
    expect(screen.getByRole('option', { name: /IF-1: if \(exists\)/ })).toBeVisible();
    expect(screen.queryByText(/Li\u00ean k\u1ebft quy\u1ebft \u0111\u1ecbnh source/)).not.toBeInTheDocument();
    expect(screen.getByText('Dòng nguồn L22-22')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /BR-002/ }));
    expect(screen.getByText('Dòng nguồn L23-23')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Duyệt tất cả' })).toBeEnabled();
  });

  it('disables creating multiple rules for one source decision', () => {
    mocks.classes = [{
      id: 10,
      packageName: 'demo',
      className: 'UserService',
      qualifiedName: 'demo.UserService',
      classType: 'SERVICE',
      filePath: 'src/main/java/demo/UserService.java',
      methods: [{
        id: 11,
        methodName: 'createUser',
        returnType: 'User',
        parameters: [],
        throwsList: [],
        visibility: 'PUBLIC',
        sourceCode: 'if (exists) return user;',
        lineStart: 20,
        lineEnd: 30,
        endpoints: [],
        branches: [
          { branchId: 'IF-1-TRUE', kind: 'IF', outcome: 'TRUE', condition: 'exists', lineStart: 22, lineEnd: 22 },
          { branchId: 'IF-1-FALSE', kind: 'IF', outcome: 'FALSE', condition: 'exists', lineStart: 22, lineEnd: 22 },
        ],
      }],
    }];

    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Thêm Business Rule thủ công' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chọn Service method' }));
    fireEvent.click(screen.getByRole('option', { name: /UserService.createUser/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Chọn quyết định source' }));
    fireEvent.click(screen.getByRole('option', { name: 'IF-1: if (exists)' }));
    fireEvent.change(document.querySelector('form textarea')!, {
      target: { value: 'Rule one.\nRule two.' },
    });

    expect(screen.getByRole('button', { name: /2 BR/ })).toBeDisabled();
    expect(screen.getByText(/M\u1ed7i quy\u1ebft \u0111\u1ecbnh source ch\u1ec9 \u0111\u01b0\u1ee3c li\u00ean k\u1ebft v\u1edbi m\u1ed9t Business Rule/)).toBeVisible();
  });
  it('keeps AI review optional after user changes', () => {
    mocks.rules[0].isModified = true;
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);

    expect(screen.getByRole('button', { name: 'AI rà soát thay đổi (1)' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Duyệt tất cả' })).toBeEnabled();
    expect(screen.getByText(/AI rà soát là bước tư vấn tùy chọn/)).toBeVisible();
    expect(screen.getByText('Đã chỉnh sửa')).toBeVisible();
    expect(screen.queryByText('Code liên quan đã thay đổi')).not.toBeInTheDocument();
  });

  it('identifies source changes separately from manual edits', () => {
    mocks.rules[0].isModified = true;
    render(<MemoryRouter><BusinessRulesPanel projectId={1} affectedRuleIds={new Set([1])} /></MemoryRouter>);
    expect(screen.getByText('Code liên quan đã thay đổi')).toBeVisible();
    expect(screen.queryByText('Đã chỉnh sửa')).not.toBeInTheDocument();
  });

  it('hides legacy category and manual-edit informational notes', () => {
    mocks.rules[0].reviewNote = 'AI category: BUSINESS_LOGIC. User review/chinh sua truoc khi approve.';
    const { rerender } = render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);
    expect(screen.queryByText(/AI category:|User review\/chinh sua/)).not.toBeInTheDocument();

    mocks.rules[0].reviewNote = 'Da sua thu cong. AI review lai la tuy chon.';
    rerender(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);
    expect(screen.queryByText(/Da sua thu cong/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Email phai hop le.')[0]).toBeVisible();
  });

  it('localizes a review verdict and shows fresh feedback only once', () => {
    mocks.rules[0].isModified = true;
    mocks.rules[0].reviewNote = 'TOO_VAGUE: Thiếu điều kiện đầu vào.';
    mocks.review.mockImplementation((_value, options) => options.onSuccess({
      reviewedRules: [{ ruleId: 1, verdict: 'TOO_VAGUE', suggestedDescription: null,
        reason: 'Thiếu điều kiện đầu vào.' }],
      suggestedRules: [],
    }));
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);
    expect(screen.getByText('Mô tả chưa rõ: Thiếu điều kiện đầu vào.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'AI rà soát thay đổi (1)' }));
    expect(screen.getAllByText('Mô tả chưa rõ: Thiếu điều kiện đầu vào.')).toHaveLength(1);
    expect(screen.queryByText(/TOO_VAGUE/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duyệt tất cả' })).toBeEnabled();
  });

  it('keeps a persisted AI suggestion actionable after remount', () => {
    mocks.rules[0].reviewNote = 'NEEDS_REVISION: Can noi ro dieu kien.';
    mocks.rules[0].suggestedDescription = 'Email phai dung dinh dang hop le.';

    const { unmount } = render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Dùng gợi ý AI' })).toBeVisible();
    unmount();

    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Dùng gợi ý AI' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Duyệt tất cả' })).toBeEnabled();
  });

  it('removes an obsolete review suggestion after a manual edit', () => {
    mocks.rules[0].isModified = true;
    mocks.review.mockImplementation((_value, options) => options.onSuccess({
      reviewedRules: [{
        ruleId: 1,
        verdict: 'NEEDS_REVISION',
        suggestedDescription: 'Email phai dung dinh dang hop le.',
        reason: 'Can noi ro dieu kien.',
      }],
      suggestedRules: [],
    }));
    mocks.update.mockImplementation((_value, options) => options.onSuccess());
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'AI rà soát thay đổi (1)' }));
    expect(screen.getByRole('button', { name: 'Dùng gợi ý AI' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Sửa rule' }));
    fireEvent.change(screen.getByDisplayValue('Email phai hop le.'), {
      target: { value: 'Email phai co dinh dang hop le.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(screen.queryByRole('button', { name: 'Dùng gợi ý AI' })).not.toBeInTheDocument();
  });

  it('shows persisted source mismatch after remount without requiring a suggestion decision', () => {
    mocks.rules[0].reviewNote = 'SOURCE_MISMATCH: BR allows equality; code rejects it. Verify requirements.';
    // Dữ liệu sai contract vẫn không được biến thành đề xuất sửa BR trên UI.
    mocks.rules[0].suggestedDescription = 'Reject equality.';
    const { unmount } = render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);
    expect(screen.getByText(/BR không khớp với code: BR allows equality/)).toBeVisible();
    unmount();

    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);
    expect(screen.getByText(/BR không khớp với code: BR allows equality/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Dùng gợi ý AI' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Giữ của tôi' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duyệt tất cả' })).toBeEnabled();
  });

  it('shows a fresh mismatch review and allows approval without applying an AI suggestion', () => {
    mocks.rules[0].isModified = true;
    mocks.review.mockImplementation((_value, options) => options.onSuccess({
      reviewedRules: [{ ruleId: 1, verdict: 'SOURCE_MISMATCH', suggestedDescription: 'Reject equality.',
        reason: 'BR allows equality; code rejects it. Verify requirements.' }],
      suggestedRules: [],
    }));
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'AI rà soát thay đổi (1)' }));

    expect(screen.getByText(/BR không khớp với code: BR allows equality/)).toBeVisible();
    expect(screen.getByText('AI đã rà soát 1 BR')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Dùng gợi ý AI' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duyệt tất cả' })).toBeEnabled();
  });
  it('uses traceability identifiers and only indicates whether a Unit Test exists', () => {
    mocks.classes = serviceWithMethods(11);
    mocks.traceRows = [{ ruleId: 1, ruleCode: 'BR-001', ruleDescription: 'Email phai hop le.',
      planId: 7, planCode: 'TP-007', planTitle: 'Validate email', testType: 'NORMAL',
      caseId: 12, caseCode: 'TC-012', caseDescription: 'Valid email', unitTestId: 8, unitTestName: 'UserTest.validEmail' }];
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);
    const list = screen.getByRole('region', { name: 'Danh sách Business Rule' });
    expect(within(list).getByText('TP-007')).toBeVisible();
    expect(within(list).getByText('TC-012')).toBeVisible();
    expect(within(list).getByText('Có Unit Test')).toBeVisible();
    expect(within(list).queryByText(/UT đạt|UT lỗi/)).not.toBeInTheDocument();
    const detail = screen.getByRole('complementary', { name: 'Chi tiết Business Rule' });
    expect(within(detail).getAllByRole('listitem')).toHaveLength(4);
    expect(within(detail).getByText('UserTest.validEmail')).toBeVisible();
  });

  it('shows missing Unit Tests and highlights only the exact source branch lines', () => {
    const service = serviceWithMethods(11)[0];
    mocks.rules[0].sourceBranchId = 'IF-1-TRUE';
    mocks.classes = [{ ...service, methods: [{ ...service.methods[0], lineStart: 40, lineEnd: 42,
      sourceCode: 'void save() {\n  reject();\n}', branches: [{ branchId: 'IF-1-TRUE', kind: 'IF', outcome: 'TRUE', condition: 'invalid', lineStart: 41, lineEnd: 41 }] }] }];
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);
    expect(screen.getByText('Chưa có Unit Test')).toBeVisible();
    const detail = screen.getByRole('complementary', { name: 'Chi tiết Business Rule' });
    expect(within(detail).getByText('40')).toBeVisible();
    const highlight = detail.querySelectorAll('.code-line-on');
    expect(highlight).toHaveLength(1);
    expect(highlight[0]).toHaveTextContent('41 reject();');
    // Chuỗi truy vết chỉ có một mục; các dòng code là listitem riêng của khung code.
    expect(within(detail).getAllByRole('listitem').filter((item) => !item.classList.contains('code-line'))).toHaveLength(1);
  });

});
