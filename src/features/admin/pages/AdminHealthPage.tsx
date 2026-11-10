import {
  AlertTriangle, ArrowLeft, CheckCircle2, Clock,
  Database, HeartPulse, RefreshCw, Server, Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadingState } from '../../../shared/components/LoadingState';
import { AdminShell } from '../components/AdminShell';
import { SystemHeartbeatPulseChart } from '../components/SystemHeartbeatPulseChart';
import { useServiceHealth } from '../hooks/useAdmin';
import { useLanguage } from '../../../shared/i18n/language';

function formatUptime(seconds?: number, lang: 'vi' | 'en' = 'vi'): string {
  if (seconds == null || seconds < 0) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (days > 0) {
    return lang === 'vi'
      ? `${days} ngày ${hours} giờ ${minutes} phút ${secs} giây`
      : `${days}d ${hours}h ${minutes}m ${secs}s`;
  }
  if (hours > 0) {
    return lang === 'vi'
      ? `${hours} giờ ${minutes} phút ${secs} giây`
      : `${hours}h ${minutes}m ${secs}s`;
  }
  return lang === 'vi' ? `${minutes} phút ${secs} giây` : `${minutes}m ${secs}s`;
}

export function AdminHealthPage() {
  const { language } = useLanguage();
  const healthQuery = useServiceHealth();

  // Uptime đếm giây trực tiếp (tăng 1 giây mỗi 1000ms để chạy liên tục trên giao diện)
  const [liveUptime, setLiveUptime] = useState<number | null>(null);
  const uptimeSyncRef = useRef<{ baseSeconds: number; syncedAt: number } | null>(null);

  useEffect(() => {
    if (healthQuery.data?.uptimeSeconds != null) {
      uptimeSyncRef.current = {
        baseSeconds: healthQuery.data.uptimeSeconds,
        syncedAt: Date.now(),
      };
      setLiveUptime(healthQuery.data.uptimeSeconds);
    }
  }, [healthQuery.data?.uptimeSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (uptimeSyncRef.current) {
        const elapsed = Math.floor((Date.now() - uptimeSyncRef.current.syncedAt) / 1000);
        setLiveUptime(uptimeSyncRef.current.baseSeconds + elapsed);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const renderServiceBadge = (status: string | undefined) => {
    const s = status ?? 'UNKNOWN';
    const isOk = s === 'UP' || s === 'ONLINE' || s === 'READY' || s === 'IN_PROCESS';
    const label =
      s === 'UP' || s === 'ONLINE'
        ? (language === 'vi' ? 'Hoạt động' : 'Up')
        : s === 'READY' || s === 'IN_PROCESS'
          ? (language === 'vi' ? 'Sẵn sàng' : 'Ready')
          : (language === 'vi' ? 'Ngừng hoạt động' : 'Down');

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans text-[11px] font-bold ${
          isOk
            ? 'bg-success-soft text-fg-success-strong border border-border-success-subtle'
            : 'bg-warning-soft text-fg-warning border border-border-warning-subtle'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${isOk ? 'bg-success animate-pulse' : 'bg-warning'}`} />
        <span>{label}</span>
      </span>
    );
  };

  const isAllHealthy =
    healthQuery.data?.application === 'UP' &&
    healthQuery.data?.database !== 'DOWN' &&
    healthQuery.data?.llmGateway !== 'KEY_MISSING';

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

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-fg-brand">
              System Health & Observability
            </span>
            <span className="rounded-md bg-brand-softer px-2 py-0.5 text-[10px] font-sans font-bold text-fg-brand-strong">
              Spring Boot Actuator · Real-time
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-heading sm:text-3xl">
            {language === 'vi' ? 'Trạng Thái Dịch Vụ & Giám Sát Hệ Thống' : 'Service Health & Live Observability'}
          </h1>
          <p className="mt-1 text-xs text-body-subtle">
            {language === 'vi'
              ? 'Kiểm tra tình trạng kết nối các dịch vụ cốt lõi, giám sát luồng HTTP traffic thời gian thực và phòng thủ WAF/Anti-DDoS.'
              : 'Monitor core infrastructure health, live HTTP traffic streams, real-time pulse waveforms and WAF/Anti-DDoS defenses.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => healthQuery.refetch()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-neutral-primary-soft px-3 py-1.5 text-xs font-semibold text-body hover:bg-neutral-secondary-soft shadow-xs cursor-pointer"
        >
          <RefreshCw
            size={13}
            className={healthQuery.isFetching ? 'animate-spin text-brand' : ''}
          />
          <span>{language === 'vi' ? 'Làm mới' : 'Reload'}</span>
        </button>
      </div>

      {healthQuery.isLoading ? (
        <div className="p-8">
          <LoadingState label={language === 'vi' ? 'Đang kiểm tra trạng thái dịch vụ...' : 'Checking service health...'} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Service Cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Spring Boot REST API */}
            <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-softer text-fg-brand">
                  <Server size={18} />
                </span>
                {renderServiceBadge(healthQuery.data?.application)}
              </div>
              <h3 className="mt-3 text-sm font-bold text-heading">Spring Boot REST API</h3>
              <p className="mt-1 text-xs text-body-subtle">
                Cổng: 8080 · Java 17 LTS · Flyway V30
              </p>
            </div>

            {/* PostgreSQL Database */}
            <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-softer text-fg-brand">
                  <Database size={18} />
                </span>
                {renderServiceBadge(healthQuery.data?.database)}
              </div>
              <h3 className="mt-3 text-sm font-bold text-heading">PostgreSQL Database</h3>
              <p className="mt-1 text-xs text-body-subtle">
                Cơ sở dữ liệu người dùng & tiến trình
              </p>
            </div>

            {/* AI Gateway */}
            <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-softer text-fg-brand">
                  <Zap size={18} />
                </span>
                {renderServiceBadge(healthQuery.data?.llmGateway)}
              </div>
              <h3 className="mt-3 text-sm font-bold text-heading">Cổng Kết Nối AI (LLM)</h3>
              <p className="mt-1 text-xs text-body-subtle">
                VietAPI / Google Gemini · Pool Key sẵn sàng
              </p>
            </div>

            {/* JavaParser AST */}
            <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-softer text-fg-brand">
                  <HeartPulse size={18} />
                </span>
                {renderServiceBadge(healthQuery.data?.javaParser)}
              </div>
              <h3 className="mt-3 text-sm font-bold text-heading">JavaParser AST Engine</h3>
              <p className="mt-1 text-xs text-body-subtle">
                Trích xuất AST & Phân tích cấu trúc mã nguồn
              </p>
            </div>
          </section>

          {/* Live HTTP Traffic & Anti-DDoS Stream Chart */}
          <SystemHeartbeatPulseChart
            serverThreadCount={healthQuery.data?.threadCount}
            serverActiveConnections={healthQuery.data?.activeConnections}
          />

          {/* Uptime & Service Readiness Overview */}
          <section className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-fg-brand" />
                <h3 className="text-sm font-bold text-heading">
                  {language === 'vi' ? 'Tình Trạng Vận Hành Hệ Thống' : 'System Operational Status'}
                </h3>
              </div>
              <span className="text-xs text-body-subtle">
                {language === 'vi' ? 'Tự động kiểm tra định kỳ 30 giây' : 'Refreshes every 30 seconds'}
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-lg border border-border-default-subtle bg-neutral-secondary-soft/50 p-3.5 space-y-1">
                <span className="text-body-subtle font-medium">
                  {language === 'vi' ? 'Thời gian hoạt động liên tục (Uptime)' : 'Continuous Uptime'}
                </span>
                <p className="mt-1 font-sans tabular-nums text-lg font-bold text-heading flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  <span>{formatUptime(liveUptime ?? healthQuery.data?.uptimeSeconds, language)}</span>
                </p>
                <p className="text-[11px] text-body-subtle">
                  {language === 'vi' ? 'Máy chủ chạy ổn định, thời gian đếm giây thực tế' : 'Server operating continuously with live seconds count'}
                </p>
              </div>

              <div className="rounded-lg border border-border-default-subtle bg-neutral-secondary-soft/50 p-3.5 space-y-1">
                <span className="text-body-subtle font-medium">
                  {language === 'vi' ? 'Trạng thái sẵn sàng cho Pipeline' : 'Pipeline Readiness'}
                </span>
                <p className={`mt-1 text-lg font-bold flex items-center gap-1.5 ${isAllHealthy ? 'text-fg-success-strong' : 'text-fg-warning'}`}>
                  {isAllHealthy ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  <span>
                    {isAllHealthy
                      ? (language === 'vi' ? 'Sẵn sàng tiếp nhận' : 'Ready for test generation')
                      : (language === 'vi' ? 'Có dịch vụ gián đoạn' : 'Service Degraded')}
                  </span>
                </p>
                <p className="text-[11px] text-body-subtle">
                  {isAllHealthy
                    ? (language === 'vi' ? 'Sẵn sàng thực thi chu trình BR → TP → TC → UT' : 'Ready to execute BR → TP → TC → UT pipeline')
                    : (language === 'vi' ? 'Vui lòng kiểm tra dịch vụ báo lỗi trước khi sinh test' : 'Check degraded services before generating tests')}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}

