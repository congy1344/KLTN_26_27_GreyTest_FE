import { IconButton } from '../../../shared/components/IconButton';
import { Activity, AlertCircle, AlertTriangle, ArrowDownCircle, ArrowUpCircle, ArrowUpDown, BarChart3, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleDot, Clock, Copy, Download, Eye, Flame, Info, Lock, Pause, Play, Plus, RefreshCw, Search, Shield, ShieldAlert, ShieldCheck, ShieldOff, Terminal, Trash2, UserX, Wifi, WifiOff, X } from 'lucide-react';
import { Tag, type TagTone } from '../../../shared/components/Tag';
import { SelectMenu } from '../../../shared/components/SelectMenu';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  blockIp,
  fetchEndpointAnalytics,
  fetchRecentRequests,
  fetchServerTelemetry,
  fetchTrafficAlerts,
  fetchTrafficOverview,
  fetchTrafficTimeseries,
  fetchWafStatus,
  toggleUnderAttackMode,
  unblockIp,
  updateMonitoringRateLimit,
  updateRateLimit,
} from '../api/admin-api';
import type {
  EndpointAnalytics,
  MonitoringDataState,
  MonitoringStreamState,
  MonitoringWindow,
  ServerRequestLog,
  ServerTelemetry,
  TrafficAlert,
  TrafficOverview,
  TrafficStreamSnapshot,
  TrafficTimeseries,
  TrafficTimeseriesPoint,
  WafStatus,
} from '../types';
import { getLiveRequestMetrics, RequestTelemetryRecord, subscribeRequestTelemetry } from '../../../shared/api/api-client';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useLanguage } from '../../../shared/i18n/language';

interface SystemHeartbeatPulseChartProps {
  serverThreadCount?: number;
  serverActiveConnections?: number;
}

const WINDOWS: Array<{ id: MonitoringWindow; labelVi: string; labelEn: string }> = [
  { id: '1m', labelVi: '1 phút (60s)', labelEn: '1m (60s)' },
  { id: '5m', labelVi: '5 phút', labelEn: '5m' },
  { id: '15m', labelVi: '15 phút', labelEn: '15m' },
  { id: '1h', labelVi: '1 giờ', labelEn: '1h' },
  { id: '24h', labelVi: '24 giờ', labelEn: '24h' },
];

function formatLogTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return timestamp;
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
  } catch {
    return timestamp;
  }
}

function cleanIp(ip?: string): string {
  return (ip || '').replace(/\s*\(Client\)$/i, '').trim();
}

function formatShortTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return timestamp;
    return d.toTimeString().split(' ')[0];
  } catch {
    return timestamp;
  }
}

function getStatusText(status: number): string {
  if (status === 200) return 'OK';
  if (status === 201) return 'CREATED';
  if (status === 204) return 'NO_CONTENT';
  if (status === 400) return 'BAD_REQ';
  if (status === 401) return 'UNAUTH';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMIT';
  if (status >= 500) return 'SERVER_ERR';
  return '';
}

function createInitialPoints(count = 60): TrafficTimeseriesPoint[] {
  const nowSec = Math.floor(Date.now() / 1000);
  const pts: TrafficTimeseriesPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    pts.push({
      timestamp: new Date((nowSec - i) * 1000).toISOString(),
      rps: 0,
      totalRequests: 0,
      success2xx: 0,
      clientError4xx: 0,
      serverError5xx: 0,
      rateLimited429: 0,
      avgLatencyMs: null,
      p95LatencyMs: null,
      spike: false,
    });
  }
  return pts;
}

/**
 * Bảng điều khiển Giám sát Lưu lượng HTTP Thời gian thực & Kiểm soát Tải (Observability & WAF Dashboard).
 * Thiết kế theo hướng SonarQube / Modern Technical Observability Dashboard:
 * A. Traffic Overview (8 KPIs thực tế, có trạng thái LOADING / AVAILABLE / NO_DATA / ERROR & so sánh kỳ trước).
 * B. Real-time Traffic Chart (Multi-series 2xx / 4xx / 5xx, chọn cửa sổ 1m/5m/15m/1h/24h, tooltip, ngắt đoạn khi DISCONNECTED).
 * C. Recent Requests Table & Console (Tìm kiếm, lọc method/status/latency, sắp xếp, phân trang, xem chi tiết request an toàn).
 * D. Endpoint Analytics (Top Volume, Top Latency, Top Error Rate, phân bổ theo Method & Status).
 * E. Traffic Alerts & Request Control (Cảnh báo khách quan INFO/WARNING/CRITICAL, cấu hình Rate Limit/Under Attack có xác nhận).
 */
export function SystemHeartbeatPulseChart({
  serverThreadCount = 25,
  serverActiveConnections = 1,
}: SystemHeartbeatPulseChartProps) {
  const { language } = useLanguage();
  const [selectedWindow, setSelectedWindow] = useState<MonitoringWindow>('1m');
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  // Trạng thái kết nối stream & dữ liệu
  const [streamState, setStreamState] = useState<MonitoringStreamState>('CONNECTING');
  const [dataState, setDataState] = useState<MonitoringDataState>('LOADING');
  const [rateLimitedCount, setRateLimitedCount] = useState<number>(0);

  // Dữ liệu từ Backend
  const [overview, setOverview] = useState<TrafficOverview | null>(null);
  const [timeseries, setTimeseries] = useState<TrafficTimeseries>({
    window: '1m',
    bucketSeconds: 1,
    warningRpsThreshold: 10,
    criticalRpsThreshold: 25,
    points: createInitialPoints(60),
  });
  const [endpointAnalytics, setEndpointAnalytics] = useState<EndpointAnalytics | null>(null);
  const [alerts, setAlerts] = useState<TrafficAlert[]>([]);
  const [serverTelemetry, setServerTelemetry] = useState<ServerTelemetry | null>(null);
  const [serverLogs, setServerLogs] = useState<ServerRequestLog[]>([]);

  // Dữ liệu tức thời từ apiClient (client-side observer)
  const [realMetrics, setRealMetrics] = useState(() => getLiveRequestMetrics());
  const [lastRequest, setLastRequest] = useState<RequestTelemetryRecord | null>(null);

  // Tùy chọn hiển thị Series trên biểu đồ
  const [visibleSeries, setVisibleSeries] = useState({
    total: true,
    success2xx: true,
    clientError4xx: true,
    serverError5xx: true,
  });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Bộ lọc bảng Recent Requests & Log Console
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | '2xx' | 'err' | 'slow'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [minLatencyFilter, setMinLatencyFilter] = useState<string>('');
  const [sortField, setSortField] = useState<'timestamp' | 'durationMs' | 'status'>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const pageSize = 15;
  const [selectedRequest, setSelectedRequest] = useState<ServerRequestLog | null>(null);

  // Tab Endpoint Analytics
  const [analyticsTab, setAnalyticsTab] = useState<'volume' | 'latency' | 'errors'>('volume');

  // Auto-scroll & Copy cho console
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Baseline cho trục Y của SVG (82 = đường đáy đồ thị, đỉnh nhô lên trên với y <= 82)
  const BASELINE_Y = 82;

  // Trạng thái WAF & Phòng thủ
  const [wafStatus, setWafStatus] = useState<WafStatus>({
    active: true,
    underAttackMode: false,
    rateLimitPerMinute: 100,
    standardRateLimitPerMinute: 100,
    underAttackRateLimitPerMinute: 30,
    burstLimitPerSecond: 15,
    totalBlockedRequests: 0,
    activeBlockedIpCount: 0,
    blockedIps: [],
  });
  const [isTogglingAttackMode, setIsTogglingAttackMode] = useState(false);
  const [isTogglingWafActive, setIsTogglingWafActive] = useState(false);
  const [confirmWafDisableOpen, setConfirmWafDisableOpen] = useState(false);
  const [confirmBlockIpTarget, setConfirmBlockIpTarget] = useState<string | null>(null);
  const [confirmUnblockIpTarget, setConfirmUnblockIpTarget] = useState<string | null>(null);
  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false);
  const [manualIpToBlock, setManualIpToBlock] = useState('');
  const [manualBlockReason, setManualBlockReason] = useState('');
  const [isBlockingIp, setIsBlockingIp] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const seenServerLogIdsRef = useRef<Set<string>>(new Set());
  const sseActiveRef = useRef<boolean>(false);
  const selectedWindowRef = useRef<MonitoringWindow>(selectedWindow);
  selectedWindowRef.current = selectedWindow;

  const mergeAuthoritativeServerLogs = useCallback((incoming: ServerRequestLog[], prev: ServerRequestLog[]): ServerRequestLog[] => {
    if (!Array.isArray(incoming) || incoming.length === 0) return prev;
    for (const log of incoming) {
      if (log.id && !seenServerLogIdsRef.current.has(log.id)) {
        seenServerLogIdsRef.current.add(log.id);
      }
    }
    const seenIds = new Set(incoming.map((l) => l.id));
    // Khi đã có dữ liệu chính thức từ Backend, loại bỏ các bản ghi tạm phía client ('127.0.0.1 (Client)')
    // để tổng số dòng trong server-access.log khớp chính xác với TỔNG REQUEST trên đồ thị.
    const filteredPrev = prev.filter((l) => !seenIds.has(l.id) && l.clientIp !== '127.0.0.1 (Client)');
    const merged = [...incoming, ...filteredPrev];
    merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return merged.slice(0, 200);
  }, []);

  // Đồng bộ toàn bộ dữ liệu giám sát từ Backend
  const syncAllMonitoringData = useCallback(async (win: MonitoringWindow = selectedWindow, isPeriodicPoll = false) => {
    try {
      const sseStreaming1m = isPeriodicPoll && sseActiveRef.current && win === '1m';

      fetchServerTelemetry({ limit: 80 })
        .then((data) => {
          if (!data) return;
          setServerTelemetry(data);
          if (Array.isArray(data.logs) && data.logs.length > 0) {
            setServerLogs((prev) => mergeAuthoritativeServerLogs(data.logs, prev));
          }
        })
        .catch(() => { });

      fetchEndpointAnalytics(win, 8)
        .then((ep) => {
          if (ep) {
            setEndpointAnalytics(ep);
          }
        })
        .catch(() => { });

      // Khi SSE đang kết nối ổn định ở cửa sổ 1m, các dữ liệu overview/waf/alerts/logs/timeseries
      // đã được đẩy realtime qua SSE mỗi giây nên không gọi lặp lại qua REST polling.
      if (sseStreaming1m) {
        return;
      }

      if (!isPeriodicPoll) {
        fetchRecentRequests({ page: 0, size: 80 })
          .then((res) => {
            if (!res || !Array.isArray(res.content)) return;
            if (res.content.length > 0) {
              setServerLogs((prev) => mergeAuthoritativeServerLogs(res.content, prev));
            }
          })
          .catch(() => { });
      }

      fetchWafStatus()
        .then((waf) => {
          if (waf && Array.isArray(waf.blockedIps)) {
            setWafStatus(waf);
          }
        })
        .catch(() => { });

      fetchTrafficOverview(win)
        .then((ov) => {
          if (!ov) return;
          setOverview(ov);
          setDataState(ov.dataState || (ov.windowTotalRequests > 0 ? 'AVAILABLE' : 'NO_DATA'));
          setStreamState((prev) =>
            prev === 'CONNECTING' || prev === 'RECONNECTING' || prev === 'DISCONNECTED' ? 'CONNECTED' : prev
          );
        })
        .catch(() => { });

      fetchTrafficTimeseries(win)
        .then((ts) => {
          if (ts && Array.isArray(ts.points)) {
            setTimeseries(ts);
          }
        })
        .catch(() => { });

      fetchTrafficAlerts(win)
        .then((al) => {
          if (Array.isArray(al)) {
            setAlerts(al);
          }
        })
        .catch(() => { });
    } catch {
      setStreamState('DISCONNECTED');
      setDataState((prev) => (prev === 'LOADING' ? 'ERROR' : prev));
    }
  }, [selectedWindow, mergeAuthoritativeServerLogs]);

  // Kết nối SSE thời gian thực (/api/admin/monitoring/stream) + fallback polling an toàn
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let initTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isUnmounted = false;
    let retryAttempt = 0;

    const connectSse = () => {
      if (isUnmounted || typeof EventSource === 'undefined') {
        return;
      }
      try {
        setStreamState((prev) => (prev === 'CONNECTED' ? 'RECONNECTING' : 'CONNECTING'));
        const token = localStorage.getItem('greytest.token') || '';
        const url = token
          ? `/api/admin/monitoring/stream?token=${encodeURIComponent(token)}`
          : '/api/admin/monitoring/stream';
        eventSource = new EventSource(url);

        eventSource.onopen = () => {
          if (!isUnmounted) {
            retryAttempt = 0;
            sseActiveRef.current = true;
            setStreamState('CONNECTED');
          }
        };

        eventSource.addEventListener('snapshot', (event: MessageEvent) => {
          if (isUnmounted || isPausedRef.current) return;
          try {
            const snap: TrafficStreamSnapshot = JSON.parse(event.data);
            retryAttempt = 0;
            sseActiveRef.current = true;
            setStreamState('CONNECTED');
            if (snap.overview && selectedWindowRef.current === '1m') {
              setOverview(snap.overview);
              setDataState(snap.overview.dataState);
            }
            if (snap.rateLimit && Array.isArray(snap.rateLimit.blockedIps)) {
              setWafStatus(snap.rateLimit);
            }
            if (Array.isArray(snap.alerts) && selectedWindowRef.current === '1m') {
              setAlerts(snap.alerts);
            }
            if (Array.isArray(snap.recentRequests) && snap.recentRequests.length > 0) {
              setServerLogs((prev) => mergeAuthoritativeServerLogs(snap.recentRequests, prev));
            }
            if (snap.latestPoint && selectedWindowRef.current === '1m') {
              setTimeseries((prev) => {
                const nextPts = [...prev.points];
                const lastIdx = nextPts.length - 1;
                const snapSec = Math.floor(new Date(snap.latestPoint.timestamp).getTime() / 1000);
                const lastSec = lastIdx >= 0 ? Math.floor(new Date(nextPts[lastIdx].timestamp).getTime() / 1000) : 0;
                if (lastIdx >= 0 && snapSec === lastSec) {
                  nextPts[lastIdx] = snap.latestPoint;
                } else if (snapSec > lastSec) {
                  nextPts.push(snap.latestPoint);
                  while (nextPts.length > 60) nextPts.shift();
                }
                return { ...prev, points: nextPts };
              });
            }
          } catch {
            // Bỏ qua gói tin SSE lỗi định dạng
          }
        });

        eventSource.addEventListener('heartbeat', () => {
          if (!isUnmounted) {
            sseActiveRef.current = true;
            setStreamState('CONNECTED');
          }
        });

        eventSource.onerror = () => {
          if (isUnmounted) return;
          sseActiveRef.current = false;
          setStreamState('RECONNECTING');
          // Ghi nhận điểm gián đoạn kết nối trên chuỗi thời gian để không nối đường giả
          setTimeseries((prev) => {
            if (prev.points.length === 0) return prev;
            const copy = [...prev.points];
            copy[copy.length - 1] = { ...copy[copy.length - 1], disconnectedGap: true };
            return { ...prev, points: copy };
          });
          eventSource?.close();
          const backoffMs = Math.min(30000, 4000 * Math.pow(2, retryAttempt));
          retryAttempt = Math.min(retryAttempt + 1, 4);
          reconnectTimer = setTimeout(connectSse, backoffMs);
        };
      } catch {
        sseActiveRef.current = false;
        setStreamState('DISCONNECTED');
      }
    };

    // Trong môi trường trình duyệt thực (React StrictMode dev mount-unmount-mount),
    // trì hoãn 100ms để lần mount giả đầu tiên bị hủy trước khi mở kết nối EventSource,
    // tránh trình duyệt báo "GET .../monitoring/stream net::ERR_FAILED" do đóng sớm.
    const isTestEnv = typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: { MODE?: string } }).env?.MODE === 'test';
    if (isTestEnv) {
      connectSse();
    } else {
      initTimer = setTimeout(connectSse, 100);
    }

    return () => {
      isUnmounted = true;
      sseActiveRef.current = false;
      if (initTimer) clearTimeout(initTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      eventSource?.close();
    };
  }, [mergeAuthoritativeServerLogs]);

  // Đồng bộ định kỳ (Polling 5s cho dữ liệu theo cửa sổ chọn và Analytics)
  useEffect(() => {
    syncAllMonitoringData(selectedWindow, false);
    const interval = setInterval(() => {
      if (!isPausedRef.current) {
        syncAllMonitoringData(selectedWindow, true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedWindow, syncAllMonitoringData]);

  // Lắng nghe trực tiếp các request từ apiClient để phản hồi tức thì trên biểu đồ và log
  useEffect(() => {
    const unsubscribe = subscribeRequestTelemetry((record) => {
      if (isPausedRef.current) return;

      if (
        record.url &&
        (record.url.includes('/admin/system/request-logs') ||
          record.url.includes('/admin/system/security/waf-status') ||
          record.url.includes('/admin/monitoring/') ||
          record.url.includes('/admin/telemetry'))
      ) {
        return;
      }

      setLastRequest(record);
      setRealMetrics(getLiveRequestMetrics());

      if (record.status === 429) {
        setRateLimitedCount((prev) => prev + 1);
      }

      // Ghi nhận request thực tế để hiển thị tức thì trên đồ thị và nhật ký server-access.log
      if (record.durationMs !== undefined) {
        const localLog: ServerRequestLog = {
          id: record.id,
          timestamp: new Date(record.timestamp).toISOString(),
          method: record.method,
          uri: record.url,
          routeTemplate: record.url,
          status: record.status ?? 200,
          durationMs: record.durationMs,
          clientIp: '127.0.0.1 (Client)',
          userEmail: localStorage.getItem('greytest.user_email') || 'admin@gmail.com',
          requestType: record.url.startsWith('/admin') ? 'ADMIN_API' : 'USER_API',
        };
        setServerLogs((prev) => {
          if (prev.some((p) => p.id === localLog.id)) return prev;
          return [localLog, ...prev.slice(0, 200)];
        });
        setDataState('AVAILABLE');
      }
    });

    return () => unsubscribe();
  }, []);

  // Vòng lặp cập nhật dòng thời gian thực mỗi 1 giây (đảm bảo sóng di chuyển tuần tự, đồng tốc từ phải qua trái)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPaused) return;

      setRealMetrics(getLiveRequestMetrics());

      // Trong cửa sổ 1m (60 giây), đẩy dòng thời gian tiến lên 1 giây đồng nhất
      if (selectedWindowRef.current === '1m') {
        setTimeseries((prev) => {
          if (prev.points.length === 0) return prev;
          const nextPts = [...prev.points];
          const nowSec = Math.floor(Date.now() / 1000);
          const lastIdx = nextPts.length - 1;
          const lastSec = Math.floor(new Date(nextPts[lastIdx].timestamp).getTime() / 1000);

          if (nowSec > lastSec) {
            // Đã sang giây tiếp theo: thêm bucket mới cho giây hiện tại và loại bỏ bucket cũ nhất
            const newPoint: TrafficTimeseriesPoint = {
              timestamp: new Date(nowSec * 1000).toISOString(),
              rps: 0,
              totalRequests: 0,
              success2xx: 0,
              clientError4xx: 0,
              serverError5xx: 0,
              rateLimited429: 0,
              avgLatencyMs: null,
              p95LatencyMs: null,
              spike: false,
            };
            nextPts.push(newPoint);
            while (nextPts.length > 60) nextPts.shift();
            return { ...prev, points: nextPts };
          }
          return prev;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Các chỉ số KPI tổng hợp (ưu tiên dữ liệu từ Backend Overview / ServerTelemetry)
  const totalRequestsCount = useMemo(() => {
    if (overview?.lifetimeTotalRequests != null && overview.lifetimeTotalRequests > 0) {
      return overview.lifetimeTotalRequests;
    }
    return serverTelemetry?.totalRequests ?? realMetrics.totalRequests;
  }, [overview?.lifetimeTotalRequests, serverTelemetry?.totalRequests, realMetrics.totalRequests]);

  const windowTotalRequests = useMemo(() => {
    if (overview?.windowTotalRequests != null) {
      return overview.windowTotalRequests;
    }
    return totalRequestsCount;
  }, [overview?.windowTotalRequests, totalRequestsCount]);

  const displayRpm = useMemo(() => {
    return serverTelemetry?.requestsPerMinute ?? realMetrics.requestsPerMinute;
  }, [serverTelemetry?.requestsPerMinute, realMetrics.requestsPerMinute]);

  const currentRpsValue = useMemo(() => {
    if (overview?.currentRps != null) return overview.currentRps;
    if (serverTelemetry?.requestsPerSecond != null) return serverTelemetry.requestsPerSecond;
    return realMetrics.requestsPerSecond;
  }, [overview?.currentRps, serverTelemetry?.requestsPerSecond, realMetrics.requestsPerSecond]);

  const displayRps = useMemo(() => currentRpsValue.toFixed(2), [currentRpsValue]);

  const effectiveRateLimited = useMemo(() => {
    return Math.max(
      overview?.rejectedRequests ?? 0,
      wafStatus.totalBlockedRequests ?? 0,
      serverTelemetry?.rateLimitedCount ?? 0,
      rateLimitedCount
    );
  }, [overview?.rejectedRequests, wafStatus.totalBlockedRequests, serverTelemetry?.rateLimitedCount, rateLimitedCount]);

  const effectiveActiveConnections = useMemo(() => {
    return (overview?.activeConnections ?? serverTelemetry?.activeRequests ?? 0) + serverActiveConnections;
  }, [overview?.activeConnections, serverTelemetry?.activeRequests, serverActiveConnections]);

  // Tính toán fallback Latency & Error Rate từ serverLogs nếu overview chưa có mẫu
  const computedLogStats = useMemo(() => {
    if (serverLogs.length === 0) {
      return {
        avgLatencyMs: null as number | null,
        p95LatencyMs: null as number | null,
        p99LatencyMs: null as number | null,
        errorRatePercent: null as number | null,
        clientErrorRatePercent: null as number | null,
        serverErrorRatePercent: null as number | null,
      };
    }
    const durations = serverLogs.map((l) => l.durationMs).sort((a, b) => a - b);
    const sum = durations.reduce((acc, v) => acc + v, 0);
    const avg = Math.round((sum / durations.length) * 100) / 100;
    const p95Idx = Math.min(durations.length - 1, Math.floor(durations.length * 0.95));
    const p99Idx = Math.min(durations.length - 1, Math.floor(durations.length * 0.99));
    const c4xx = serverLogs.filter((l) => l.status >= 400 && l.status < 500).length;
    const s5xx = serverLogs.filter((l) => l.status >= 500).length;
    const totalErr = c4xx + s5xx;
    return {
      avgLatencyMs: avg,
      p95LatencyMs: durations[p95Idx],
      p99LatencyMs: durations[p99Idx],
      errorRatePercent: Math.round(((totalErr * 100) / durations.length) * 100) / 100,
      clientErrorRatePercent: Math.round(((c4xx * 100) / durations.length) * 100) / 100,
      serverErrorRatePercent: Math.round(((s5xx * 100) / durations.length) * 100) / 100,
    };
  }, [serverLogs]);

  const avgLatencyMs = overview?.avgLatencyMs ?? computedLogStats.avgLatencyMs;
  const p95LatencyMs = overview?.p95LatencyMs ?? computedLogStats.p95LatencyMs;
  const p99LatencyMs = overview?.p99LatencyMs ?? computedLogStats.p99LatencyMs;
  const errorRatePercent = overview?.errorRatePercent ?? computedLogStats.errorRatePercent;
  const clientErrorRatePercent = overview?.clientErrorRatePercent ?? computedLogStats.clientErrorRatePercent;
  const serverErrorRatePercent = overview?.serverErrorRatePercent ?? computedLogStats.serverErrorRatePercent;

  const hasTrafficData = totalRequestsCount > 0 || serverLogs.length > 0;
  const effectiveDataState: MonitoringDataState = hasTrafficData ? 'AVAILABLE' : dataState === 'LOADING' ? 'NO_DATA' : dataState;

  // Mức cảnh báo khách quan dựa trên RPS và yêu cầu thực tế bị chặn (HTTP 429)
  // Chỉ cảnh báo spike khi thực sự có yêu cầu bị chặn do rate limit hoặc RPS cực cao (>= 50 req/s)
  const isAttackSpike = effectiveRateLimited > 0 || currentRpsValue >= 50;
  const isElevatedLoad = !isAttackSpike && (currentRpsValue >= 20 || (displayRpm >= 500 && currentRpsValue >= 10));
  const threatLevel: 'normal' | 'elevated' | 'spike' = isAttackSpike
    ? 'spike'
    : isElevatedLoad
      ? 'elevated'
      : 'normal';

  const strokeColor =
    threatLevel === 'spike'
      ? '#ef4444'
      : threatLevel === 'elevated'
        ? '#f59e0b'
        : '#10b981';

  const maxBucketRps = useMemo(() => {
    const maxFromPoints = timeseries.points.reduce((m, p) => Math.max(m, p.rps, p.totalRequests), 0);
    return Math.max(10, maxFromPoints, timeseries.warningRpsThreshold);
  }, [timeseries]);

  // Sinh tọa độ SVG cho biểu đồ chính: kết hợp mượt giữa dữ liệu thực theo thời gian (timeseries.points + serverLogs)
  // Các con sóng di chuyển tuần tự lần lượt, đồng tốc từ phải qua trái theo dòng thời gian thực.
  const combinedWaveform = useMemo(() => {
    const pts = timeseries.points;
    const len = pts.length > 0 ? pts.length : 60;
    const bucketY = new Array<number>(len).fill(BASELINE_Y);
    const rawElevations = new Array<number>(len).fill(0);

    if (pts.length > 0) {
      pts.forEach((pt, i) => {
        if (pt.disconnectedGap || pt.totalRequests <= 0) return;
        const targetIdx = Math.min(len - 1, Math.round((i / Math.max(1, pts.length - 1)) * (len - 1)));
        const ratio = Math.min(1, pt.totalRequests / Math.max(1, maxBucketRps));
        const elev = Math.max(18, ratio * 64);
        rawElevations[targetIdx] = Math.max(rawElevations[targetIdx], elev);
      });
    }

    // Đồng bộ trực tiếp các dòng log trong server-access.log thuộc cửa sổ hiện tại lên trục thời gian của đồ thị
    if (serverLogs.length > 0 && pts.length >= 2) {
      const startMs = new Date(pts[0].timestamp).getTime();
      const endMs = new Date(pts[pts.length - 1].timestamp).getTime();
      const spanMs = Math.max(1000, endMs - startMs);
      const bucketCounts = new Array<number>(len).fill(0);

      for (const log of serverLogs) {
        const t = new Date(log.timestamp).getTime();
        if (t >= startMs && t <= endMs + 2000) {
          const ratioX = Math.max(0, Math.min(1, (t - startMs) / spanMs));
          const idx = Math.min(len - 1, Math.round(ratioX * (len - 1)));
          bucketCounts[idx] += 1;
        }
      }
      for (let i = 0; i < len; i++) {
        if (bucketCounts[i] > 0) {
          const ratio = Math.min(1, bucketCounts[i] / Math.max(1, maxBucketRps));
          const elev = Math.max(18, ratio * 64);
          rawElevations[i] = Math.max(rawElevations[i], elev);
        }
      }
    }

    if (rawElevations.some((v) => v > 0)) {
      // Làm mượt dạng sườn núi (Gaussian mountain kernel) tại đúng mốc thời gian có request
      const kernel = [
        { offset: -3, weight: 0.14 },
        { offset: -2, weight: 0.36 },
        { offset: -1, weight: 0.72 },
        { offset: 0, weight: 1.0 },
        { offset: 1, weight: 0.72 },
        { offset: 2, weight: 0.36 },
        { offset: 3, weight: 0.14 },
      ];
      for (let idx = 0; idx < len; idx++) {
        let smoothed = 0;
        for (const k of kernel) {
          const neighbor = idx + k.offset;
          if (neighbor >= 0 && neighbor < len) {
            smoothed = Math.max(smoothed, rawElevations[neighbor] * k.weight);
          }
        }
        bucketY[idx] = Math.max(14, BASELINE_Y - smoothed);
      }
    }

    return bucketY;
  }, [timeseries.points, maxBucketRps, serverLogs]);

  const svgPoints = useMemo(() => {
    const width = 600;
    const step = width / Math.max(1, combinedWaveform.length - 1);
    return combinedWaveform.map((val, idx) => `${(idx * step).toFixed(1)},${val.toFixed(1)}`).join(' ');
  }, [combinedWaveform]);

  // Bộ dữ liệu chi tiết cho từng điểm trên đường biểu đồ (phục vụ hover tooltip đa điểm & tham số)
  const chartPointsData = useMemo(() => {
    const len = combinedWaveform.length;
    const pts = timeseries.points;
    const width = 600;
    const step = width / Math.max(1, len - 1);

    let startMs = Date.now() - (len - 1) * 1000;
    let endMs = Date.now();
    let spanMs = Math.max(1000, endMs - startMs);

    if (pts.length >= 2) {
      const parsedStart = new Date(pts[0].timestamp).getTime();
      const parsedEnd = new Date(pts[pts.length - 1].timestamp).getTime();
      if (!isNaN(parsedStart) && !isNaN(parsedEnd) && parsedEnd > parsedStart) {
        startMs = parsedStart;
        endMs = parsedEnd;
        spanMs = Math.max(1000, endMs - startMs);
      }
    }

    const bucketLogs: ServerRequestLog[][] = Array.from({ length: len }, () => []);
    for (const log of serverLogs) {
      const logTime = new Date(log.timestamp).getTime();
      if (!isNaN(logTime) && logTime >= startMs - 2000 && logTime <= endMs + 2000) {
        const ratioX = Math.max(0, Math.min(1, (logTime - startMs) / spanMs));
        const idx = Math.min(len - 1, Math.max(0, Math.round(ratioX * (len - 1))));
        bucketLogs[idx].push(log);
      }
    }

    return combinedWaveform.map((y, i) => {
      const x = Number((i * step).toFixed(1));
      const elevation = Math.max(0, BASELINE_Y - y);

      // Ánh xạ tỷ lệ index chính xác ngay cả khi pts.length khác len (VD: 24h có 96 points, waveform có 60)
      const ptIdx = pts.length > 0 ? Math.min(pts.length - 1, Math.round((i / Math.max(1, len - 1)) * (pts.length - 1))) : -1;
      const matchedPt = ptIdx >= 0 ? pts[ptIdx] : undefined;

      let pointTimestamp = matchedPt?.timestamp || new Date(startMs + Math.round((i / Math.max(1, len - 1)) * spanMs)).toISOString();

      const logsInBucket = bucketLogs[i] || [];
      const countFromLogs = logsInBucket.length;

      let totalRequests = 0;
      let rps = 0;
      let success2xx = 0;
      let clientError4xx = 0;
      let serverError5xx = 0;
      let rateLimited429 = 0;
      let pointAvgLatency: number | null = null;
      let sampleLog: string | undefined = undefined;

      if (countFromLogs > 0) {
        totalRequests = countFromLogs;
        rps = Number((countFromLogs / (timeseries.bucketSeconds || 1)).toFixed(2));
        success2xx = logsInBucket.filter((l) => l.status >= 200 && l.status < 300).length;
        clientError4xx = logsInBucket.filter((l) => l.status >= 400 && l.status < 500).length;
        serverError5xx = logsInBucket.filter((l) => l.status >= 500).length;
        rateLimited429 = logsInBucket.filter((l) => l.status === 429).length;
        const durations = logsInBucket.map((l) => l.durationMs).filter((d) => typeof d === 'number');
        if (durations.length > 0) {
          pointAvgLatency = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        }
        const topLog = logsInBucket[0];
        sampleLog = `${topLog.method} ${topLog.uri}, ${topLog.status} (${topLog.durationMs}ms)`;
      } else if (matchedPt && matchedPt.totalRequests > 0) {
        totalRequests = matchedPt.totalRequests;
        rps = matchedPt.rps;
        success2xx = matchedPt.success2xx;
        clientError4xx = matchedPt.clientError4xx;
        serverError5xx = matchedPt.serverError5xx;
        rateLimited429 = matchedPt.rateLimited429;
        pointAvgLatency = matchedPt.avgLatencyMs;
      } else if (elevation > 2) {
        const approxRps = Math.max(0.5, (elevation / 64) * maxBucketRps);
        rps = Number(approxRps.toFixed(2));
        totalRequests = Math.max(1, Math.round(approxRps * (timeseries.bucketSeconds || 1)));
        success2xx = totalRequests;
        pointAvgLatency = avgLatencyMs ?? 7;
      }

      return {
        index: i,
        x,
        y,
        elevation,
        timestamp: pointTimestamp,
        displayTime: formatShortTime(pointTimestamp),
        rps,
        totalRequests,
        success2xx,
        clientError4xx,
        serverError5xx,
        rateLimited429,
        avgLatencyMs: pointAvgLatency,
        sampleLog,
        isPeak: elevation > 10,
      };
    });
  }, [combinedWaveform, timeseries.points, timeseries.bucketSeconds, serverLogs, maxBucketRps, avgLatencyMs]);

  const buildSeriesPolylines = useCallback(
    (selector: (pt: TrafficTimeseriesPoint) => number): string[] => {
      const pts = timeseries.points;
      if (pts.length === 0) return [];
      const width = 600;
      const step = width / Math.max(1, pts.length - 1);
      const segments: string[] = [];
      let currentSegment: string[] = [];

      pts.forEach((pt, idx) => {
        if (pt.disconnectedGap) {
          if (currentSegment.length > 1) {
            segments.push(currentSegment.join(' '));
          }
          currentSegment = [];
          return;
        }
        const val = Math.max(0, selector(pt));
        const ratio = Math.min(1, val / Math.max(1, maxBucketRps));
        const y = BASELINE_Y - ratio * 66;
        const x = idx * step;
        currentSegment.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      });

      if (currentSegment.length > 1) {
        segments.push(currentSegment.join(' '));
      }
      return segments;
    },
    [timeseries.points, maxBucketRps]
  );

  const has4xxSeriesData = useMemo(
    () => timeseries.points.some((p) => p.clientError4xx > 0),
    [timeseries.points]
  );
  const has5xxSeriesData = useMemo(
    () => timeseries.points.some((p) => p.serverError5xx > 0),
    [timeseries.points]
  );
  const series4xxSegments = useMemo(
    () => (has4xxSeriesData ? buildSeriesPolylines((p) => p.clientError4xx) : []),
    [buildSeriesPolylines, has4xxSeriesData]
  );
  const series5xxSegments = useMemo(
    () => (has5xxSeriesData ? buildSeriesPolylines((p) => p.serverError5xx) : []),
    [buildSeriesPolylines, has5xxSeriesData]
  );

  const lastPoint = combinedWaveform[combinedWaveform.length - 1] ?? BASELINE_Y;
  const headX = 600;
  const headY = lastPoint;

  // Thao tác điều khiển WAF & Rate Limit
  const handleToggleAttackMode = async () => {
    setIsTogglingAttackMode(true);
    setActionError(null);
    const previousState = wafStatus;
    try {
      const next = !wafStatus.underAttackMode;
      const res = await toggleUnderAttackMode(next);
      setWafStatus(res);
    } catch (err: unknown) {
      setWafStatus(previousState);
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật Chế độ Khẩn cấp trên máy chủ.';
      setActionError(msg);
    } finally {
      setIsTogglingAttackMode(false);
    }
  };

  const handleToggleWafActive = async (nextActive: boolean) => {
    setIsTogglingWafActive(true);
    setActionError(null);
    const previousState = wafStatus;
    try {
      const res = await updateMonitoringRateLimit({ active: nextActive });
      setWafStatus(res);
      setConfirmWafDisableOpen(false);
    } catch (err: unknown) {
      setWafStatus(previousState);
      const msg = err instanceof Error ? err.message : 'Không thể thay đổi trạng thái Rate Limiter.';
      setActionError(msg);
    } finally {
      setIsTogglingWafActive(false);
    }
  };

  const handleManualBlockIp = async (e: FormEvent) => {
    e.preventDefault();
    if (!manualIpToBlock.trim()) return;
    setIsBlockingIp(true);
    setActionError(null);
    try {
      const res = await blockIp(manualIpToBlock.trim(), manualBlockReason.trim() || 'Admin manual blacklist', 15);
      setWafStatus(res);
      setManualIpToBlock('');
      setManualBlockReason('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đưa IP vào danh sách chặn trên máy chủ.';
      setActionError(msg);
    } finally {
      setIsBlockingIp(false);
    }
  };

  const handleUnblockIp = async (ip: string) => {
    const targetIp = cleanIp(ip);
    if (!targetIp) return;
    setActionError(null);
    try {
      const res = await unblockIp(targetIp);
      setWafStatus(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Không thể gỡ chặn IP ${targetIp} trên máy chủ.`;
      setActionError(msg);
    }
  };

  const handleQuickBlockIp = async (ip: string, reason = 'Admin quick block from access log', duration = 15) => {
    const targetIp = cleanIp(ip);
    if (!targetIp) return;
    setIsBlockingIp(true);
    setActionError(null);
    try {
      const res = await blockIp(targetIp, reason, duration);
      setWafStatus(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Không thể khóa IP ${targetIp} trên máy chủ.`;
      setActionError(msg);
    } finally {
      setIsBlockingIp(false);
    }
  };

  const blockedIpSet = useMemo(
    () => new Set((wafStatus?.blockedIps ?? []).map((b) => cleanIp(b.ip))),
    [wafStatus?.blockedIps]
  );

  const handleChangeRateLimit = async (limit: number) => {
    setActionError(null);
    const previousState = wafStatus;
    try {
      const res = await updateRateLimit(limit);
      setWafStatus(res);
    } catch (err: unknown) {
      setWafStatus(previousState);
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật giới hạn Rate Limit trên máy chủ.';
      setActionError(msg);
    }
  };

  // Lọc và sắp xếp danh sách Recent Requests
  const filteredLogs = useMemo(() => {
    let result = [...serverLogs];

    if (logFilter === '2xx') {
      result = result.filter((l) => l.status >= 200 && l.status < 300);
    } else if (logFilter === 'err') {
      result = result.filter((l) => l.status >= 400);
    } else if (logFilter === 'slow') {
      result = result.filter((l) => l.durationMs >= 300);
    }

    if (methodFilter !== 'ALL') {
      result = result.filter((l) => l.method.toUpperCase() === methodFilter);
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === '2XX') result = result.filter((l) => l.status >= 200 && l.status < 300);
      else if (statusFilter === '4XX') result = result.filter((l) => l.status >= 400 && l.status < 500);
      else if (statusFilter === '5XX') result = result.filter((l) => l.status >= 500);
      else if (statusFilter === '429') result = result.filter((l) => l.status === 429);
    }

    const minLat = Number(minLatencyFilter);
    if (!isNaN(minLat) && minLat > 0) {
      result = result.filter((l) => l.durationMs >= minLat);
    }

    if (logSearch.trim()) {
      const q = logSearch.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.uri.toLowerCase().includes(q) ||
          (l.routeTemplate && l.routeTemplate.toLowerCase().includes(q)) ||
          l.method.toLowerCase().includes(q) ||
          String(l.status).includes(q) ||
          l.clientIp.toLowerCase().includes(q) ||
          (l.id && l.id.toLowerCase().includes(q)) ||
          (l.userEmail && l.userEmail.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'durationMs') {
        cmp = a.durationMs - b.durationMs;
      } else if (sortField === 'status') {
        cmp = a.status - b.status;
      } else {
        cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [serverLogs, logFilter, methodFilter, statusFilter, minLatencyFilter, logSearch, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages - 1);
    const start = safePage * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, totalPages]);

  // Xử lý auto-scroll thông minh:
  // - Nếu sort timestamp desc (mặc định): request mới nhất nằm ở đỉnh đầu trang 1 -> giữ scrollTop = 0 để người dùng luôn thấy request mới nhất.
  // - Nếu sort asc: request mới nhất ở đáy trang cuối cùng -> cuộn xuống đáy.
  // - Chỉ tự động cuộn khi đang ở đúng trang rìa dữ liệu mới nhất (live edge).
  const isAtLiveEdge = sortDir === 'asc' ? currentPage === totalPages - 1 : currentPage === 0;

  useEffect(() => {
    if (autoScroll && logContainerRef.current && isAtLiveEdge) {
      if (sortDir === 'asc') {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      } else {
        logContainerRef.current.scrollTop = 0;
      }
    }
  }, [filteredLogs[0]?.id, filteredLogs.length, autoScroll, sortDir, isAtLiveEdge]);

  // Khi chuyển trang pagination hoặc đổi chiều sort, đưa vị trí cuộn về rìa hiển thị phù hợp
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = sortDir === 'asc' ? logContainerRef.current.scrollHeight : 0;
    }
  }, [currentPage, sortDir]);

  // Khi người dùng chủ động cuộn bảng log
  const handleLogContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (sortDir === 'desc') {
      const isAtTop = target.scrollTop <= 15;
      // Nếu user cuộn xuống xem các request cũ bên dưới, tự động tạm dừng auto-scroll để tránh giật màn hình
      if (!isAtTop && autoScroll) {
        setAutoScroll(false);
      } else if (isAtTop && !autoScroll && currentPage === 0) {
        // Khi user cuộn ngược lại đỉnh đầu ở trang 1, tự động khôi phục auto-scroll
        setAutoScroll(true);
      }
    } else {
      const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight <= 15;
      if (!isAtBottom && autoScroll) {
        setAutoScroll(false);
      } else if (isAtBottom && !autoScroll && currentPage === totalPages - 1) {
        setAutoScroll(true);
      }
    }
  };

  // Bật/tắt auto-scroll thủ công bằng nút bấm
  const handleToggleAutoScroll = () => {
    const next = !autoScroll;
    setAutoScroll(next);
    if (next) {
      setCurrentPage(sortDir === 'asc' ? totalPages - 1 : 0);
    }
  };

  const handleCopyLogs = async () => {
    try {
      const text = filteredLogs
        .map(
          (l) =>
            `[${l.timestamp}] [${l.id}] ${l.status} ${getStatusText(l.status)} ${l.method} ${l.uri} (${l.durationMs}ms) - IP: ${l.clientIp} - User: ${l.userEmail}`
        )
        .join('\n');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleDownloadLogFile = () => {
    const text = filteredLogs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.id}] ${l.status} ${getStatusText(l.status)} ${l.method} ${l.uri} (${l.durationMs}ms) - IP: ${l.clientIp} - User: ${l.userEmail}`
      )
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greytest-server-access-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefreshTelemetry = () => {
    syncAllMonitoringData(selectedWindow);
    setRealMetrics(getLiveRequestMetrics());
  };

  const toggleSort = (field: 'timestamp' | 'durationMs' | 'status') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const renderConnectionBadge = () => {
    const tones: Record<MonitoringStreamState, TagTone> = {
      CONNECTED: 'success',
      CONNECTING: 'brand',
      RECONNECTING: 'warning',
      DISCONNECTED: 'danger',
      ERROR: 'danger',
    };
    return (
      <Tag variant="status" tone={tones[streamState]} icon={streamState === 'DISCONNECTED' || streamState === 'ERROR' ? WifiOff : Wifi}
        data-testid="stream-connection-badge"
      >
        <span>{streamState}</span>
      </Tag>
    );
  };

  const renderStateBadge = (state: MonitoringDataState) => {
    const map: Record<MonitoringDataState, TagTone> = {
      AVAILABLE: 'success',
      NO_DATA: 'neutral',
      LOADING: 'brand',
      NOT_SUPPORTED: 'neutral',
      ERROR: 'danger',
    };
    const textVi: Record<MonitoringDataState, string> = {
      AVAILABLE: 'HOẠT ĐỘNG',
      NO_DATA: 'CHƯA CÓ',
      LOADING: 'ĐANG TẢI',
      NOT_SUPPORTED: 'KHÔNG HỖ TRỢ',
      ERROR: 'LỖI',
    };
    return (
      <Tag variant="status" tone={map[state]} icon={CircleDot} className="shrink-0 whitespace-nowrap">
        {language === 'vi' ? textVi[state] : state}
      </Tag>
    );
  };

  const hoveredPoint = hoverIndex != null && chartPointsData[hoverIndex] ? chartPointsData[hoverIndex] : null;

  return (
    <div className="rounded-base border border-border-default bg-neutral-primary-soft p-5 shadow-xs space-y-5">
      {/* HEADER & GLOBAL CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-control bg-brand-softer text-fg-brand-strong">
            <Activity size={18} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-heading flex flex-wrap items-center gap-2">
              <span>
                {language === 'vi'
                  ? 'Giám sát lưu lượng yêu cầu & quản trị tải hệ thống'
                  : "Live request stream & system load management"}
              </span>
              {renderConnectionBadge()}
            </h3>
          </div>
        </div>

        {/* Bộ chọn cửa sổ thời gian (Rolling Window) & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Time window selector"
            className="flex items-center rounded-base border border-border-default bg-neutral-primary p-0.5 text-xs"
          >
            {WINDOWS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWindow(w.id)}
                className={`btn rounded-control px-2 py-1 font-mono text-xs font-bold transition-colors cursor-pointer ${selectedWindow === w.id
                  ? 'bg-brand text-on-brand shadow-2xs'
                  : 'text-body-subtle hover:text-heading'
                  }`}
              >
                {language === 'vi' ? w.labelVi : w.labelEn}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 rounded-base border border-border-default bg-neutral-primary px-2.5 py-1 text-xs shadow-2xs">
            <ShieldCheck size={14} className={wafStatus.active ? 'text-fg-success-strong shrink-0' : 'text-fg-warning shrink-0'} />
            <span className="font-semibold text-heading">
              {wafStatus.active
                ? (language === 'vi' ? 'Tường lửa WAF: Kích hoạt' : 'WAF Shield: Active')
                : (language === 'vi' ? 'Tường lửa WAF: Đang tắt' : 'WAF Shield: Disabled')}
            </span>
            <span className="text-xs text-body-subtle border-l border-border-default pl-1.5 ml-0.5 font-mono">
              {wafStatus.rateLimitPerMinute} req/min/IP
            </span>
          </div>

          {/* Enable / Disable Rate Limiter (with confirmation when disabling) */}
          <button
            type="button"
            disabled={isTogglingWafActive}
            onClick={() => {
              if (wafStatus.active) {
                setConfirmWafDisableOpen(true);
              } else {
                handleToggleWafActive(true);
              }
            }}
            className="btn btn-secondary px-2.5 py-1 text-xs flex items-center gap-1.5 shadow-2xs hover:border-brand cursor-pointer"
            title={wafStatus.active
              ? (language === 'vi' ? 'Tạm thời tắt Rate Limit' : 'Disable Rate Limit')
              : (language === 'vi' ? 'Kích hoạt lại Rate Limit' : 'Enable Rate Limit')}
          >
            {wafStatus.active ? <ShieldOff size={12} className="text-fg-warning" /> : <ShieldCheck size={12} className="text-fg-success-strong" />}
            <span>
              {wafStatus.active
                ? (language === 'vi' ? 'Tắt Rate Limit' : 'Disable Rate Limit')
                : (language === 'vi' ? 'Bật Rate Limit' : 'Enable Rate Limit')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            className="btn btn-secondary px-2.5 py-1 text-xs flex items-center gap-1.5 shadow-2xs hover:border-brand cursor-pointer"
            title={isPaused ? (language === 'vi' ? 'Tiếp tục giám sát luồng' : 'Resume live stream') : (language === 'vi' ? 'Tạm dừng biểu đồ để kiểm tra' : 'Pause stream')}
          >
            {isPaused ? <Play size={12} className="text-fg-success-strong" /> : <Pause size={12} className="text-body-subtle" />}
            <span>{isPaused ? (language === 'vi' ? 'Tiếp tục' : 'Resume') : (language === 'vi' ? 'Tạm dừng' : 'Pause')}</span>
          </button>

          <button
            type="button"
            onClick={handleRefreshTelemetry}
            className="btn btn-secondary px-2.5 py-1 text-xs flex items-center gap-1.5 shadow-2xs hover:border-brand cursor-pointer"
            title={language === 'vi' ? 'Đồng bộ lại thông số lưu lượng' : 'Sync live telemetry metrics'}
          >
            <RefreshCw size={12} className="text-body-subtle" />
            <span>{language === 'vi' ? 'Làm mới' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* QUẢN TRỊ PHÒNG THỦ (WAF & RATE LIMITING) - ĐÃ ĐƯA LÊN TRÊN */}
      <div
        className="rounded-base border border-border-default-subtle bg-neutral-secondary-soft/50 p-3 text-xs space-y-2"
        data-testid="waf-defense-summary-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-body-subtle font-medium">
              {language === 'vi' ? 'Quản trị phòng thủ (WAF & Rate Limiting)' : 'Defense Administration'}
            </span>
            <Tag variant="status" tone={!wafStatus.active ? "warning" : wafStatus.underAttackMode ? "danger" : "success"} icon={!wafStatus.active ? Clock : wafStatus.underAttackMode ? AlertCircle : CheckCircle2}>
              {!wafStatus.active
                ? (language === 'vi' ? 'Đang tắt' : 'DISABLED')
                : wafStatus.underAttackMode
                  ? (language === 'vi' ? 'Thắt chặt khẩn cấp' : 'UNDER ATTACK')
                  : (language === 'vi' ? 'BẢO VỆ TỰ ĐỘNG' : 'AUTO DEFENSE')}
            </Tag>
          </div>

          <div className="flex items-center gap-2">
            {!wafStatus.active && (
              <button
                type="button"
                onClick={() => handleToggleWafActive(true)}
                disabled={isTogglingWafActive}
                className="btn btn-brand px-2.5 py-1 text-xs flex items-center gap-1 font-bold cursor-pointer"
              >
                <ShieldCheck size={12} />
                <span>{language === 'vi' ? 'Kích hoạt lại WAF' : 'Reactivate WAF'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-body-subtle">
            {language === 'vi'
              ? `Đã chặn +${effectiveRateLimited} yêu cầu vi phạm, ${wafStatus.activeBlockedIpCount} IP cách ly`
              : `Blocked +${effectiveRateLimited} reqs, ${wafStatus.activeBlockedIpCount} IPs isolated`}
          </span>
        </div>
      </div>

      {/* SECTION A: TRAFFIC OVERVIEW (8 KPI CARDS - 2 HÀNG X 4 CỘT TRÊN DESKTOP) */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 text-xs" data-testid="traffic-overview-kpis">
        {/* KPI 1: Total Requests */}
        <div className="min-w-0 rounded-base border border-border-default bg-neutral-primary-soft p-3 text-heading space-y-1 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Tổng yêu cầu' : 'Total Requests'}
            </span>
            {renderStateBadge(effectiveDataState)}
          </div>
          <div className="font-mono text-base font-extrabold text-fg-success-strong tabular-nums">
            {totalRequestsCount} <span className="text-xs font-normal text-body-subtle">reqs</span>
          </div>
          <div className="flex items-center justify-between text-xs text-body-subtle font-mono">
            <span>Win ({selectedWindow}): {windowTotalRequests}</span>
            {overview?.requestsChangePercent != null && (
              <span className={overview.requestsChangePercent >= 0 ? 'text-fg-success-strong ' : 'text-fg-warning '}>
                {overview.requestsChangePercent >= 0 ? '+' : ''}{overview.requestsChangePercent}%
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Current RPS */}
        <div className="min-w-0 rounded-base border border-border-default bg-neutral-primary-soft p-3 text-heading space-y-1 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Tốc độ hiện tại' : 'Current RPS'}
            </span>
            {renderStateBadge('AVAILABLE')}
          </div>
          <div className="font-mono text-base font-extrabold text-fg-brand-strong tabular-nums">
            {displayRps} <span className="text-xs font-normal text-body-subtle">req/s</span>
          </div>
          <div className="text-xs text-body-subtle font-mono">
            Avg: {(overview?.averageRps ?? 0).toFixed(2)}, Peak: {(overview?.peakRps ?? 0).toFixed(0)} req/s
          </div>
        </div>

        {/* KPI 3: Average Latency */}
        <div className="min-w-0 rounded-base border border-border-default bg-neutral-primary-soft p-3 text-heading space-y-1 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Độ trễ trung bình' : 'Avg Latency'}
            </span>
            {renderStateBadge(avgLatencyMs != null ? 'AVAILABLE' : 'NO_DATA')}
          </div>
          <div className="font-mono text-base font-extrabold text-heading tabular-nums">
            {avgLatencyMs != null ? (
              <>
                {avgLatencyMs} <span className="text-xs font-normal text-body-subtle">ms</span>
              </>
            ) : (
              <span className="text-xs text-body-subtle">NO_DATA</span>
            )}
          </div>
          <div className="text-xs text-body-subtle font-mono">
            {overview?.p50LatencyMs != null ? `P50: ${overview.p50LatencyMs} ms` : `Window: ${selectedWindow}`}
          </div>
        </div>

        {/* KPI 4: P95 Latency */}
        <div className="min-w-0 rounded-base border border-border-default bg-neutral-primary-soft p-3 text-heading space-y-1 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Độ trễ P95' : 'P95 Latency'}
            </span>
            {renderStateBadge(p95LatencyMs != null ? 'AVAILABLE' : 'NO_DATA')}
          </div>
          <div className="font-mono text-base font-extrabold text-fg-warning tabular-nums">
            {p95LatencyMs != null ? (
              <>
                {p95LatencyMs} <span className="text-xs font-normal text-body-subtle">ms</span>
              </>
            ) : (
              <span className="text-xs text-body-subtle">NO_DATA</span>
            )}
          </div>
          <div className="text-xs text-body-subtle font-mono">
            {language === 'vi' ? 'Phân vị 95' : '95th percentile'} ({selectedWindow})
          </div>
        </div>

        {/* KPI 5: P99 Latency */}
        <div className="min-w-0 rounded-base border border-border-default bg-neutral-primary-soft p-3 text-heading space-y-1 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Độ trễ P99' : 'P99 Latency'}
            </span>
            {renderStateBadge(p99LatencyMs != null ? 'AVAILABLE' : 'NO_DATA')}
          </div>
          <div className="font-mono text-base font-extrabold text-fg-warning tabular-nums">
            {p99LatencyMs != null ? (
              <>
                {p99LatencyMs} <span className="text-xs font-normal text-body-subtle">ms</span>
              </>
            ) : (
              <span className="text-xs text-body-subtle">NO_DATA</span>
            )}
          </div>
          <div className="text-xs text-body-subtle font-mono">
            {overview?.maxLatencyMs != null ? `Max: ${overview.maxLatencyMs} ms` : `Window: ${selectedWindow}`}
          </div>
        </div>

        {/* KPI 6: Error Rate */}
        <div className="min-w-0 rounded-base border border-border-default bg-neutral-primary-soft p-3 text-heading space-y-1 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Tỷ lệ lỗi' : 'Error Rate'}
            </span>
            {renderStateBadge(errorRatePercent != null ? 'AVAILABLE' : 'NO_DATA')}
          </div>
          <div className={`font-mono text-base font-extrabold tabular-nums ${(errorRatePercent ?? 0) >= 5 ? 'text-fg-danger-strong ' : 'text-fg-success-strong '}`}>
            {errorRatePercent != null ? (
              <>
                {errorRatePercent} <span className="text-xs font-normal text-body-subtle">%</span>
              </>
            ) : (
              <span className="text-xs text-body-subtle">NO_DATA</span>
            )}
          </div>
          <div className="text-xs text-body-subtle font-mono">
            4xx: {clientErrorRatePercent ?? '—'}%, 5xx: {serverErrorRatePercent ?? '—'}%
          </div>
        </div>

        {/* KPI 7: Active Connections */}
        <div className="min-w-0 rounded-base border border-border-default bg-neutral-primary-soft p-3 text-heading space-y-1 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Kết nối hoạt động' : 'Active Conn'}
            </span>
            {renderStateBadge('AVAILABLE')}
          </div>
          <div className="font-mono text-base font-extrabold text-fg-success-strong tabular-nums">
            {effectiveActiveConnections} <span className="text-xs font-normal text-body-subtle">conns</span>
          </div>
          <div className="text-xs text-body-subtle font-mono">
            HTTP: {overview?.activeConnections ?? serverTelemetry?.activeRequests ?? 0}, DB: {serverActiveConnections}, Workers: {serverThreadCount}
          </div>
        </div>

        {/* KPI 8: Rejected Requests */}
        <div className="min-w-0 rounded-base border border-border-default bg-neutral-primary-soft p-3 text-heading space-y-1 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Bị từ chối (429)' : 'Rejected (429)'}
            </span>
            {renderStateBadge('AVAILABLE')}
          </div>
          <div className={`font-mono text-base font-extrabold tabular-nums ${effectiveRateLimited > 0 ? 'text-fg-danger-strong ' : 'text-heading '}`}>
            {effectiveRateLimited} <span className="text-xs font-normal text-body-subtle">reqs</span>
          </div>
          <div className="text-xs text-body-subtle font-mono">
            {language === 'vi' ? 'IP bị chặn:' : 'Blocked IPs:'} {wafStatus.activeBlockedIpCount}
          </div>
        </div>
      </div>

      {/* SECTION B: REAL-TIME TRAFFIC CHART */}
      <div className="relative overflow-hidden rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">


        {/* Top Bar inside Chart */}
        <div className="relative z-10 flex flex-wrap items-center justify-between text-xs font-mono text-fg-success-strong mb-2 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 font-bold">
              <span className={`h-2 w-2 rounded-full ${isPaused ? 'bg-warning' : streamState === 'DISCONNECTED' ? 'bg-danger' : 'bg-success'}`} />
              <span>{language === 'vi' ? 'Dòng HTTP, cổng 8080' : 'HTTP STREAM, PORT 8080'}</span>
            </span>
            <span className="text-body-subtle">{language === 'vi' ? 'Giao thức: REST/JSON' : 'PROTOCOL: REST/JSON'}</span>
            <span className="text-body-subtle">{language === 'vi' ? 'Bộ đệm: 60s thời gian thực' : 'BUFFER: 60s REALTIME'}</span>
            <span className="text-body-subtle">{language === 'vi' ? `CỬA SỔ: ${selectedWindow.toUpperCase()}` : `WINDOW: ${selectedWindow.toUpperCase()}`}</span>
            {isPaused && (
              <Tag variant="status" tone="warning" icon={Clock}>
                {language === 'vi' ? 'ĐANG Tạm dừng' : 'PAUSED'}
              </Tag>
            )}
            {streamState === 'DISCONNECTED' && (
              <Tag variant="status" tone="danger" icon={AlertCircle}>
                DISCONNECTED
              </Tag>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Series Toggles */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setVisibleSeries((s) => ({ ...s, success2xx: !s.success2xx }))}
                className={`btn rounded-control px-1.5 py-0.5 border cursor-pointer ${visibleSeries.success2xx
                  ? 'border-border-success-subtle bg-success-soft text-fg-success-strong  font-bold'
                  : 'border-border-default  bg-neutral-secondary-soft  text-body-subtle '
                  }`}
              >
                {language === 'vi' ? '2xx Thành công' : '2xx Success'} ({overview?.successCount ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setVisibleSeries((s) => ({ ...s, clientError4xx: !s.clientError4xx }))}
                className={`btn rounded-control px-1.5 py-0.5 border cursor-pointer ${visibleSeries.clientError4xx
                  ? 'border-border-warning-subtle bg-warning-soft text-fg-warning  font-bold'
                  : 'border-border-default  bg-neutral-secondary-soft  text-body-subtle '
                  }`}
              >
                {language === 'vi' ? '4xx Lỗi Client' : '4xx Client'} ({overview?.clientErrorCount ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setVisibleSeries((s) => ({ ...s, serverError5xx: !s.serverError5xx }))}
                className={`btn rounded-control px-1.5 py-0.5 border cursor-pointer ${visibleSeries.serverError5xx
                  ? 'border-border-danger-subtle bg-danger-soft text-fg-danger-strong  font-bold'
                  : 'border-border-default  bg-neutral-secondary-soft  text-body-subtle '
                  }`}
              >
                {language === 'vi' ? '5xx Lỗi Server' : '5xx Server'} ({overview?.serverErrorCount ?? 0})
              </button>
            </div>

            <span className="font-bold text-heading">
              {language === 'vi' ? 'Tổng yêu cầu:' : 'TOTAL REQUESTS:'} <span className="text-fg-success-strong text-sm font-extrabold">{totalRequestsCount}</span>
            </span>
            <span className="font-bold text-heading">
              RPS: <span className="text-fg-success-strong text-sm font-extrabold">{displayRps}</span> req/s
            </span>
          </div>
        </div>

        {/* SVG Chart Viewport with Y-Axis Labels & Hover Tooltip */}
        <div className="relative z-10 h-32 w-full">
          {/* Y-Axis Labels */}
          <div className="pointer-events-none absolute left-1 top-1 bottom-4 flex flex-col justify-between text-xs font-mono text-body-subtle">
            <span>{maxBucketRps.toFixed(0)} req/s</span>
            <span>{(maxBucketRps / 2).toFixed(0)} req/s</span>
            <span>0 req/s</span>
          </div>

          <svg
            viewBox="0 0 600 100"
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
            aria-label="HTTP traffic stream waveform"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (rect.width <= 0) return;
              const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const total = chartPointsData.length;
              if (total === 0) return;
              const idx = Math.min(total - 1, Math.max(0, Math.round(relX * (total - 1))));
              setHoverIndex(idx);
            }}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              <filter id="streamGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Baseline (0 RPS) */}
            <line
              x1="0"
              y1={BASELINE_Y}
              x2="600"
              y2={BASELINE_Y}
              style={{ stroke: 'var(--border-default)' }}
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            {/* Warning RPS Threshold Line */}
            <line
              x1="0"
              y1="48"
              x2="600"
              y2="48"
              stroke="rgba(245, 158, 11, 0.22)"
              strokeDasharray="3 4"
              strokeWidth="1"
            />
            {/* Critical RPS Threshold Line */}
            <line
              x1="0"
              y1="20"
              x2="600"
              y2="20"
              stroke="rgba(239, 68, 68, 0.25)"
              strokeDasharray="2 4"
              strokeWidth="1"
            />

            {/* Area Fill & Primary Live Waveform Polyline */}
            {visibleSeries.success2xx && (
              <>
                <polygon points={`0,${BASELINE_Y} ${svgPoints} 600,${BASELINE_Y}`} fill={strokeColor} fillOpacity={0.1} />
                <polyline
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#streamGlow)"
                  points={svgPoints}
                />
              </>
            )}

            {/* Error series lines (only rendered when 4xx / 5xx errors actually exist in window) */}
            {visibleSeries.clientError4xx &&
              series4xxSegments.map((seg, i) => (
                <polyline
                  key={`s4xx-${i}`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.6"
                  strokeDasharray="3 2"
                  points={seg}
                />
              ))}

            {visibleSeries.serverError5xx &&
              series5xxSegments.map((seg, i) => (
                <polyline
                  key={`s5xx-${i}`}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.8"
                  points={seg}
                />
              ))}

            {/* Spike Markers */}
            {timeseries.points.map((pt, idx) => {
              if (!pt.spike) return null;
              const x = (idx / Math.max(1, timeseries.points.length - 1)) * 600;
              return (
                <circle
                  key={`spike-${pt.timestamp}`}
                  cx={x}
                  cy={20}
                  r="3"
                  fill="#ef4444"
                />
              );
            })}

            <circle
              cx={headX}
              cy={headY}
              r="4.5"
              fill={strokeColor}
              filter="url(#streamGlow)"
            />

            {/* Guide line & Hover Marker Circle on the line */}
            {hoveredPoint && (
              <>
                <line
                  x1={hoveredPoint.x}
                  y1={0}
                  x2={hoveredPoint.x}
                  y2={BASELINE_Y}
                  stroke="rgba(52, 211, 153, 0.6)"
                  strokeDasharray="2 2"
                  strokeWidth="1.2"
                />
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r="5"
                  fill="#10b981"
                  style={{ stroke: 'var(--neutral-primary-soft)' }}
                  strokeWidth="2"
                  filter="url(#streamGlow)"
                />
              </>
            )}
          </svg>

          {/* Hover Tooltip - bám sát vị trí con trỏ chuột trên đường biểu đồ */}
          {hoveredPoint && (
            <div
              className="pointer-events-none absolute z-30 transition-colors duration-75"
              style={{
                left: `${(hoveredPoint.x / 600) * 100}%`,
                top: hoveredPoint.y < 42 ? '48%' : '4%',
                transform:
                  hoveredPoint.x > 420
                    ? 'translateX(-100%)'
                    : hoveredPoint.x < 140
                      ? 'translateX(0%)'
                      : 'translateX(-50%)',
              }}
            >
              <div style={{ boxShadow: 'var(--shadow-lg)' }} className="rounded-base border border-border-success-subtle bg-neutral-secondary p-2.5 text-xs font-mono text-body-subtle shadow-lg backdrop-blur-md min-w-[190px] space-y-1">
                <div className="flex items-center justify-between border-b border-border-default pb-1">
                  <span className="font-bold text-fg-success-strong flex items-center gap-1">
                    <Clock size={11} />
                    {hoveredPoint.displayTime}
                  </span>
                  <span className="font-bold text-body-subtle">
                    {hoveredPoint.rps > 0 ? (
                      <span className="text-fg-brand-strong">{hoveredPoint.rps.toFixed(2)} req/s</span>
                    ) : (
                      <span className="text-body-subtle">0.00 req/s</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-body-subtle">
                  <span className="text-body-subtle">{language === 'vi' ? 'Tổng yêu cầu:' : 'Total requests:'}</span>
                  <span className="font-extrabold text-fg-success-strong">{hoveredPoint.totalRequests} reqs</span>
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-0.5 font-bold">
                  <span className="text-fg-success-strong">2xx: {hoveredPoint.success2xx}</span>
                  <span className={hoveredPoint.clientError4xx > 0 ? 'text-fg-warning' : 'text-body'}>
                    4xx: {hoveredPoint.clientError4xx}
                  </span>
                  <span className={hoveredPoint.serverError5xx > 0 ? 'text-fg-danger-strong' : 'text-body'}>
                    5xx: {hoveredPoint.serverError5xx}
                  </span>
                </div>

                {hoveredPoint.avgLatencyMs != null && (
                  <div className="flex items-center justify-between border-t border-border-default pt-1 text-body-subtle">
                    <span>{language === 'vi' ? 'Độ trễ TB:' : 'Avg Latency:'}</span>
                    <span className="text-fg-warning font-bold">{hoveredPoint.avgLatencyMs} ms</span>
                  </div>
                )}

                {hoveredPoint.sampleLog && (
                  <div
                    className="truncate border-t border-border-default pt-1 text-xs text-fg-success-strong max-w-[210px]"
                    title={hoveredPoint.sampleLog}
                  >
                    {hoveredPoint.sampleLog}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* X-Axis Timestamps */}
        <div className="relative z-10 flex items-center justify-between text-xs font-mono text-body-subtle pt-1">
          <span>{timeseries.points[0] ? formatShortTime(timeseries.points[0].timestamp) : '—'}</span>
          <span>
            {timeseries.points[Math.floor(timeseries.points.length / 2)]
              ? formatShortTime(timeseries.points[Math.floor(timeseries.points.length / 2)].timestamp)
              : '—'}
          </span>
          <span>
            {timeseries.points[timeseries.points.length - 1]
              ? formatShortTime(timeseries.points[timeseries.points.length - 1].timestamp)
              : 'NOW'}
          </span>
        </div>

        {/* Live HTTP Request Logger Banner */}
        <div className="relative z-10 mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border-default pt-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-heading">
            <span className="text-body-subtle">
              {language === 'vi' ? 'Yêu cầu gần nhất:' : 'LATEST REQUEST:'}
            </span>
            {serverLogs[0] ? (
              <span className="flex items-center gap-1.5 text-fg-success-strong font-bold">
                <Tag variant="status" tone="success" icon={CheckCircle2}>{serverLogs[0].method}</Tag>
                <span className="text-heading">{serverLogs[0].uri}</span>
                <span className={`text-xs ${serverLogs[0].status >= 400 ? 'text-fg-danger-strong ' : 'text-fg-success-strong '}`}>
                  , {serverLogs[0].status} {serverLogs[0].status === 200 ? 'OK' : ''} ({serverLogs[0].durationMs}ms)
                </span>
              </span>
            ) : lastRequest ? (
              <span className="flex items-center gap-1.5 text-fg-success-strong font-bold">
                <Tag variant="status" tone="success" icon={CheckCircle2}>{lastRequest.method}</Tag>
                <span className="text-heading">{lastRequest.url}</span>
                {lastRequest.status && (
                  <span className={`text-xs ${lastRequest.isError ? 'text-fg-danger-strong ' : 'text-fg-success-strong '}`}>
                    , {lastRequest.status} {lastRequest.status === 200 ? 'OK' : ''} ({lastRequest.durationMs ?? 0}ms)
                  </span>
                )}
              </span>
            ) : (
              <span className="text-body-subtle italic">
                {language === 'vi' ? 'Đang lắng nghe các request từ client và server...' : 'Listening for client and server requests...'}
              </span>
            )}
          </div>
          <span className="text-xs text-body-subtle">
            {language === 'vi'
              ? `SSE STREAM + BUCKET (${timeseries.bucketSeconds}s), TỰ ĐỘNG ĐỒNG BỘ`
              : `SSE STREAM + BUCKET (${timeseries.bucketSeconds}s), AUTO SYNC`}
          </span>
        </div>

        {/* Objective High-RPS Alert Banner */}
        {threatLevel === 'spike' && (
          <div className="relative z-10 mt-2 flex items-center justify-between rounded-base border border-border-danger-subtle bg-danger-soft px-3 py-2 text-xs text-fg-danger-strong">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-fg-danger-strong shrink-0" />
              <span className="font-bold">
                {language === 'vi'
                  ? (effectiveRateLimited > 0
                    ? 'CẢNH BÁO: Lưu lượng RPS vượt ngưỡng! Đã phát hiện và chặn các yêu cầu vượt giới hạn (HTTP 429).'
                    : 'CẢNH BÁO: Lưu lượng RPS tăng đột biến! Bộ giới hạn tần suất (Rate Limiter) đang kích hoạt giám sát tải cao.')
                  : (effectiveRateLimited > 0
                    ? 'ALERT: High RPS threshold exceeded! Blocking requests exceeding rate limits (HTTP 429).'
                    : 'ALERT: Traffic spike detected! Rate Limiter is actively monitoring high system load.')}
              </span>
            </div>
            {effectiveRateLimited > 0 && (
              <span className="font-mono font-bold text-fg-danger-strong">
                +{effectiveRateLimited} {language === 'vi' ? 'yêu cầu bị chặn (429)' : 'rate-limited (429)'}
              </span>
            )}
          </div>
        )}

        {wafStatus.underAttackMode && threatLevel !== 'spike' && (
          <div className="relative z-10 mt-2 flex items-center justify-between rounded-base border border-border-warning-subtle bg-warning-soft px-3 py-2 text-xs text-fg-warning">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-fg-warning shrink-0" />
              <span className="font-semibold">
                {language === 'vi'
                  ? `CHẾ ĐỘ PHÒNG THỦ KHẨN CẤP ĐANG BẬT: Đang siết chặt Rate Limit (${wafStatus.rateLimitPerMinute} req/phút/IP).`
                  : `EMERGENCY DEFENSE ACTIVE: Enforcing strict rate limit (${wafStatus.rateLimitPerMinute} req/min/IP).`}
              </span>
            </div>
            <span className="font-mono font-bold text-fg-warning">
              Max {wafStatus.rateLimitPerMinute} req/min
            </span>
          </div>
        )}
      </div>

      {actionError && (
        <div className="rounded-base bg-danger-soft/40 border border-border-danger p-2 text-xs text-fg-danger-strong flex items-center justify-between">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="btn btn-ghost rounded-control cursor-pointer font-bold px-1.5">&times;</button>
        </div>
      )}

      {/* SECTION C: RECENT REQUESTS TABLE & SERVER-ACCESS.LOG CONSOLE (ĐẶT NGAY BÊN DƯỚI ĐỒ THỊ) */}
      <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm space-y-3 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-control bg-success-soft text-fg-success-strong border border-border-success-subtle">
              <Terminal size={14} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-heading">server-access.log</span>
                <Tag>
                  {language === 'vi' ? 'Cổng HTTP 8080' : 'HTTP PORT 8080'}
                </Tag>
                <span className="flex items-center gap-1 text-xs text-fg-success-strong font-bold">
                  <span className={`h-1.5 w-1.5 rounded-full ${isPaused ? 'bg-warning' : 'bg-success'}`} />
                  <span>
                    {isPaused
                      ? (language === 'vi' ? 'ĐANG Tạm dừng' : 'PAUSED')
                      : (language === 'vi' ? 'Theo dõi trực tiếp' : 'LIVE TAILING')}
                  </span>
                </span>
              </div>
              <p className="text-xs text-body-subtle">
                {language === 'vi'
                  ? 'Bảng tra cứu Request gần nhất & Nhật ký truy cập máy chủ (không lưu Authorization, Cookie hoặc mật khẩu).'
                  : 'Recent requests table & live server access log (sensitive headers and tokens are never stored).'}
              </p>
            </div>
          </div>

          {/* Search, Filter & Actions */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-body-subtle" />
              <input
                type="text"
                aria-label={language === 'vi' ? 'Lọc nhật ký request' : 'Filter request logs'}
                placeholder={language === 'vi' ? 'Lọc URI, Request ID, IP...' : 'Filter URI, Request ID, IP...'}
                value={logSearch}
                onChange={(e) => {
                  setLogSearch(e.target.value);
                  setCurrentPage(0);
                }}
                className="form-input h-7 w-44 rounded-control border border-border-default bg-neutral-secondary-soft pl-7 pr-2 text-xs text-heading placeholder:text-body-subtle focus:border-border-success-subtle focus:outline-none"
              />
            </div>

            {/* Method Filter */}
            <SelectMenu aria-label={language === 'vi' ? 'Lọc phương thức HTTP' : 'Filter HTTP Method'}
              value={methodFilter}
              onChange={(value) => {
                setMethodFilter(value);
                setCurrentPage(0);
              }}
              className="w-full sm:w-auto sm:min-w-[160px]"
              options={[{ value: "ALL", label: language === 'vi' ? 'Phương thức: Tất cả' : 'Method: ALL' },
              { value: "GET", label: "GET" },
              { value: "POST", label: "POST" },
              { value: "PUT", label: "PUT" },
              { value: "PATCH", label: "PATCH" },
              { value: "DELETE", label: "DELETE" }]} />

            {/* Status Group Filter */}
            <SelectMenu aria-label={language === 'vi' ? 'Lọc trạng thái HTTP' : 'Filter HTTP Status'}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(0);
              }}
              className="w-full sm:w-auto sm:min-w-[160px]"
              options={[{ value: "ALL", label: language === 'vi' ? 'Trạng thái: Tất cả' : 'Status: ALL' },
              { value: "2XX", label: language === 'vi' ? '2xx Thành công' : '2xx Success', tone: 'success' },
              { value: "4XX", label: language === 'vi' ? '4xx Lỗi Client' : '4xx Client Err', tone: 'warning' },
              { value: "5XX", label: language === 'vi' ? '5xx Lỗi Server' : '5xx Server Err', tone: 'danger' },
              { value: "429", label: language === 'vi' ? '429 Giới hạn tần suất' : '429 Rate Limit', tone: 'warning' }]} />

            {/* Quick Filter Tabs */}
            <div className="flex items-center rounded-base border border-border-default bg-neutral-secondary-soft p-0.5 text-xs">
              {(['all', '2xx', 'err', 'slow'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setLogFilter(tab);
                    setCurrentPage(0);
                  }}
                  className={`btn rounded-control px-2 py-0.5 font-medium transition-colors cursor-pointer ${logFilter === tab
                    ? 'bg-neutral-primary-soft  text-fg-success-strong  font-bold border border-border-default  shadow-2xs'
                    : 'text-body  hover:text-heading '
                    }`}
                >
                  {tab === 'all'
                    ? (language === 'vi' ? 'Tất cả' : 'All')
                    : tab === '2xx'
                      ? (language === 'vi' ? '2xx Thành công' : '2xx OK')
                      : tab === 'err'
                        ? (language === 'vi' ? 'Lỗi (4xx/5xx)' : 'Errors')
                        : (language === 'vi' ? 'Chậm (>300ms)' : 'Slow (>300ms)')}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleToggleAutoScroll}
              className={`btn flex h-7 items-center gap-1 rounded-control border px-2 text-xs font-medium transition-colors cursor-pointer ${autoScroll
                ? 'border-border-success-subtle bg-success-soft text-fg-success-strong   font-bold'
                : 'border-border-default  bg-neutral-secondary-soft  text-body  hover:bg-neutral-secondary-soft hover:text-heading '
                }`}
              title={
                autoScroll
                  ? language === 'vi'
                    ? 'Đang tự cuộn theo request mới nhất (Bấm để tạm dừng)'
                    : 'Auto-scrolling to newest requests (Click to pause)'
                  : language === 'vi'
                    ? 'Đã tạm dừng tự cuộn (Bấm để bật lại)'
                    : 'Auto-scroll paused (Click to resume)'
              }
            >
              {sortDir === 'asc' ? <ArrowDownCircle size={11} /> : <ArrowUpCircle size={11} />}
              <span>{autoScroll ? (language === 'vi' ? 'Tự cuộn' : 'Auto-scroll') : (language === 'vi' ? 'Tạm dừng cuộn' : 'Scroll paused')}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLogs}
              className="btn btn-secondary rounded-control flex h-7 items-center gap-1 px-2 text-xs font-medium cursor-pointer"
            >
              {copied ? <Check size={11} className="text-fg-success-strong" /> : <Copy size={11} />}
              <span>{copied ? (language === 'vi' ? 'Đã chép' : 'Copied') : (language === 'vi' ? 'Sao chép' : 'Copy')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadLogFile}
              className="btn btn-secondary rounded-control flex h-7 items-center gap-1 px-2 text-xs font-medium cursor-pointer"
            >
              <Download size={11} />
              <span>.log</span>
            </button>

            <button
              type="button"
              onClick={() => setBlacklistModalOpen(true)}
              className={`btn flex h-7 items-center gap-1 rounded-control border px-2 text-xs font-medium transition-colors cursor-pointer ${(wafStatus?.blockedIps ?? []).length > 0
                ? 'border-border-danger-subtle bg-danger-soft text-fg-danger-strong   hover:bg-danger-soft '
                : 'border-border-default  bg-neutral-secondary-soft  text-heading  hover:bg-neutral-secondary-soft hover:text-heading '
                }`}
              title={language === 'vi' ? 'Quản lý danh sách IP bị khóa / Khóa IP thủ công' : 'Manage Blocked IPs'}
            >
              <UserX size={11} className={(wafStatus?.blockedIps ?? []).length > 0 ? 'text-fg-danger-strong ' : 'text-body-subtle '} />
              <span>
                {language === 'vi' ? 'Ban IP' : 'Ban IP'}
                {(wafStatus?.blockedIps ?? []).length > 0 && ` (${(wafStatus?.blockedIps ?? []).length})`}
              </span>
            </button>

            <IconButton onClick={() => setServerLogs([])}
              title={language === 'vi' ? 'Xóa log trên màn hình' : 'Clear display buffer'} label={language === 'vi' ? 'Xóa log trên màn hình' : 'Clear display buffer'} icon={Trash2} className="flex hover:text-fg-danger-strong hover:bg-neutral-secondary-soft hover:bg-danger-soft" />
          </div>
        </div>

        {/* Sort & Latency Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-body-subtle">
          <div className="flex items-center gap-2">
            <span>{language === 'vi' ? 'Sắp xếp:' : 'Sort by:'}</span>
            <button
              type="button"
              onClick={() => toggleSort('timestamp')}
              className={`btn inline-flex items-center gap-1 rounded-control px-1.5 py-0.5 cursor-pointer ${sortField === 'timestamp'
                ? 'bg-neutral-secondary-soft  text-fg-success-strong  font-bold border border-border-default '
                : 'hover:text-heading '
                }`}
            >
              <span>{language === 'vi' ? 'Thời gian' : 'Timestamp'}</span>
              <ArrowUpDown size={10} />
            </button>
            <button
              type="button"
              onClick={() => toggleSort('durationMs')}
              className={`btn inline-flex items-center gap-1 rounded-control px-1.5 py-0.5 cursor-pointer ${sortField === 'durationMs'
                ? 'bg-neutral-secondary-soft  text-fg-success-strong  font-bold border border-border-default '
                : 'hover:text-heading '
                }`}
            >
              <span>{language === 'vi' ? 'Độ trễ' : 'Latency'}</span>
              <ArrowUpDown size={10} />
            </button>
            <button
              type="button"
              onClick={() => toggleSort('status')}
              className={`btn inline-flex items-center gap-1 rounded-control px-1.5 py-0.5 cursor-pointer ${sortField === 'status'
                ? 'bg-neutral-secondary-soft  text-fg-success-strong  font-bold border border-border-default '
                : 'hover:text-heading '
                }`}
            >
              <span>{language === 'vi' ? 'Mã trạng thái' : 'HTTP Status'}</span>
              <ArrowUpDown size={10} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span>{language === 'vi' ? 'Độ trễ tối thiểu (ms):' : 'Min Latency (ms):'}</span>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={minLatencyFilter}
              onChange={(e) => {
                setMinLatencyFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="form-input h-6 w-20 rounded-control border border-border-default bg-neutral-secondary-soft px-1.5 text-xs text-heading focus:outline-none focus:border-border-success-subtle"
            />
          </div>
        </div>

        {/* Log & Recent Requests Viewer Window */}
        <div
          ref={logContainerRef}
          onScroll={handleLogContainerScroll}
          aria-label="Server access log console"
          className="h-64 overflow-y-auto rounded-base border border-border-default bg-neutral-secondary-soft p-3 text-xs leading-relaxed select-text font-mono space-y-1"
        >
          {paginatedLogs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-body-subtle italic">
              <span>{language === 'vi' ? 'Chưa có dòng log nào phù hợp với bộ lọc (NO_DATA).' : 'No log lines matching criteria (NO_DATA).'}</span>
            </div>
          ) : (
            paginatedLogs.map((log) => {
              const statusTone =
                log.status >= 500
                  ? 'danger'
                  : log.status === 429
                    ? 'warning'
                    : log.status >= 400
                      ? 'warning'
                      : 'success';

              const methodColor =
                log.method === 'GET'
                  ? 'text-fg-brand-strong '
                  : log.method === 'POST'
                    ? 'text-fg-success-strong '
                    : log.method === 'PUT'
                      ? 'text-fg-warning '
                      : log.method === 'DELETE'
                        ? 'text-fg-danger-strong '
                        : 'text-fg-brand-strong ';

              const isSlow = log.durationMs >= 300;

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedRequest(log)}
                  className="flex flex-wrap items-center gap-x-2.5 py-1 border-b border-border-default hover:bg-neutral-secondary-medium rounded-base px-1.5 transition-colors font-mono cursor-pointer"
                >
                  <span className="text-body-subtle tabular-nums shrink-0">
                    [{formatLogTime(log.timestamp)}]
                  </span>

                  <Tag className="shrink-0">
                    {log.id}
                  </Tag>

                  <Tag variant="status" tone={statusTone} icon={CircleDot} className="shrink-0">
                    {log.status} {getStatusText(log.status)}
                  </Tag>

                  <span className={`w-12 font-extrabold shrink-0 ${methodColor}`}>
                    {log.method}
                  </span>

                  <span className="font-semibold text-heading shrink-0 break-all">
                    {log.uri}
                  </span>

                  <span className={`ml-auto text-xs shrink-0 ${isSlow ? 'text-fg-warning  font-bold' : 'text-body '}`}>
                    {log.durationMs}ms
                  </span>

                  <span className="text-body-subtle text-xs shrink-0">
                    {log.clientIp}
                  </span>

                  <span className="text-body text-xs truncate max-w-[130px] shrink-0" title={log.userEmail}>
                    {log.userEmail}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <IconButton onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRequest(log);
                    }}
                      title={language === 'vi' ? 'Xem chi tiết request' : 'View request detail'} label={language === 'vi' ? 'Xem chi tiết request' : 'View request detail'} icon={Eye} className="hover:text-fg-success-strong" />

                    {blockedIpSet.has(cleanIp(log.clientIp)) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmUnblockIpTarget(cleanIp(log.clientIp));
                        }}
                        className="btn btn-ghost-danger rounded-control flex items-center gap-0.5 px-1 py-0.5 text-xs font-bold cursor-pointer"
                        title={language === 'vi' ? `IP ${cleanIp(log.clientIp)} đang bị khóa. Bấm để gỡ chặn` : `IP is banned. Click to unban`}
                      >
                        <UserX size={10} />
                        <span>{language === 'vi' ? 'Đã khóa' : 'Banned'}</span>
                      </button>
                    ) : (
                      <IconButton onClick={(e) => {
                        e.stopPropagation();
                        setConfirmBlockIpTarget(cleanIp(log.clientIp));
                      }}
                        title={language === 'vi' ? `Khóa IP ${cleanIp(log.clientIp)} (Ban IP 15 phút)` : `Ban IP ${cleanIp(log.clientIp)}`} label={language === 'vi' ? `Khóa IP ${cleanIp(log.clientIp)} (Ban IP 15 phút)` : `Ban IP ${cleanIp(log.clientIp)}`} icon={UserX} className="hover:text-fg-danger-strong hover:bg-danger-soft" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination & Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-default pt-2 text-xs text-body-subtle">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            <span>
              {language === 'vi'
                ? `Đang hiển thị ${paginatedLogs.length}/${filteredLogs.length} dòng log, Định dạng: [THỜI GIAN] [MÃ_REQ] TRẠNG_THÁI PHƯƠNG_THỨC URI ĐỘ_TRỄ IP NGƯỜI_DÙNG`
                : `Showing ${paginatedLogs.length}/${filteredLogs.length} entries, Format: [TIME] [REQ_ID] STATUS METHOD URI DURATION IP USER`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <IconButton disabled={currentPage <= 0}
              onClick={() => {
                const newPage = Math.max(0, currentPage - 1);
                if (newPage === 0 && sortDir === 'desc') {
                  setAutoScroll(true);
                }
                setCurrentPage(newPage);
              }} label="Trang trước" icon={ChevronLeft} className="hover:bg-neutral-secondary-soft disabled:opacity-40" />
            <span>
              {currentPage + 1} / {totalPages}
            </span>
            <IconButton disabled={currentPage >= totalPages - 1}
              onClick={() => {
                const newPage = Math.min(totalPages - 1, currentPage + 1);
                if (newPage === totalPages - 1 && sortDir === 'asc') {
                  setAutoScroll(true);
                } else {
                  setAutoScroll(false);
                }
                setCurrentPage(newPage);
              }} label="Trang sau" icon={ChevronRight} className="hover:bg-neutral-secondary-soft disabled:opacity-40" />
          </div>
        </div>
      </div>

      {/* SECTION D & E: ENDPOINT ANALYTICS + TRAFFIC ALERTS */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* SECTION D: ENDPOINT ANALYTICS (2 columns on large screens) */}
        <div className="lg:col-span-2 rounded-base border border-border-default bg-neutral-primary p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default pb-2.5">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-fg-brand-strong" />
              <div>
                <h4 className="text-xs font-bold text-heading">
                  {language === 'vi' ? 'Phân tích endpoint (Endpoint Analytics)' : "Endpoint traffic analytics"}
                </h4>
                <p className="text-xs text-body-subtle">
                  {language === 'vi'
                    ? `Thống kê theo route template chuẩn hóa trong cửa sổ ${selectedWindow}`
                    : `Aggregated by normalized route template in ${selectedWindow} window`}
                </p>
              </div>
            </div>

            <div className="flex items-center rounded-base border border-border-default bg-neutral-secondary-soft p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setAnalyticsTab('volume')}
                className={`btn rounded-control px-2 py-0.5 font-semibold cursor-pointer ${analyticsTab === 'volume' ? 'bg-neutral-primary text-fg-brand-strong shadow-2xs' : 'text-body-subtle'
                  }`}
              >
                {language === 'vi' ? 'Top lưu lượng' : 'Top Volume'}
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsTab('latency')}
                className={`btn rounded-control px-2 py-0.5 font-semibold cursor-pointer ${analyticsTab === 'latency' ? 'bg-neutral-primary text-fg-brand-strong shadow-2xs' : 'text-body-subtle'
                  }`}
              >
                {language === 'vi' ? 'Độ trễ cao nhất' : 'Highest Latency'}
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsTab('errors')}
                className={`btn rounded-control px-2 py-0.5 font-semibold cursor-pointer ${analyticsTab === 'errors' ? 'bg-neutral-primary text-fg-brand-strong shadow-2xs' : 'text-body-subtle'
                  }`}
              >
                {language === 'vi' ? 'Tỷ lệ lỗi cao nhất' : 'Highest Error Rate'}
              </button>
            </div>
          </div>

          {/* Method & Status Distribution Bars */}
          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <div className="rounded-base border border-border-default-subtle bg-neutral-secondary-soft/40 p-2">
              <span className="font-semibold text-body-subtle block mb-1">
                {language === 'vi' ? 'Phân bổ theo HTTP Method' : 'Distribution by HTTP Method'}
              </span>
              <div className="flex flex-wrap items-center gap-2 font-mono">
                {endpointAnalytics && Object.keys(endpointAnalytics.methodDistribution || {}).length > 0 ? (
                  Object.entries(endpointAnalytics.methodDistribution).map(([m, cnt]) => (
                    <Tag key={m}>
                      {m}: {cnt}
                    </Tag>
                  ))
                ) : (
                  <span className="text-body-subtle italic">NO_DATA</span>
                )}
              </div>
            </div>

            <div className="rounded-base border border-border-default-subtle bg-neutral-secondary-soft/40 p-2">
              <span className="font-semibold text-body-subtle block mb-1">
                {language === 'vi' ? 'Phân bổ theo HTTP Status' : 'Distribution by Status Code'}
              </span>
              <div className="flex flex-wrap items-center gap-2 font-mono">
                {endpointAnalytics && Object.keys(endpointAnalytics.statusDistribution || {}).length > 0 ? (
                  Object.entries(endpointAnalytics.statusDistribution).map(([st, cnt]) => (
                    <Tag key={st}>
                      {st}: {cnt}
                    </Tag>
                  ))
                ) : (
                  <span className="text-body-subtle italic">NO_DATA</span>
                )}
              </div>
            </div>
          </div>

          {/* Endpoint Table */}
          {(() => {
            const list =
              analyticsTab === 'volume'
                ? endpointAnalytics?.topByVolume ?? []
                : analyticsTab === 'latency'
                  ? endpointAnalytics?.topByLatency ?? []
                  : endpointAnalytics?.topByErrorRate ?? [];

            if (list.length === 0) {
              return (
                <div className="rounded-base border border-dashed border-border-default p-4 text-center text-xs text-body-subtle bg-neutral-primary-soft">
                  {language === 'vi'
                    ? 'Chưa có dữ liệu thống kê endpoint trong cửa sổ thời gian này (NO_DATA).'
                    : 'No endpoint metrics recorded in this time window (NO_DATA).'}
                </div>
              );
            }

            return (
              <div className="overflow-x-auto rounded-base border border-border-default text-xs bg-neutral-primary-soft">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border-default bg-neutral-secondary-soft text-left text-xs text-body-subtle">
                      <th className="font-semibold text-body-subtle text-xs px-2.5 py-1.5">Method</th>
                      <th className="font-semibold text-body-subtle text-xs px-2.5 py-1.5">Endpoint</th>
                      <th className="font-semibold text-body-subtle text-xs px-2.5 py-1.5 text-right">Requests</th>
                      <th className="font-semibold text-body-subtle text-xs px-2.5 py-1.5 text-right">Avg (ms)</th>
                      <th className="font-semibold text-body-subtle text-xs px-2.5 py-1.5 text-right">P95 (ms)</th>
                      <th className="font-semibold text-body-subtle text-xs px-2.5 py-1.5 text-right">Error rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((ep) => (
                      <tr key={`${ep.method}-${ep.endpoint}`} className="border-b border-border-default/50 hover:bg-neutral-secondary-soft/40 font-mono">
                        <td className="px-2.5 py-1.5 font-bold text-fg-brand-strong">{ep.method}</td>
                        <td className="px-2.5 py-1.5 text-heading break-all">{ep.endpoint}</td>
                        <td className="px-2.5 py-1.5 text-right font-bold">{ep.requestCount}</td>
                        <td className="px-2.5 py-1.5 text-right">{ep.avgLatencyMs}ms</td>
                        <td className="px-2.5 py-1.5 text-right text-fg-warning font-semibold">{ep.p95LatencyMs}ms</td>
                        <td className={`px-2.5 py-1.5 text-right font-bold ${ep.errorRatePercent > 0 ? 'text-fg-danger-strong' : 'text-fg-success-strong'}`}>
                          {ep.errorRatePercent}% ({ep.errorCount})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>

        {/* SECTION E: TRAFFIC ALERTS */}
        <div className="rounded-base border border-border-default bg-neutral-primary p-4 space-y-3" data-testid="traffic-alerts-panel">
          <div className="flex items-center justify-between border-b border-border-default pb-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-fg-warning" />
              <div>
                <h4 className="text-xs font-bold text-heading">
                  {language === 'vi' ? 'Cảnh báo lưu lượng (Traffic Alerts)' : "Traffic alerts"}
                </h4>
                <p className="text-xs text-body-subtle">
                  {language === 'vi' ? 'Phát hiện khách quan theo ngưỡng vận hành' : 'Objective threshold-based alerts'}
                </p>
              </div>
            </div>
            <Tag variant="status" tone="neutral" icon={CircleDot}>
              {alerts.length + (streamState === 'DISCONNECTED' ? 1 : 0)}
            </Tag>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {streamState === 'DISCONNECTED' && (
              <div className="rounded-base border border-border-danger-subtle bg-danger-soft p-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <Tag variant="status" tone="danger" icon={AlertCircle}>
                    CRITICAL
                  </Tag>
                  <span className="text-xs font-mono text-body-subtle">STREAM_DISCONNECTED</span>
                </div>
                <p className="font-bold text-heading">
                  {language === 'vi' ? 'Kết nối giám sát thời gian thực bị gián đoạn' : 'Monitoring stream connection lost'}
                </p>
                <p className="text-xs text-body-subtle">
                  {language === 'vi'
                    ? 'Đang tự động kết nối lại với máy chủ mà không tạo dữ liệu nội suy giả.'
                    : 'Attempting automatic reconnection without interpolating synthetic data.'}
                </p>
              </div>
            )}

            {alerts.length === 0 && streamState !== 'DISCONNECTED' ? (
              <div className="rounded-base border border-dashed border-border-default p-4 text-center text-xs text-body-subtle space-y-1 bg-neutral-primary-soft">
                <CheckCircle2 size={18} className="mx-auto text-fg-success-strong" />
                <p className="font-semibold text-heading">
                  {language === 'vi' ? 'Không có cảnh báo bất thường' : 'No active traffic alerts'}
                </p>
                <p className="text-xs">
                  {language === 'vi'
                    ? 'RPS, Error Rate (4xx/5xx) và P95 Latency đều nằm trong ngưỡng an toàn.'
                    : 'RPS, Error Rate and P95 Latency are all within normal thresholds.'}
                </p>
              </div>
            ) : (
              alerts.map((alert) => {
                const badgeTone =
                  alert.severity === 'CRITICAL'
                    ? 'danger'
                    : alert.severity === 'WARNING'
                      ? 'warning'
                      : 'brand';
                return (
                  <div key={alert.id} className="rounded-base border border-border-default bg-neutral-secondary-soft/40 p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <Tag variant="status" tone={badgeTone} icon={AlertCircle}>
                        {alert.severity}
                      </Tag>
                      <span className="font-mono text-xs text-body-subtle">
                        {alert.metricValue} / {alert.thresholdValue}
                      </span>
                    </div>
                    <p className="font-bold text-heading">{alert.title}</p>
                    <p className="text-xs text-body-subtle">{alert.message}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* REQUEST CONTROL & WAF LAYER 7 SECURITY PANEL */}
      <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-control bg-success-soft text-fg-success-strong border border-border-success-subtle">
              <Shield size={16} />
            </span>
            <div>
              <h4 className="text-xs font-bold text-heading flex items-center gap-2">
                <span>{language === 'vi' ? 'Biện pháp bảo vệ & phòng thủ DDoS / Spam (WAF Layer 7)' : "DDoS & anti-spam protection (WAF layer 7)"}</span>
                <Tag variant="status" tone={!wafStatus.active ? "warning" : wafStatus.underAttackMode ? "danger" : "success"} icon={!wafStatus.active ? Clock : wafStatus.underAttackMode ? AlertCircle : CheckCircle2}>
                  <span>{!wafStatus.active ? 'WAF DISABLED' : wafStatus.underAttackMode ? 'UNDER ATTACK ACTIVE' : 'WAF ACTIVE'}</span>
                </Tag>
              </h4>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tạm ẩn nút Kích hoạt Chế độ Khẩn cấp (Under Attack) theo yêu cầu người dùng */}
            {false && (
              <button
                type="button"
                onClick={handleToggleAttackMode}
                disabled={isTogglingAttackMode}
                className={`btn flex items-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-bold transition-colors shadow-sm cursor-pointer ${wafStatus.underAttackMode
                  ? 'bg-danger text-on-brand hover:bg-danger border border-border-danger-subtle'
                  : 'border border-border-default bg-neutral-primary hover:border-danger hover:text-fg-danger-strong text-heading'
                  }`}
              >
                <ShieldAlert size={14} />
                <span>
                  {wafStatus.underAttackMode
                    ? (language === 'vi' ? '🛡️ Đang bật bảo vệ khẩn cấp' : '🛡️ UNDER ATTACK ACTIVE')
                    : (language === 'vi' ? 'Kích hoạt Chế độ Khẩn cấp (Under Attack)' : 'Activate Under Attack Mode')}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Defense Metrics & Configuration Grid */}
        <div className="grid gap-2.5 sm:grid-cols-4 text-xs">
          <div className="rounded-base border border-border-default-subtle bg-neutral-primary p-2.5 space-y-1">
            <span className="text-xs text-body-subtle font-medium">
              {language === 'vi' ? 'Ngưỡng Rate Limiting' : 'Rate Limiting Policy'}
            </span>
            <div className="flex items-center gap-1 font-bold text-heading">
              <Lock size={13} className="text-fg-brand-strong" />
              <span>{language === 'vi' ? `${wafStatus.rateLimitPerMinute} req/phút/IP` : `${wafStatus.rateLimitPerMinute} req/min/IP`}</span>
            </div>
            <div className="flex items-center gap-1 pt-0.5">
              {[30, 60, 100, 200].map((lim) => (
                <button
                  key={lim}
                  type="button"
                  onClick={() => handleChangeRateLimit(lim)}
                  className={`btn rounded-control px-1.5 py-0.5 text-xs font-mono cursor-pointer border ${wafStatus.rateLimitPerMinute === lim
                    ? 'bg-brand-soft text-fg-brand-strong font-bold border-brand'
                    : 'border-border-default hover:border-border-brand-subtle text-body-subtle'
                    }`}
                >
                  {lim}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-base border border-border-default-subtle bg-neutral-primary p-2.5 space-y-1">
            <span className="text-xs text-body-subtle font-medium">
              {language === 'vi' ? 'Phát hiện tấn công dồn dập (Burst)' : 'Burst Attack Protection'}
            </span>
            <div className="flex items-center gap-1 font-bold text-heading font-mono">
              <Flame size={13} className="text-fg-warning" />
              <span>&gt; {wafStatus.burstLimitPerSecond} {language === 'vi' ? 'req/giây' : 'req/s'}</span>
            </div>
            <p className="text-xs text-body-subtle">
              {language === 'vi' ? 'Tự động khóa IP 15 phút nếu gửi vượt ngưỡng' : 'Auto-ban IP 15m if burst exceeded'}
            </p>
          </div>

          <div className="rounded-base border border-border-default-subtle bg-neutral-primary p-2.5 space-y-1">
            <span className="text-xs text-body-subtle font-medium">
              {language === 'vi' ? 'Yêu cầu đã chặn (HTTP 429)' : 'Blocked Requests (HTTP 429)'}
            </span>
            <div className="flex items-center gap-1 font-bold text-fg-danger-strong font-mono text-sm">
              <UserX size={13} />
              <span>+{effectiveRateLimited} req</span>
            </div>
            <p className="text-xs text-body-subtle">
              {language === 'vi' ? 'Đã ngắt tại gateway, bảo vệ tài nguyên DB' : 'Dropped at gateway, protecting DB'}
            </p>
          </div>

          <div className="rounded-base border border-border-default-subtle bg-neutral-primary p-2.5 space-y-1">
            <span className="text-xs text-body-subtle font-medium">
              {language === 'vi' ? 'IP đang bị cách ly' : 'Active Blocked IPs'}
            </span>
            <div className="flex items-center gap-1 font-bold text-heading font-mono text-sm">
              <ShieldAlert size={13} className="text-fg-danger-strong" />
              <span>{wafStatus.activeBlockedIpCount} IP</span>
            </div>
            <p className="text-xs text-body-subtle">
              {language === 'vi' ? 'Tự động mở khóa sau khi hết hạn' : 'Auto-expires when timer finishes'}
            </p>
          </div>
        </div>

        {/* Manual IP Blacklist Form & Blocked IP List */}
        <div className="rounded-base border border-border-default bg-neutral-primary p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-heading flex items-center gap-1.5">
              <UserX size={13} className="text-fg-danger-strong" />
              <span>{language === 'vi' ? 'Danh sách IP bị cách ly / khóa tự động (Automated IP Blacklist)' : 'Isolated IP Blacklist'}</span>
            </span>

            <form onSubmit={handleManualBlockIp} className="flex items-center gap-1.5 text-xs">
              <input
                type="text"
                placeholder={language === 'vi' ? 'Địa chỉ IP (VD: 1.2.3.4)' : 'IP address'}
                value={manualIpToBlock}
                onChange={(e) => setManualIpToBlock(e.target.value)}
                className="form-input h-8 w-32 rounded-control border border-border-default bg-neutral-primary px-2 text-xs text-heading font-mono focus:border-danger focus:outline-none"
              />
              <input
                type="text"
                placeholder={language === 'vi' ? 'Lý do chặn...' : 'Reason...'}
                value={manualBlockReason}
                onChange={(e) => setManualBlockReason(e.target.value)}
                className="form-input h-8 w-36 rounded-control border border-border-default bg-neutral-primary px-2 text-xs text-heading focus:border-danger focus:outline-none"
              />
              <button
                type="submit"
                disabled={isBlockingIp || !manualIpToBlock.trim()}
                className="btn btn-ghost-danger h-8 px-2 text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus size={11} />
                <span>{language === 'vi' ? 'Khóa IP' : 'Block IP'}</span>
              </button>
            </form>
          </div>

          {(wafStatus?.blockedIps ?? []).length === 0 ? (
            <div className="rounded-base border border-dashed border-border-default p-2 text-center text-xs text-body-subtle italic">
              {language === 'vi'
                ? 'Hệ thống an toàn, chưa có IP nào vi phạm ngưỡng tấn công hoặc bị đưa vào danh sách đen.'
                : 'System is safe. No IP currently blacklisted.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-base border border-border-default text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border-default bg-neutral-secondary-soft text-left text-body-subtle text-xs">
                    <th className="font-semibold text-body-subtle text-xs px-2 py-1">IP</th>
                    <th className="font-semibold text-body-subtle text-xs px-2 py-1">{language === 'vi' ? 'Lý do chặn' : 'Reason'}</th>
                    <th className="font-semibold text-body-subtle text-xs px-2 py-1">{language === 'vi' ? 'Thời điểm' : "Blocked at"}</th>
                    <th className="font-semibold text-body-subtle text-xs px-2 py-1">{language === 'vi' ? 'Vi phạm' : 'Violations'}</th>
                    <th className="font-semibold text-body-subtle text-xs px-2 py-1 text-right">{language === 'vi' ? 'Hành động' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(wafStatus?.blockedIps ?? []).map((entry) => (
                    <tr key={entry.ip} className="border-b border-border-default/50 hover:bg-neutral-secondary-soft/50 font-mono">
                      <td className="px-2 py-1 font-bold text-fg-danger-strong">{entry.ip}</td>
                      <td className="px-2 py-1 font-sans text-heading">{entry.reason}</td>
                      <td className="px-2 py-1 text-body-subtle">{formatLogTime(entry.blockedAt)}</td>
                      <td className="px-2 py-1 text-fg-danger-strong font-bold">+{entry.violationCount}</td>
                      <td className="px-2 py-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleUnblockIp(entry.ip)}
                          className="btn btn-secondary rounded-control px-2 py-0.5 text-xs font-sans cursor-pointer"
                        >
                          {language === 'vi' ? 'Bỏ chặn' : 'Unblock'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* REQUEST DETAIL MODAL (SAFE METADATA ONLY) */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-primary/80 p-4" role="dialog" aria-label="Request Detail Modal">
          <div style={{ boxShadow: 'var(--shadow-lg)' }} className="w-full max-w-lg rounded-base border border-border-default bg-neutral-primary-soft p-5 text-xs text-heading shadow-lg space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-border-default pb-2.5">
              <div className="flex items-center gap-2">
                <Info size={15} className="text-fg-success-strong" />
                <span className="font-bold text-sm text-heading">{language === 'vi' ? 'Chi tiết đo lường request' : 'Request Telemetry Detail'}</span>
              </div>
              <IconButton onClick={() => setSelectedRequest(null)} label="Đóng" icon={X} className="hover:bg-neutral-secondary-soft hover:text-heading" />
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-base border border-border-default bg-neutral-secondary-soft p-2">
                <span className="text-body-subtle block text-xs">Request ID / Trace ID</span>
                <span className="font-bold text-fg-success-strong">{selectedRequest.id}</span>
              </div>
              <div className="rounded-base border border-border-default bg-neutral-secondary-soft p-2">
                <span className="text-body-subtle block text-xs">{language === 'vi' ? 'Thời điểm' : 'Timestamp'}</span>
                <span className="font-bold text-heading">{selectedRequest.timestamp}</span>
              </div>
              <div className="rounded-base border border-border-default bg-neutral-secondary-soft p-2">
                <span className="text-body-subtle block text-xs">{language === 'vi' ? 'Phương thức & Mã' : 'Method & Status'}</span>
                <span className="font-bold text-heading">
                  {selectedRequest.method}, HTTP {selectedRequest.status} ({getStatusText(selectedRequest.status)})
                </span>
              </div>
              <div className="rounded-base border border-border-default bg-neutral-secondary-soft p-2">
                <span className="text-body-subtle block text-xs">{language === 'vi' ? 'Độ trễ xử lý' : 'Latency (Duration)'}</span>
                <span className="font-bold text-fg-warning">{selectedRequest.durationMs} ms</span>
              </div>
              <div className="col-span-2 rounded-base border border-border-default bg-neutral-secondary-soft p-2">
                <span className="text-body-subtle block text-xs">{language === 'vi' ? 'Đường dẫn gốc (Đã khử nhạy cảm)' : 'Raw Endpoint (Sanitized)'}</span>
                <span className="font-bold text-heading break-all">{selectedRequest.uri}</span>
              </div>
              <div className="col-span-2 rounded-base border border-border-default bg-neutral-secondary-soft p-2">
                <span className="text-body-subtle block text-xs">{language === 'vi' ? 'Mẫu Route chuẩn hóa' : 'Normalized Route Template'}</span>
                <span className="font-bold text-fg-brand-strong break-all">{selectedRequest.routeTemplate || selectedRequest.uri}</span>
              </div>
              <div className="rounded-base border border-border-default bg-neutral-secondary-soft p-2 flex items-center justify-between">
                <div>
                  <span className="text-body-subtle block text-xs">Client IP</span>
                  <span className="font-bold text-heading">{selectedRequest.clientIp}</span>
                </div>
                {blockedIpSet.has(cleanIp(selectedRequest.clientIp)) ? (
                  <button
                    type="button"
                    onClick={() => setConfirmUnblockIpTarget(cleanIp(selectedRequest.clientIp))}
                    className="btn btn-ghost-danger rounded-control flex items-center gap-1 px-2 py-1 text-xs font-bold cursor-pointer"
                  >
                    <UserX size={11} />
                    <span>{language === 'vi' ? 'Đã khóa (Gỡ chặn)' : 'Banned (Unblock)'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmBlockIpTarget(cleanIp(selectedRequest.clientIp))}
                    className="btn btn-ghost-danger rounded-control flex items-center gap-1 px-2 py-1 text-xs font-bold cursor-pointer"
                  >
                    <UserX size={11} />
                    <span>{language === 'vi' ? 'Khóa IP này (Ban IP)' : 'Ban this IP'}</span>
                  </button>
                )}
              </div>
              <div className="rounded-base border border-border-default bg-neutral-secondary-soft p-2">
                <span className="text-body-subtle block text-xs">{language === 'vi' ? 'Phân loại & Người dùng' : 'Classification & Principal'}</span>
                <span className="font-bold text-heading">{selectedRequest.requestType || 'USER_API'}, {selectedRequest.userEmail}</span>
              </div>
            </div>

            <div className="rounded-base border border-border-success-subtle bg-success-soft p-2 text-xs text-fg-success-strong font-sans">
              {language === 'vi'
                ? 'Chính sách bảo mật: Hệ thống không lưu trữ và không hiển thị Authorization header, Cookie, mật khẩu, API key hoặc nội dung body nhạy cảm.'
                : 'Security Policy: Authorization headers, Cookies, passwords, API keys and sensitive request bodies are never logged or displayed.'}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR DISABLING WAF RATE LIMITER */}
      <ConfirmDialog
        open={confirmWafDisableOpen}
        title={language === 'vi' ? 'Xác nhận tắt bộ giới hạn tần suất (Rate Limiting)' : 'Confirm Disabling Rate Limiting'}
        description={
          language === 'vi'
            ? 'Bạn có chắc chắn muốn tắt bộ giới hạn tần suất (WAF Rate Limiting)? Khi tắt, các IP gửi quá ngưỡng sẽ không bị chặn tự động bằng HTTP 429.'
            : 'Are you sure you want to disable WAF Rate Limiting? Aggressive IPs will not be rate-limited with HTTP 429 while disabled.'
        }
        confirmLabel={language === 'vi' ? 'Đồng ý tắt' : 'Disable'}
        cancelLabel={language === 'vi' ? 'Hủy' : 'Cancel'}
        pending={isTogglingWafActive}
        onCancel={() => setConfirmWafDisableOpen(false)}
        onConfirm={() => handleToggleWafActive(false)}
      />

      {/* MODAL QUẢN LÝ DANH SÁCH BAN IP / BLACKLIST */}
      {blacklistModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-primary/80 p-4"
          role="dialog"
          aria-label="IP Blacklist Modal"
        >
          <div style={{ boxShadow: 'var(--shadow-lg)' }} className="w-full max-w-xl rounded-base border border-border-default bg-neutral-primary-soft p-5 text-xs text-heading shadow-lg space-y-3 font-mono max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-default pb-2.5">
              <div className="flex items-center gap-2">
                <UserX size={16} className="text-fg-danger-strong" />
                <span className="font-bold text-sm text-heading">
                  {language === 'vi' ? 'Quản lý danh sách khóa IP (IP Blacklist & Ban)' : 'IP Blacklist & Ban Management'}
                </span>
                <Tag variant="status" tone="danger" icon={AlertCircle}>
                  {(wafStatus?.blockedIps ?? []).length} IP
                </Tag>
              </div>
              <IconButton onClick={() => setBlacklistModalOpen(false)} label="Đóng" icon={X} className="hover:bg-neutral-secondary-soft hover:text-heading" />
            </div>

            {/* Thông báo lỗi trong modal (nếu có) */}
            {actionError && (
              <div className="flex items-center justify-between rounded-base bg-danger-soft border border-border-danger-subtle p-2 text-xs text-fg-danger-strong">
                <span>{actionError}</span>
                <IconButton onClick={() => setActionError(null)} label="Đóng" icon={X} className="hover:text-fg-danger-strong" />
              </div>
            )}

            {/* Form Khóa IP nhanh */}
            <form onSubmit={handleManualBlockIp} className="flex flex-wrap items-center gap-2 rounded-base border border-border-default bg-neutral-secondary-soft p-2.5">
              <div className="flex-1 min-w-[140px]">
                <span className="text-xs text-body block mb-1">
                  {language === 'vi' ? 'Địa chỉ IP cần khóa:' : 'IP address to ban:'}
                </span>
                <input
                  type="text"
                  placeholder={language === 'vi' ? 'VD: 172.20.0.1' : 'e.g. 172.20.0.1'}
                  value={manualIpToBlock}
                  onChange={(e) => setManualIpToBlock(e.target.value)}
                  className="form-input h-7 w-full rounded-control border border-border-default bg-neutral-primary-soft px-2 text-xs text-heading font-mono focus:border-border-danger-subtle focus:outline-none"
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <span className="text-xs text-body block mb-1">
                  {language === 'vi' ? 'Lý do khóa:' : 'Ban reason:'}
                </span>
                <input
                  type="text"
                  placeholder={language === 'vi' ? 'Lý do (mặc định 15 phút)...' : 'Reason (default 15m)...'}
                  value={manualBlockReason}
                  onChange={(e) => setManualBlockReason(e.target.value)}
                  className="form-input h-7 w-full rounded-control border border-border-default bg-neutral-primary-soft px-2 text-xs text-heading focus:border-border-danger-subtle focus:outline-none"
                />
              </div>
              <div className="self-end">
                <button
                  type="submit"
                  disabled={isBlockingIp || !manualIpToBlock.trim()}
                  className="btn btn-ghost-danger px-3 text-xs font-semibold cursor-pointer flex items-center gap-1"
                >
                  <UserX size={12} />
                  <span>{language === 'vi' ? 'Khóa IP' : 'Block IP'}</span>
                </button>
              </div>
            </form>

            {/* Bảng IP đang bị khóa */}
            {(wafStatus?.blockedIps ?? []).length === 0 ? (
              <div className="rounded-base border border-dashed border-border-default p-4 text-center text-body-subtle italic">
                {language === 'vi' ? 'Hiện chưa có IP nào bị đưa vào danh sách đen.' : 'No IPs currently blacklisted.'}
              </div>
            ) : (
              <div className="rounded-base border border-border-default overflow-hidden">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-default bg-neutral-secondary-soft text-left text-body text-xs">
                      <th className="font-semibold text-body-subtle text-xs px-2.5 py-1.5">IP</th>
                      <th className="font-semibold text-body-subtle text-xs px-2.5 py-1.5">{language === 'vi' ? 'Lý do' : 'Reason'}</th>
                      <th className="font-semibold text-body-subtle text-xs px-2.5 py-1.5">{language === 'vi' ? 'Thời điểm' : "Blocked at"}</th>
                      <th className="font-semibold text-body-subtle text-xs px-2.5 py-1.5">{language === 'vi' ? 'Vi phạm' : 'Violations'}</th>
                      <th className="font-semibold text-body-subtle text-xs px-2.5 py-1.5 text-right">{language === 'vi' ? 'Hành động' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(wafStatus?.blockedIps ?? []).map((entry) => (
                      <tr key={entry.ip} className="border-b border-border-default hover:bg-neutral-secondary-soft font-mono">
                        <td className="px-2.5 py-1.5 font-bold text-fg-danger-strong">{entry.ip}</td>
                        <td className="px-2.5 py-1.5 text-heading font-sans">{entry.reason}</td>
                        <td className="px-2.5 py-1.5 text-body-subtle">{formatLogTime(entry.blockedAt)}</td>
                        <td className="px-2.5 py-1.5 text-fg-danger-strong font-bold">+{entry.violationCount}</td>
                        <td className="px-2.5 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleUnblockIp(entry.ip)}
                            className="btn btn-secondary rounded-control px-2 py-0.5 text-xs font-bold cursor-pointer"
                          >
                            {language === 'vi' ? 'Bỏ chặn' : 'Unblock'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIALOG XÁC NHẬN KHÓA IP NHANH */}
      <ConfirmDialog
        open={Boolean(confirmBlockIpTarget)}
        title={language === 'vi' ? `Xác nhận khóa IP ${confirmBlockIpTarget}` : `Confirm Ban IP ${confirmBlockIpTarget}`}
        description={
          language === 'vi'
            ? `Địa chỉ IP ${confirmBlockIpTarget} sẽ bị đưa vào danh sách đen (Blacklist) và bị từ chối mọi yêu cầu HTTP (HTTP 429) trong 15 phút. Bạn có chắc chắn muốn khóa IP này?`
            : `IP ${confirmBlockIpTarget} will be blacklisted and rejected with HTTP 429 for 15 minutes. Are you sure you want to block this IP?`
        }
        confirmLabel={language === 'vi' ? 'Khóa IP ngay' : 'Block IP Now'}
        cancelLabel={language === 'vi' ? 'Hủy' : 'Cancel'}
        variant="danger"
        pending={isBlockingIp}
        onCancel={() => setConfirmBlockIpTarget(null)}
        onConfirm={async () => {
          if (!confirmBlockIpTarget) return;
          await handleQuickBlockIp(confirmBlockIpTarget, 'Admin manual block from access log', 15);
          setConfirmBlockIpTarget(null);
        }}
      />

      {/* DIALOG XÁC NHẬN BỎ CHẶN IP */}
      <ConfirmDialog
        open={Boolean(confirmUnblockIpTarget)}
        title={language === 'vi' ? `Gỡ chặn địa chỉ IP ${confirmUnblockIpTarget}` : `Unblock IP ${confirmUnblockIpTarget}`}
        description={
          language === 'vi'
            ? `Địa chỉ IP ${confirmUnblockIpTarget} sẽ được xóa khỏi danh sách đen và được phép gửi yêu cầu bình thường trở lại. Bạn có chắc chắn muốn bỏ chặn?`
            : `IP ${confirmUnblockIpTarget} will be removed from blacklist and allowed to send requests again.`
        }
        confirmLabel={language === 'vi' ? 'Gỡ chặn ngay' : 'Unblock Now'}
        cancelLabel={language === 'vi' ? 'Hủy' : 'Cancel'}
        variant="brand"
        onCancel={() => setConfirmUnblockIpTarget(null)}
        onConfirm={async () => {
          if (!confirmUnblockIpTarget) return;
          await handleUnblockIp(confirmUnblockIpTarget);
          setConfirmUnblockIpTarget(null);
        }}
      />
    </div>
  );
}
