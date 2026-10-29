// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SourceUpdateHistory } from './SourceUpdateHistory';
import type { SourceUpdateDto, SourceUpdateItemDto } from '../types';

afterEach(cleanup);

function item(overrides: Partial<SourceUpdateItemDto> = {}): SourceUpdateItemDto {
  return {
    id: 1, sourceUpdateId: 216, targetType: 'TEST_PLAN', targetId: 1908, targetKey: null,
    action: 'UPDATE', reason: 'Cập nhật kế hoạch kiểm thử', reviewStatus: 'ACCEPTED',
    beforeData: '{"title":"Nhóm máu cũ"}', afterData: '{"title":"Nhóm máu mới"}',
    createdAt: '', updatedAt: '', ...overrides,
  };
}

function update(overrides: Partial<SourceUpdateDto> = {}): SourceUpdateDto {
  return {
    id: 216, projectId: 811, baseRevisionId: 227, candidateRevisionId: 228,
    status: 'APPLIED', totalChangedMethods: 1,
    impactSummary: JSON.stringify({ changedMethods: [{ servicePath: 'backend/patient-service' }] }),
    items: [item()], createdAt: '2026-10-23T09:00:00Z', updatedAt: '2026-10-23T10:00:00Z', ...overrides,
  };
}

function openHistory() {
  fireEvent.click(screen.getByRole('button', { name: /Lịch sử cập nhật/ }));
}

describe('SourceUpdateHistory', () => {
  it('only shows stored before/after content when requested', () => {
    render(<SourceUpdateHistory updates={[update()]} loading={false} error={null} />);
    openHistory();
    fireEvent.click(screen.getByRole('button', { name: /Bản cập nhật #216/ }));
    expect(screen.queryByText(/Nhóm máu cũ/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xem nội dung trước/sau' }));
    expect(screen.getByText(/Nhóm máu cũ/)).toBeVisible();
    expect(screen.getByText(/Nhóm máu mới/)).toBeVisible();
    expect(screen.getByText('Trước cập nhật')).toBeVisible();
    expect(screen.getByText('Sau cập nhật')).toBeVisible();
  });

  it('renders raw Java stored for a deleted method without requiring JSON', () => {
    render(<SourceUpdateHistory updates={[update({ items: [item({
      targetType: 'METHOD', targetKey: 'demo.PatientService#countActivePatients()', action: 'REMOVE',
      beforeData: 'public long countActivePatients() { return 1; }', afterData: null,
    })] })]} loading={false} error={null} />);
    openHistory();
    fireEvent.click(screen.getByRole('button', { name: /Bản cập nhật #216/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem nội dung trước/sau' }));
    expect(screen.getByText('public long countActivePatients() { return 1; }')).toBeVisible();
    expect(screen.queryByText('Sau cập nhật')).not.toBeInTheDocument();
  });

  it('does not count rejected, pending, KEEP or unsaved REMOVE proposals as applied changes', () => {
    render(<SourceUpdateHistory updates={[update({ items: [
      item({ id: 1, action: 'CREATE', reviewStatus: 'MODIFIED' }),
      item({ id: 2, action: 'REMOVE', targetId: 2654, beforeData: null, afterData: null }),
      item({ id: 3, action: 'REMOVE', targetId: null, reason: 'Unsaved removal' }),
      item({ id: 4, action: 'CREATE', reviewStatus: 'REJECTED', reason: 'Rejected creation' }),
      item({ id: 5, action: 'KEEP', reason: 'Unchanged' }),
      item({ id: 6, action: 'UPDATE', reviewStatus: 'PENDING', reason: 'Pending change' }),
    ] })]} loading={false} error={null} />);
    openHistory();
    fireEvent.click(screen.getByRole('button', { name: /Bản cập nhật #216/ }));
    expect(screen.getByRole('heading', { name: 'Đã thêm (1)' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Đã sửa (0)' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Đã xóa (1)' })).toBeVisible();
    for (const excluded of ['Unsaved removal', 'Rejected creation', 'Unchanged', 'Pending change']) {
      expect(screen.queryByText(excluded)).not.toBeInTheDocument();
    }
  });

  it('keeps the old reference when removed artifacts no longer have payloads', () => {
    render(<SourceUpdateHistory updates={[update({ items: [item({
      action: 'REMOVE', targetId: 1907, beforeData: null, afterData: null,
    })] })]} loading={false} error={null} />);
    openHistory();
    fireEvent.click(screen.getByRole('button', { name: /Bản cập nhật #216/ }));
    expect(screen.getByText('Test Plan #1907')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Xem nội dung trước/sau' })).not.toBeInTheDocument();
  });

  it('excludes updates wholly belonging to another service', () => {
    render(<SourceUpdateHistory updates={[update()]} loading={false} error={null} servicePath="backend/doctor-service" />);
    openHistory();
    expect(screen.queryByRole('button', { name: /Bản cập nhật #216/ })).not.toBeInTheDocument();
    expect(screen.getByText('Chưa có bản cập nhật đã áp dụng.')).toBeVisible();
  });

  it.each(['{invalid', 'null', '{"changedMethods":null}', '{"changedMethods":[null]}'])(
    'keeps old history readable with explicit project scope for incomplete metadata %s', (impactSummary) => {
      render(<SourceUpdateHistory updates={[update({ impactSummary })]} loading={false} error={null} servicePath="backend/patient-service" />);
      openHistory();
      expect(screen.getByRole('button', { name: /Bản cập nhật #216/ })).toBeVisible();
      expect(screen.getByText('Phạm vi: toàn project')).toBeVisible();
    },
  );

  it('shows a fetch error independently of history content', () => {
    const view = render(<SourceUpdateHistory updates={[]} loading error={null} />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải lịch sử');
    view.rerender(<SourceUpdateHistory updates={[]} loading={false} error="Không tải được lịch sử" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được lịch sử');
  });
});
