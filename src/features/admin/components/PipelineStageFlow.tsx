import { ArrowUpRight, CheckCircle2, ChevronRight, CircleDot, Clock, FileCode2, FileSpreadsheet, FileText, Sparkles } from 'lucide-react';
import { Tag } from '../../../shared/components/Tag';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../shared/i18n/language';
import type { AdminOverview } from '../types';

interface PipelineStageFlowProps {
  overview?: AdminOverview;
  activeStage?: 'BUSINESS_RULE' | 'TEST_PLAN' | 'TEST_CASE' | 'UNIT_TEST';
}

export function PipelineStageFlow({ overview, activeStage }: PipelineStageFlowProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const brCount = overview?.totalBusinessRules ?? 0;
  const tpCount = overview?.totalTestPlans ?? 0;
  const tcCount = overview?.totalTestCases ?? 0;
  const utCount = overview?.totalUnitTests ?? 0;

  const stages = [
    {
      key: 'BUSINESS_RULE',
      short: 'BR',
      action: 'GENERATE_BUSINESS_RULE',
      name: language === 'vi' ? 'Sinh BR' : 'Business Rules',
      desc: language === 'vi' ? 'JavaParser AST Analysis' : 'AST Semantic Extraction',
      count: `${brCount.toLocaleString()} rules`,
      hasData: brCount > 0,
      icon: FileSpreadsheet,
      status: activeStage === 'BUSINESS_RULE' ? 'ACTIVE' : brCount > 0 ? 'COMPLETED' : 'IDLE',
    },
    {
      key: 'TEST_PLAN',
      short: 'TP',
      action: 'GENERATE_TEST_PLAN',
      name: language === 'vi' ? 'Sinh Test Plan' : 'Test Plan Synthesis',
      desc: language === 'vi' ? 'Chiến lược bao phủ' : 'Coverage Strategy & Matrix',
      count: `${tpCount.toLocaleString()} plans`,
      hasData: tpCount > 0,
      icon: FileText,
      status: activeStage === 'TEST_PLAN' ? 'ACTIVE' : tpCount > 0 ? 'COMPLETED' : 'IDLE',
    },
    {
      key: 'TEST_CASE',
      short: 'TC',
      action: 'GENERATE_TEST_CASE',
      name: language === 'vi' ? 'Sinh Test Case' : 'Test Cases Design',
      desc: language === 'vi' ? 'Biên & tương đương' : 'Boundary & Equivalence Cases',
      count: `${tcCount.toLocaleString()} cases`,
      hasData: tcCount > 0,
      icon: Sparkles,
      status: activeStage === 'TEST_CASE' ? 'ACTIVE' : tcCount > 0 ? 'COMPLETED' : 'IDLE',
    },
    {
      key: 'UNIT_TEST',
      short: 'UT',
      action: 'GENERATE_UNIT_TEST',
      name: language === 'vi' ? 'Sinh Unit Test' : 'Unit Tests Generation',
      desc: language === 'vi' ? 'Mockito & AssertJ Code' : 'Synthesized Test Classes',
      count: `${utCount.toLocaleString()} tests`,
      hasData: utCount > 0,
      icon: FileCode2,
      status: activeStage === 'UNIT_TEST' ? 'ACTIVE' : utCount > 0 ? 'COMPLETED' : 'IDLE',
    },
  ];

  const handleStageClick = (stageKey: string) => {
    navigate(`/admin/jobs?stage=${stageKey}`);
  };

  return (
    <div className="rounded-base border border-border-default bg-neutral-primary-soft p-5 sm:p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-body-subtle">
              {language === 'vi' ? 'Quy trình AI Grey-box' : 'Grey-box AI Pipeline'}
            </span>
            <span className="text-xs text-body-subtle">
              ({language === 'vi' ? 'Nhấn vào giai đoạn để xem lịch sử sinh' : 'Click stage to inspect records'})
            </span>
          </div>
          <h3 className="mt-1 text-lg sm:text-xl font-extrabold text-heading">
            {language === 'vi' ? 'Trạng thái tiến trình BR → TP → TC → UT' : 'Pipeline Progression: BR → TP → TC → UT'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Tag variant="status" tone="brand" icon={CircleDot}>
            {language === 'vi' ? 'Hàng đợi vận hành ổn định' : 'Pipeline Operational'}
          </Tag>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isLast = idx === stages.length - 1;
          const isActive = stage.status === 'ACTIVE';

          return (
            <div
              key={stage.key}
              onClick={() => handleStageClick(stage.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleStageClick(stage.key);
                }
              }}
              title={language === 'vi' ? `Xem nhật ký tác vụ ${stage.name}` : `View ${stage.name} job logs`}
              className={`group relative flex h-full min-w-0 flex-col justify-between rounded-base border p-4 sm:p-5 transition-colors cursor-pointer select-none ${isActive
                ? 'border-brand bg-brand-softer/30 shadow-xs ring-2 ring-brand/30'
                : 'border-border-default-subtle bg-neutral-secondary-soft/60 hover:border-brand hover:bg-brand-softer/30 hover:shadow-xs hover:ring-2 hover:ring-brand/30'
                }`}
            >
              {/* Giữ chiều cao tối thiểu vùng tiêu đề để đường kẻ chân thẻ thẳng hàng khi tên giai đoạn xuống 2 dòng */}
              <div className="flex min-h-[2.75rem] items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-brand-softer text-sm font-sans font-semibold text-fg-brand-strong group-hover:bg-brand-soft transition-colors">
                    {stage.short}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-base font-bold text-heading group-hover:text-fg-brand-strong transition-colors">
                      {stage.name}
                    </h4>
                    <p className="text-xs sm:text-xs text-body-subtle mt-0.5">{stage.desc}</p>
                  </div>
                </div>
                <Icon size={18} className="text-body-subtle shrink-0 mt-0.5" />
              </div>

              {/* Cố định chân thẻ 2 dòng để đường kẻ ngang thẳng hàng ngay cả ở viewport 1280px–1366px */}
              <div className="mt-4 flex flex-col items-start gap-1 border-t border-border-default-subtle pt-2.5 text-xs">
                <div>
                  <span className="whitespace-nowrap font-sans tabular-nums text-base sm:text-lg font-extrabold text-heading">
                    {stage.count}
                  </span>
                </div>
                <div className="flex items-center gap-1 whitespace-nowrap font-sans text-xs font-semibold text-fg-brand-strong group-hover:underline">
                  {stage.hasData ? (
                    <>
                      <CheckCircle2 size={13} className="text-fg-success-strong" />
                      <span className="text-fg-brand-strong">{language === 'vi' ? 'Xem tác vụ' : 'View jobs'}</span>
                      <ArrowUpRight size={13} className="text-body-subtle group-hover:text-fg-brand-strong" />
                    </>
                  ) : (
                    <span className="text-body-subtle font-normal flex items-center gap-1">
                      <Clock size={12} />
                      {language === 'vi' ? 'Chưa có dữ liệu' : 'No records'}
                    </span>
                  )}
                </div>
              </div>

              {!isLast && (
                <div className="hidden xl:block xl:absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-body-subtle pointer-events-none">
                  <ChevronRight size={18} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
