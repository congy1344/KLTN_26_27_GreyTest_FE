// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BusinessRulesPanel } from './BusinessRulesPanel';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  generating: false,
  progress: undefined as unknown,
  review: vi.fn(),
  update: vi.fn(),
  classes: [] as unknown[],
  rules: [{
    id: 1,
    projectId: 1,
    methodId: 11,
    ruleCode: 'BR-001',
    description: 'Email phai hop le.',
    reviewNote: null as string | null,
    suggestedDescription: null as string | null,
    source: 'AI_GENERATED' as const,
    status: 'PENDING_REVIEW' as const,
    isModified: false,
    createdAt: '',
    updatedAt: '',
    sourceBranchId: null as string | null,
  }],
}));

vi.mock('../../../shared/hooks/useGenerationProgress', () => ({
  useGenerationProgress: () => ({ data: mocks.progress }),
}));

vi.mock('../../projects/hooks/useProjects', () => ({
  useAnalysis: () => ({ data: { classes: mocks.classes } }),
}));

vi.mock('../../test-plans/hooks/useTestPlans', () => ({
  useTestPlans: () => ({ data: [], isLoading: false, error: null }),
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

describe('BusinessRulesPanel', () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.rules.splice(1);
    mocks.rules[0].isModified = false;
    mocks.rules[0].reviewNote = null;
    mocks.rules[0].suggestedDescription = null;
    mocks.rules[0].sourceBranchId = null;
    mocks.review.mockReset();
    mocks.update.mockReset();
    mocks.classes = [];
    mocks.generating = false;
    mocks.progress = undefined;
  });

  it('shows generation progress next to the AI action while pending', () => {
    mocks.generating = true;
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);

    const generateButton = screen.getByRole('button', { name: 'AI sinh BR' });
    const logButton = screen.getByRole('button', { name: 'Log tiến độ' });
    expect(generateButton.parentElement).toContainElement(logButton);
    fireEvent.click(logButton);
    expect(screen.getByText('Chưa có tiến trình nào')).toBeVisible();
  });

  it('shows the background acceptance message without hiding the rule list', () => {
    mocks.generate.mockImplementation((_value, options) => options.onSuccess({
      stage: 'BUSINESS_RULE',
      status: 'QUEUED',
      message: 'Tác vụ AI đang chạy nền.',
    }));
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'AI sinh BR' }));

    expect(screen.getByText('Tác vụ AI đang chạy nền.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Thu gọn|Mở tất cả/ })).not.toBeInTheDocument();
  });

  it('groups rules by source file, service and method', () => {
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
        parameters: [{ name: 'email', type: 'String' }],
        throwsList: [],
        visibility: 'PUBLIC',
        sourceCode: '',
        lineStart: 20,
        lineEnd: 30,
        endpoints: [],
      }],
    }];
    mocks.classes.push({
      id: 12,
      packageName: 'demo',
      className: 'AuditService',
      qualifiedName: 'demo.AuditService',
      classType: 'SERVICE',
      filePath: 'src/main/java/demo/UserService.java',
      methods: [{
        id: 13,
        methodName: 'audit',
        returnType: 'void',
        parameters: [],
        throwsList: [],
        visibility: 'PUBLIC',
        sourceCode: '',
        lineStart: 32,
        lineEnd: 36,
        endpoints: [],
      }],
    });

    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);

    expect(screen.getAllByText('src/main/java/demo/UserService.java')).toHaveLength(1);
    expect(screen.getByText('Tệp')).toBeVisible();
    expect(screen.getAllByText('Dịch vụ')).toHaveLength(2);
    expect(screen.getAllByText('Phương thức')).toHaveLength(2);
    expect(screen.getByText('UserService')).toBeVisible();
    expect(screen.getByText('createUser(String email)')).toBeVisible();
    expect(screen.getByText('User | Dòng 20-30')).toBeVisible();
    expect(screen.getByText('Email phai hop le.')).toBeVisible();
    expect(screen.getByText('Dòng nguồn L20-30')).toBeVisible();
    expect(screen.getByText('AuditService')).toBeVisible();
    expect(document.querySelectorAll('details')).toHaveLength(5);
    const fileNode = document.querySelector('details');
    expect(fileNode).toHaveAttribute('open');
    fireEvent.click(fileNode!.querySelector('summary')!);
    expect(fileNode).not.toHaveAttribute('open');
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

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '11' } });
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
    expect(screen.getByRole('option', { name: /src\/main\/java\/demo\/UserService.java/ }))
      .toHaveAttribute('title', 'module-a/src/main/java/demo/UserService.java');
    expect(screen.getByRole('option', { name: /IF-1: if \(exists\)/ })).toBeVisible();
    expect(screen.queryByText(/Li\u00ean k\u1ebft quy\u1ebft \u0111\u1ecbnh source/)).not.toBeInTheDocument();
    expect(screen.getByText('Dòng nguồn L22-22')).toBeVisible();
    expect(screen.getByText('Dòng nguồn L23-23')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Approve tất cả' })).toBeEnabled();
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

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '11' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'IF-1' } });
    fireEvent.change(document.querySelector('form textarea')!, {
      target: { value: 'Rule one.\nRule two.' },
    });

    expect(screen.getByRole('button', { name: /2 BR/ })).toBeDisabled();
    expect(screen.getByText(/M\u1ed7i quy\u1ebft \u0111\u1ecbnh source ch\u1ec9 \u0111\u01b0\u1ee3c li\u00ean k\u1ebft v\u1edbi m\u1ed9t Business Rule/)).toBeVisible();
  });
  it('keeps AI review optional after user changes', () => {
    mocks.rules[0].isModified = true;
    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);

    expect(screen.getByRole('button', { name: 'AI review thay đổi (1)' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Approve tất cả' })).toBeEnabled();
    expect(screen.getByText(/AI review là bước tư vấn tùy chọn/)).toBeVisible();
  });

  it('keeps a persisted AI suggestion actionable after remount', () => {
    mocks.rules[0].reviewNote = 'NEEDS_REVISION: Can noi ro dieu kien.';
    mocks.rules[0].suggestedDescription = 'Email phai dung dinh dang hop le.';

    const { unmount } = render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Dùng gợi ý AI' })).toBeVisible();
    unmount();

    render(<MemoryRouter><BusinessRulesPanel projectId={1} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Dùng gợi ý AI' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Approve tất cả' })).toBeEnabled();
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

    fireEvent.click(screen.getByRole('button', { name: 'AI review thay đổi (1)' }));
    expect(screen.getByRole('button', { name: 'Dùng gợi ý AI' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Sửa rule' }));
    fireEvent.change(screen.getByDisplayValue('Email phai hop le.'), {
      target: { value: 'Email phai co dinh dang hop le.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(screen.queryByRole('button', { name: 'Dùng gợi ý AI' })).not.toBeInTheDocument();
  });
});
