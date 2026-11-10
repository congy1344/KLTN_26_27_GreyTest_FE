// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, act, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as adminApi from '../api/admin-api';
import { SystemHeartbeatPulseChart } from './SystemHeartbeatPulseChart';
import { LanguageProvider } from '../../../shared/i18n/language';
import { apiClient } from '../../../shared/api/api-client';

function renderWithProviders(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe('SystemHeartbeatPulseChart (Admin System Management)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.useRealTimers();
  });

  it('renders enterprise management dashboard without any test or simulation controls', () => {
    renderWithProviders(<SystemHeartbeatPulseChart serverThreadCount={28} serverActiveConnections={2} />);

    // Enterprise management header & stream info
    expect(screen.getByText(/Giám Sát Lưu Lượng Yêu Cầu & Quản Trị Tải Hệ Thống/i)).toBeInTheDocument();
    expect(screen.getByText(/(HTTP STREAM|DÒNG HTTP) · (PORT|CỔNG) 8080/i)).toBeInTheDocument();
    expect(screen.getByText(/Tường lửa WAF: Kích hoạt/i)).toBeInTheDocument();
    expect(screen.getAllByText(/100 req\/min\/IP/i).length).toBeGreaterThanOrEqual(1);

    // Management action buttons
    expect(screen.getByRole('button', { name: /Tạm dừng/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Làm mới/i })).toBeInTheDocument();

    // WAF Defense summary card placed at the top
    expect(screen.getByText(/Quản trị phòng thủ \(WAF & Rate Limiting\)/i)).toBeInTheDocument();
    expect(screen.getByText(/(Workers|Luồng): 28/i)).toBeInTheDocument();
    expect(screen.queryByText(/Trạng thái lưu lượng \(Traffic Status\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tốc độ lưu lượng \(Live Throughput\)/i)).not.toBeInTheDocument();

    // STRICT CHECK: Ensure test/simulation buttons are completely absent
    expect(screen.queryByRole('button', { name: /Gửi Request Thử/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tải cao/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /DDoS \/ Spam/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Chế độ mô phỏng/i)).not.toBeInTheDocument();
  });

  it('allows administrator to pause and resume the live stream to inspect traffic', () => {
    renderWithProviders(<SystemHeartbeatPulseChart serverThreadCount={25} serverActiveConnections={1} />);

    const pauseBtn = screen.getByRole('button', { name: /Tạm dừng/i });
    fireEvent.click(pauseBtn);

    expect(screen.getAllByText(/ĐANG TẠM DỪNG/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /Tiếp tục/i })).toBeInTheDocument();

    const resumeBtn = screen.getByRole('button', { name: /Tiếp tục/i });
    fireEvent.click(resumeBtn);

    expect(screen.queryAllByText(/ĐANG TẠM DỪNG/i).length).toBe(0);
    expect(screen.getByRole('button', { name: /Tạm dừng/i })).toBeInTheDocument();
  });

  it('updates live request logger when real HTTP requests are dispatched to backend', async () => {
    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = async (config) => ({
      config,
      status: 200,
      statusText: 'OK',
      headers: {} as any,
      data: { status: 'UP' },
    });

    try {
      renderWithProviders(<SystemHeartbeatPulseChart serverThreadCount={25} serverActiveConnections={1} />);

      expect(screen.getByText(/(REQUEST|YÊU CẦU) GẦN NHẤT:/i)).toBeInTheDocument();

      // Trigger an actual HTTP request via apiClient
      await act(async () => {
        await apiClient.get('/admin/overview');
      });

      expect(screen.getAllByText('/admin/overview').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('GET').length).toBeGreaterThanOrEqual(1);
    } finally {
      apiClient.defaults.adapter = originalAdapter;
    }
  });

  it('renders server-access.log terminal console with search, filters and action buttons in Vietnamese by default', () => {
    localStorage.setItem('greytest.language', 'vi');
    renderWithProviders(<SystemHeartbeatPulseChart serverThreadCount={25} serverActiveConnections={1} />);

    // Terminal console title and HTTP port
    expect(screen.getByText('server-access.log')).toBeInTheDocument();
    expect(screen.getByText('CỔNG HTTP 8080')).toBeInTheDocument();
    expect(screen.getByText('THEO DÕI TRỰC TIẾP')).toBeInTheDocument();

    // Search and filter controls
    expect(screen.getByRole('textbox', { name: 'Lọc nhật ký request' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tất cả' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '2xx Thành công' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Lỗi (4xx/5xx)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chậm (>300ms)' })).toBeInTheDocument();

    // Action buttons
    expect(screen.getByRole('button', { name: 'Tự cuộn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sao chép' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '.log' })).toBeInTheDocument();

    // Sort buttons and min latency
    expect(screen.getByRole('button', { name: 'Thời gian' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Độ trễ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mã trạng thái' })).toBeInTheDocument();
    expect(screen.getByText('Độ trễ tối thiểu (ms):')).toBeInTheDocument();

    // Section A Traffic Overview KPIs in Vietnamese
    const kpiContainer = screen.getByTestId('traffic-overview-kpis');
    expect(within(kpiContainer).getByText('Tổng yêu cầu')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Tốc độ hiện tại')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Độ trễ trung bình')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Độ trễ P95')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Độ trễ P99')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Tỷ lệ lỗi')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Kết nối hoạt động')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Bị từ chối (429)')).toBeInTheDocument();
    expect(screen.getByText(/TỔNG YÊU CẦU:/i)).toBeInTheDocument();
    expect(screen.getByText(/YÊU CẦU GẦN NHẤT:/i)).toBeInTheDocument();
  });

  it('renders server-access.log terminal console controls in English when English is selected', () => {
    localStorage.setItem('greytest.language', 'en');
    renderWithProviders(<SystemHeartbeatPulseChart serverThreadCount={25} serverActiveConnections={1} />);

    expect(screen.getByText('HTTP PORT 8080')).toBeInTheDocument();
    expect(screen.getByText('LIVE TAILING')).toBeInTheDocument();

    expect(screen.getByRole('textbox', { name: 'Filter request logs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /2xx Success/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Errors' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Slow (>300ms)' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Auto-scroll' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Timestamp' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Latency' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'HTTP Status' })).toBeInTheDocument();
    expect(screen.getByText('Min Latency (ms):')).toBeInTheDocument();

    // Section A Traffic Overview KPIs in English
    const kpiContainer = screen.getByTestId('traffic-overview-kpis');
    expect(within(kpiContainer).getByText('Total Requests')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Current RPS')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Avg Latency')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('P95 Latency')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('P99 Latency')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Error Rate')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Active Conn')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Rejected (429)')).toBeInTheDocument();
    expect(screen.getByText(/TOTAL REQUESTS:/i)).toBeInTheDocument();
    expect(screen.getByText(/LATEST REQUEST:/i)).toBeInTheDocument();
  });

  it('renders DDoS protection panel and toggles under attack mode', async () => {
    vi.spyOn(adminApi, 'toggleUnderAttackMode').mockResolvedValue({
      active: true,
      underAttackMode: true,
      rateLimitPerMinute: 30,
      burstLimitPerSecond: 15,
      totalBlockedRequests: 0,
      activeBlockedIpCount: 0,
      blockedIps: [],
    });

    renderWithProviders(<SystemHeartbeatPulseChart serverThreadCount={25} serverActiveConnections={1} />);

    // DDoS defense panel header
    expect(screen.getByText(/Biện Pháp Bảo Vệ & Phòng Thủ DDoS \/ Spam \(WAF Layer 7\)/i)).toBeInTheDocument();
    expect(screen.getByText(/WAF ACTIVE/i)).toBeInTheDocument();

    // Toggle Under Attack Mode button
    const attackBtn = screen.getByRole('button', { name: /Kích hoạt Chế độ Khẩn cấp \(Under Attack\)/i });
    expect(attackBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(attackBtn);
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByRole('button', { name: /ĐANG BẬT BẢO VỆ KHẨN CẤP/i })).toBeInTheDocument();

    // Rate limit presets
    expect(screen.getByRole('button', { name: '30' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '60' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '100' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '200' })).toBeInTheDocument();

    // Blacklist section
    expect(screen.getByText(/Danh sách IP bị cách ly \/ khóa tự động \(Automated IP Blacklist\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Khóa IP/i })).toBeInTheDocument();
  });

  it('refreshes telemetry when administrator clicks refresh button', () => {
    renderWithProviders(<SystemHeartbeatPulseChart serverThreadCount={25} serverActiveConnections={1} />);

    const refreshBtn = screen.getByRole('button', { name: /Làm mới/i });
    fireEvent.click(refreshBtn);

    expect(screen.getByText(/(BUFFER: 60s REALTIME|BỘ ĐỆM: 60s THỜI GIAN THỰC)/i)).toBeInTheDocument();
  });

  it('ensures waveform renders mountain peaks and never dips below baseline', async () => {
    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = async (config) => ({
      config,
      status: 200,
      statusText: 'OK',
      headers: {} as any,
      data: { success: true },
    });

    try {
      const { container } = renderWithProviders(<SystemHeartbeatPulseChart serverThreadCount={25} serverActiveConnections={1} />);

      // Trigger user requests
      await act(async () => {
        await apiClient.get('/projects');
      });

      // Advance time for mountain peak ticks
      act(() => {
        vi.advanceTimersByTime(300);
      });

      const polyline = container.querySelector('polyline');
      expect(polyline).toBeInTheDocument();
      const points = polyline?.getAttribute('points') || '';
      const coords = points.split(' ').map((p) => p.split(',').map(Number));

      // Check all y-coordinates are <= BASELINE_Y (82)
      for (const [, y] of coords) {
        expect(y).toBeLessThanOrEqual(82.5);
      }

      // Check at least one point elevated up into a mountain peak (y < 70)
      const hasPeak = coords.some(([, y]) => y < 70);
      expect(hasPeak).toBe(true);
    } finally {
      apiClient.defaults.adapter = originalAdapter;
    }
  });

  it('does not render peaks or log entries for internal polling endpoints', async () => {
    vi.spyOn(adminApi, 'fetchServerTelemetry').mockResolvedValue({
      totalRequests: 0,
      requestsPerMinute: 0,
      requestsPerSecond: 0,
      activeRequests: 0,
      rateLimitedCount: 0,
      logs: [],
    });
    vi.spyOn(adminApi, 'fetchWafStatus').mockResolvedValue({
      active: true,
      underAttackMode: false,
      rateLimitPerMinute: 100,
      burstLimitPerSecond: 15,
      totalBlockedRequests: 0,
      activeBlockedIpCount: 0,
      blockedIps: [],
    });

    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = async (config) => ({
      config,
      status: 200,
      statusText: 'OK',
      headers: {} as any,
      data: { success: true },
    });

    try {
      const { container } = renderWithProviders(<SystemHeartbeatPulseChart serverThreadCount={25} serverActiveConnections={1} />);

      await act(async () => {
        await apiClient.get('/admin/system/request-logs');
        await apiClient.get('/admin/system/security/waf-status');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.queryByText('/admin/system/request-logs')).not.toBeInTheDocument();
      expect(screen.queryByText('/admin/system/security/waf-status')).not.toBeInTheDocument();

      const polyline = container.querySelector('polyline');
      const points = polyline?.getAttribute('points') || '';
      const coords = points.split(' ').map((p) => p.split(',').map(Number));
      for (const [, y] of coords) {
        expect(y).toBe(82);
      }
    } finally {
      apiClient.defaults.adapter = originalAdapter;
    }
  });

  it('renders 8 Traffic Overview KPIs, rolling window selector, Endpoint Analytics and Traffic Alerts', async () => {
    vi.spyOn(adminApi, 'fetchTrafficOverview').mockResolvedValue({
      window: '1m',
      windowSeconds: 60,
      generatedAt: new Date().toISOString(),
      lifetimeTotalRequests: 150,
      windowTotalRequests: 40,
      currentRps: 3.5,
      averageRps: 0.67,
      peakRps: 9,
      avgLatencyMs: 28.4,
      p50LatencyMs: 22,
      p95LatencyMs: 74.5,
      p99LatencyMs: 112.0,
      maxLatencyMs: 140,
      errorRatePercent: 2.5,
      clientErrorRatePercent: 2.5,
      serverErrorRatePercent: 0,
      successCount: 39,
      clientErrorCount: 1,
      serverErrorCount: 0,
      activeConnections: 3,
      rejectedRequests: 2,
      windowRejectedRequests: 1,
      previousWindowRequests: 20,
      requestsChangePercent: 100.0,
      previousAverageRps: 0.33,
      rpsChangePercent: 103.0,
      previousAvgLatencyMs: 25.0,
      latencyChangePercent: 13.6,
      dataState: 'AVAILABLE',
    });

    vi.spyOn(adminApi, 'fetchEndpointAnalytics').mockResolvedValue({
      window: '1m',
      topByVolume: [
        {
          method: 'GET',
          endpoint: '/api/projects/{id}',
          requestCount: 25,
          avgLatencyMs: 18.2,
          p95LatencyMs: 42.0,
          maxLatencyMs: 65,
          errorCount: 0,
          clientError4xx: 0,
          serverError5xx: 0,
          errorRatePercent: 0,
        },
      ],
      topByLatency: [],
      topByErrorRate: [],
      methodDistribution: { GET: 35, POST: 5 },
      statusDistribution: { '2xx': 39, '4xx': 1 },
    });

    vi.spyOn(adminApi, 'fetchTrafficAlerts').mockResolvedValue([
      {
        id: 'alert-rate-limited',
        code: 'RATE_LIMIT_TRIGGERED',
        severity: 'INFO',
        title: 'Có request bị giới hạn tần suất (HTTP 429)',
        message: 'Bộ giới hạn tần suất đã từ chối 1 request trong cửa sổ 1m.',
        metricValue: '1 req',
        thresholdValue: '100 req/min/IP',
        triggeredAt: new Date().toISOString(),
      },
    ]);

    renderWithProviders(<SystemHeartbeatPulseChart serverThreadCount={25} serverActiveConnections={2} />);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Verify 8 KPI cards in Traffic Overview
    const kpiContainer = screen.getByTestId('traffic-overview-kpis');
    expect(kpiContainer).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Tổng yêu cầu')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Tốc độ hiện tại')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Độ trễ trung bình')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Độ trễ P95')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Độ trễ P99')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Tỷ lệ lỗi')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Kết nối hoạt động')).toBeInTheDocument();
    expect(within(kpiContainer).getByText('Bị từ chối (429)')).toBeInTheDocument();

    // Verify Window Selector (1m, 5m, 15m, 1h, 24h)
    expect(screen.getByRole('button', { name: '1 phút (60s)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5 phút' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '15 phút' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 giờ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '24 giờ' })).toBeInTheDocument();

    // Verify Endpoint Analytics and Traffic Alerts
    expect(screen.getByText('/api/projects/{id}')).toBeInTheDocument();
    expect(screen.getByText(/Có request bị giới hạn tần suất \(HTTP 429\)/i)).toBeInTheDocument();
  });

  it('toggles auto-scroll mode and handles log container scrolling correctly', () => {
    renderWithProviders(<SystemHeartbeatPulseChart serverThreadCount={25} serverActiveConnections={1} />);

    const autoScrollBtn = screen.getByRole('button', { name: /Auto-scroll|Tự cuộn/i });
    expect(autoScrollBtn).toHaveTextContent(/Auto-scroll|Tự cuộn/i);

    // Click to pause auto-scroll
    fireEvent.click(autoScrollBtn);
    expect(screen.getByRole('button', { name: /Scroll paused|Dừng cuộn/i })).toBeInTheDocument();

    // Click to resume auto-scroll
    fireEvent.click(screen.getByRole('button', { name: /Scroll paused|Dừng cuộn/i }));
    expect(screen.getByRole('button', { name: /Auto-scroll|Tự cuộn/i })).toBeInTheDocument();

    // User scrolls down: auto-scroll should pause
    const logContainer = screen.getByLabelText(/Server access log console/i);
    fireEvent.scroll(logContainer, { target: { scrollTop: 50 } });
    expect(screen.getByRole('button', { name: /Scroll paused|Dừng cuộn/i })).toBeInTheDocument();

    // User scrolls back to top: auto-scroll should resume
    fireEvent.scroll(logContainer, { target: { scrollTop: 0 } });
    expect(screen.getByRole('button', { name: /Auto-scroll|Tự cuộn/i })).toBeInTheDocument();
  });

  it('allows administrator to access IP ban features and open blacklist modal', () => {
    renderWithProviders(<SystemHeartbeatPulseChart serverThreadCount={25} serverActiveConnections={1} />);

    // Check Ban IP button is available on the log toolbar
    expect(screen.getByRole('button', { name: /^Ban IP/i })).toBeInTheDocument();

    // Click Ban IP on toolbar to open IP Blacklist Modal
    fireEvent.click(screen.getByRole('button', { name: /^Ban IP/i }));
    expect(screen.getByRole('dialog', { name: /IP Blacklist Modal/i })).toBeInTheDocument();
    expect(screen.getByText(/Quản Lý Danh Sách Khóa IP/i)).toBeInTheDocument();
  });

  it('allows administrator to reactivate WAF defense when disabled', async () => {
    vi.spyOn(adminApi, 'fetchWafStatus').mockResolvedValue({
      active: false,
      underAttackMode: false,
      rateLimitPerMinute: 100,
      burstLimitPerSecond: 50,
      totalBlockedRequests: 0,
      activeBlockedIpCount: 0,
      blockedIps: [],
    });
    const updateRateLimitSpy = vi.spyOn(adminApi, 'updateMonitoringRateLimit').mockResolvedValue({
      active: true,
      underAttackMode: false,
      rateLimitPerMinute: 100,
      burstLimitPerSecond: 50,
      totalBlockedRequests: 0,
      activeBlockedIpCount: 0,
      blockedIps: [],
    });

    renderWithProviders(<SystemHeartbeatPulseChart serverThreadCount={25} serverActiveConnections={1} />);

    // Fast-forward initial fetch
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const reactivateBtn = screen.getByRole('button', { name: /Kích hoạt lại WAF/i });
    expect(reactivateBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(reactivateBtn);
    });

    expect(updateRateLimitSpy).toHaveBeenCalledWith({ active: true });
  });

  it('allows administrator to ban IP via modal form and submits request to API', async () => {
    const blockIpSpy = vi.spyOn(adminApi, 'blockIp').mockResolvedValue({
      active: true,
      underAttackMode: false,
      rateLimitPerMinute: 100,
      burstLimitPerSecond: 50,
      totalBlockedRequests: 1,
      activeBlockedIpCount: 1,
      blockedIps: [{ ip: '1.2.3.4', reason: 'Test Ban', blockedAt: new Date().toISOString(), expiresAt: new Date().toISOString(), violationCount: 1 }],
    });

    renderWithProviders(<SystemHeartbeatPulseChart serverThreadCount={25} serverActiveConnections={1} />);

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /^Ban IP/i }));
    const modal = screen.getByRole('dialog', { name: /IP Blacklist Modal/i });
    expect(modal).toBeInTheDocument();

    // Fill form inside modal
    const ipInput = within(modal).getByPlaceholderText(/172\.20\.0\.1/i);
    fireEvent.change(ipInput, { target: { value: '1.2.3.4' } });

    // Submit form inside modal
    const banSubmitBtn = within(modal).getByRole('button', { name: /Khóa IP/i });
    await act(async () => {
      fireEvent.click(banSubmitBtn);
    });

    expect(blockIpSpy).toHaveBeenCalledWith('1.2.3.4', 'Admin manual blacklist', 15);
  });

  it('displays tooltip parameters and vertical indicator when user hovers over any point on the chart curve', () => {
    renderWithProviders(<SystemHeartbeatPulseChart serverThreadCount={25} serverActiveConnections={1} />);

    const svg = screen.getByLabelText(/HTTP traffic stream waveform/i);
    expect(svg).toBeInTheDocument();

    // Mock getBoundingClientRect for jsdom layout simulation
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      width: 600,
      height: 120,
      top: 0,
      left: 0,
      right: 600,
      bottom: 120,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    // Trigger mouse move to center of chart (relX = 0.5)
    fireEvent.mouseMove(svg, { clientX: 300 });

    // Check that tooltip displays parameters (timestamp, requests, 2xx)
    expect(screen.getAllByText(/Tổng yêu cầu:/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/2xx:/i)).toBeInTheDocument();
  });

  it('moves waves sequentially in chronological order where older waves stay ahead and never get overtaken', async () => {
    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = async (config) => ({
      config,
      status: 200,
      statusText: 'OK',
      headers: {} as any,
      data: { success: true },
    });

    try {
      const { container } = renderWithProviders(<SystemHeartbeatPulseChart serverThreadCount={25} serverActiveConnections={1} />);

      const getCoords = () => {
        const polyline = container.querySelector('polyline');
        const points = polyline?.getAttribute('points') || '';
        return points.split(' ').map((p) => p.split(',').map(Number));
      };

      // 1. First request at T0
      await act(async () => {
        await apiClient.get('/api/test-1');
      });

      const coordsT0 = getCoords();
      // Peak 1 should be at the rightmost edge (index 59, elevated above baseline 82)
      expect(coordsT0[59][1]).toBeLessThanOrEqual(65);

      // 2. Advance time by 2 seconds: Peak 1 shifts left by 2 indices (from 59 to 57)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      const coordsT2 = getCoords();
      // Wave has shifted to the left (peak moved away from index 59)
      const peakIdxT2 = coordsT2.reduce((minIdx, pt, idx) => (pt[1] < coordsT2[minIdx][1] ? idx : minIdx), 59);
      expect(peakIdxT2).toBeLessThan(59);
      expect(coordsT2[peakIdxT2][1]).toBeLessThanOrEqual(70);

      // 3. Second request arrives at T0 + 2s
      await act(async () => {
        await apiClient.get('/api/test-2');
      });

      const coordsFinal = getCoords();
      // Peak 2 (new request) is at the rightmost index 59
      expect(coordsFinal[59][1]).toBeLessThanOrEqual(65);
      // Older wave is still ahead to the left (index < 59)
      expect(coordsFinal[peakIdxT2][1]).toBeLessThanOrEqual(70);
    } finally {
      apiClient.defaults.adapter = originalAdapter;
    }
  });
});
