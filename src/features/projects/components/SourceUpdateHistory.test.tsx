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

  it('excludes METHOD items from history and renders raw text for QA artifacts without JSON', () => {
    render(<SourceUpdateHistory updates={[update({ items: [
      item({ targetType: 'METHOD', targetKey: 'demo.PatientService#countActivePatients()', action: 'REMOVE' }),
      item({
        targetType: 'UNIT_TEST', targetId: 501, action: 'REMOVE',
        beforeData: 'public void testCount() { assertEquals(1, service.count()); }', afterData: null,
      }),
    ] })]} loading={false} error={null} />);
    openHistory();
    fireEvent.click(screen.getByRole('button', { name: /Bản cập nhật #216/ }));
    expect(screen.queryByText(/countActivePatients/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xem nội dung trước/sau' }));
    expect(screen.getByText('public void testCount() { assertEquals(1, service.count()); }')).toBeVisible();
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
    expect(screen.getByText('Test Plan')).toBeVisible();
    expect(screen.queryByText('Test Plan #1907')).not.toBeInTheDocument();
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
      expect(screen.getByText('Phạm vi: toàn dự án')).toBeVisible();
    },
  );

  it('shows a fetch error independently of history content', () => {
    const view = render(<SourceUpdateHistory updates={[]} loading error={null} />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải lịch sử');
    view.rerender(<SourceUpdateHistory updates={[]} loading={false} error="Không tải được lịch sử" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được lịch sử');
  });

  it('excludes database IDs and only renders essential fields for Test Case, Test Plan and Unit Test', () => {
    const tcItem = item({
      id: 10,
      targetType: 'TEST_CASE',
      targetId: 4714,
      action: 'CREATE',
      beforeData: JSON.stringify({
        id: 4714,
        testPlanId: 99,
        caseCode: 'TC-01',
        description: 'Kiểm tra đặt hẹn',
        preconditions: 'appointmentRepository.findById(id)',
        traceSource: 'AST_HELPER_INTERNAL',
        version: 1,
      }),
      afterData: null,
    });
    render(<SourceUpdateHistory updates={[update({ items: [tcItem] })]} loading={false} error={null} />);
    openHistory();
    fireEvent.click(screen.getByRole('button', { name: /Bản cập nhật #216/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem nội dung trước/sau' }));
    expect(screen.getByText('Mã test case:')).toBeVisible();
    expect(screen.getByText('TC-01')).toBeVisible();
    expect(screen.getByText('Kiểm tra đặt hẹn')).toBeVisible();
    expect(screen.getByText('appointmentRepository.findById(id)')).toBeVisible();
    expect(screen.getByText(/Chưa có/)).toBeVisible();
    expect(screen.queryByText('traceSource')).not.toBeInTheDocument();
    expect(screen.queryByText('AST_HELPER_INTERNAL')).not.toBeInTheDocument();
  });

  it('handles action UPDATE when no business fields changed by showing no changes notice', () => {
    const noChangeItem = item({
      id: 11,
      targetType: 'BUSINESS_RULE',
      targetId: 50,
      action: 'UPDATE',
      beforeData: JSON.stringify({ id: 50, ruleCode: 'BR-01', description: 'Cùng mô tả', version: 1 }),
      afterData: JSON.stringify({ id: 50, ruleCode: 'BR-01', description: 'Cùng mô tả', version: 2 }),
    });
    render(<SourceUpdateHistory updates={[update({ items: [noChangeItem] })]} loading={false} error={null} />);
    openHistory();
    fireEvent.click(screen.getByRole('button', { name: /Bản cập nhật #216/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem nội dung trước/sau' }));
    expect(screen.getAllByText('Không có nội dung thay đổi').length).toBeGreaterThan(0);
  });

  it('renders clean labels without trailing IDs for all target types', () => {
    const brItem = item({ id: 21, targetType: 'BUSINESS_RULE', targetId: 6314, action: 'CREATE' });
    const tcItem = item({ id: 22, targetType: 'TEST_CASE', targetId: 4714, action: 'CREATE' });
    const utItem = item({ id: 23, targetType: 'UNIT_TEST', targetId: 991, action: 'CREATE' });
    const methodItem = item({ id: 24, targetType: 'METHOD', targetKey: 'com.demo.Service#work()', action: 'CREATE' });

    render(<SourceUpdateHistory updates={[update({ items: [brItem, tcItem, utItem, methodItem] })]} loading={false} error={null} />);
    openHistory();
    fireEvent.click(screen.getByRole('button', { name: /Bản cập nhật #216/ }));

    expect(screen.getByText('Business Rule')).toBeVisible();
    expect(screen.queryByText('Business Rule #6314')).not.toBeInTheDocument();

    expect(screen.getByText('Test Case')).toBeVisible();
    expect(screen.queryByText('Test Case #4714')).not.toBeInTheDocument();

    expect(screen.getByText('Unit Test')).toBeVisible();
    expect(screen.queryByText('Unit Test #991')).not.toBeInTheDocument();

    expect(screen.queryByText('Method')).not.toBeInTheDocument();
  });

  it('safely handles update without items and renders array fields without object-Object artifact', () => {
    // Null/undefined items safety
    const emptyUpdate = update({ id: 217, items: undefined as unknown as SourceUpdateItemDto[] });
    const { unmount } = render(<SourceUpdateHistory updates={[emptyUpdate]} loading={false} error={null} />);
    openHistory();
    expect(screen.getByRole('button', { name: /Bản cập nhật #217/ })).toBeVisible();
    unmount();

    // Complex array formatting
    const arrayItem = item({
      id: 30,
      targetType: 'TEST_CASE',
      targetId: 4715,
      action: 'UPDATE',
      beforeData: JSON.stringify({ steps: ['Bước 1: Mở form', 'Bước 2: Gửi yêu cầu'] }),
      afterData: JSON.stringify({ steps: ['Bước 1: Mở form', 'Bước 2: Xác thực OTP', 'Bước 3: Gửi yêu cầu'] }),
    });
    render(<SourceUpdateHistory updates={[update({ id: 218, items: [arrayItem] })]} loading={false} error={null} />);
    openHistory();
    fireEvent.click(screen.getByRole('button', { name: /Bản cập nhật #218/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem nội dung trước/sau' }));

    expect(screen.getByText('Bước 2: Xác thực OTP')).toBeVisible();
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
  });

  it('renders fallback notice when a changed field only exists on one side', () => {
    const oneSidedItem = item({
      id: 31,
      targetType: 'BUSINESS_RULE',
      targetId: 51,
      action: 'UPDATE',
      beforeData: JSON.stringify({ description: 'Chưa có điều kiện' }),
      afterData: JSON.stringify({ description: 'Chưa có điều kiện', condition: 'status === ACTIVE' }),
    });
    render(<SourceUpdateHistory updates={[update({ id: 219, items: [oneSidedItem] })]} loading={false} error={null} />);
    openHistory();
    fireEvent.click(screen.getByRole('button', { name: /Bản cập nhật #219/ }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Xem nội dung trước/sau' })[0]);

    expect(screen.getByText('(Chưa có trước cập nhật)')).toBeVisible();
    expect(screen.getByText('status === ACTIVE')).toBeVisible();
  });

  it('correctly parses and renders newly generated Unit Test with snake_case payload and target key', () => {
    const utItem = item({
      id: 32,
      targetType: 'UNIT_TEST',
      targetId: null,
      targetKey: 'case:4720',
      action: 'CREATE',
      reason: 'Unit Test mới sinh tăng dần từ AI',
      afterData: JSON.stringify({
        case_id: 4720,
        test_class_name: 'AppointmentServiceTest',
        test_method_name: 'testUpdateAppointment',
        package_name: 'com.hospital.appointment.service',
        generation_type: 'NEW_TEST',
        source_code: '@Test\nvoid testUpdateAppointment() {\n    // verify update logic\n}',
      }),
      beforeData: null,
    });
    render(<SourceUpdateHistory updates={[update({ id: 366, items: [utItem] })]} loading={false} error={null} />);
    openHistory();
    fireEvent.click(screen.getByRole('button', { name: /Bản cập nhật #366/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem nội dung trước/sau' }));

    expect(screen.getByText(/Test Case #4720/)).toBeVisible();
    expect(screen.getByText('Class kiểm thử:')).toBeVisible();
    expect(screen.getByText('AppointmentServiceTest')).toBeVisible();
    expect(screen.getByText('Method kiểm thử:')).toBeVisible();
    expect(screen.getByText('testUpdateAppointment')).toBeVisible();
    expect(screen.getByText('Mã nguồn kiểm thử:')).toBeVisible();
    expect(screen.getByText(/void testUpdateAppointment\(\)/)).toBeVisible();
    expect(screen.queryByText('Không có nội dung thay đổi')).not.toBeInTheDocument();
    expect(screen.queryByText('case_id')).not.toBeInTheDocument();
    expect(screen.queryByText('generation_type')).not.toBeInTheDocument();
  });

  it('displays total execution time when update has createdAt and updatedAt', () => {
    const timedUpdate = update({
      id: 406,
      createdAt: '2026-11-05T09:35:18Z',
      updatedAt: '2026-11-05T09:39:17Z',
    });
    render(<SourceUpdateHistory updates={[timedUpdate]} loading={false} error={null} />);
    openHistory();
    expect(screen.getByText(/Tổng thời gian: 3m 59s/)).toBeVisible();
  });
});
