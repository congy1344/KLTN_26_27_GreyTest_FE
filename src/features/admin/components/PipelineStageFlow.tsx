import { CheckCircle2, ChevronRight, FileCode2, FileSpreadsheet, FileText, Sparkles, Clock, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../shared/i18n/language';
import type { AdminOverview } from '../types';

interface PipelineStageFlowProps {
  overview?: AdminOverview;
  activeStage?: 'BUSINESS_RULE' | 'TEST_PLAN' | 'TEST_CASE' | 'UNIT_TEST';
}

export function PipelineStageFlow({ overview, activeStage = 'UNIT_TEST' }: PipelineStageFlowProps) {
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
      name: language === 'vi' ? 'Sinh Unit Test (JUnit 5)' : 'JUnit 5 Generation',
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
    <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 sm:p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-fg-brand">
              {language === 'vi' ? 'Quy trình AI Grey-box' : 'Grey-box AI Pipeline'}
            </span>
            <span className="text-[11px] text-body-subtle">
              ({language === 'vi' ? 'Nhấn vào giai đoạn để xem lịch sử sinh' : 'Click stage to inspect records'})
            </span>
          </div>
          <h3 className="mt-1 text-lg sm:text-xl font-extrabold text-heading tracking-tight">
            {language === 'vi' ? 'Trạng thái Tiến trình BR → TP → TC → UT' : 'Pipeline Progression: BR → TP → TC → UT'}
          </h3>
          <p className="mt-0.5 text-xs text-body-subtle">
            {language === 'vi'
              ? 'Tiến trình trích xuất quy tắc nghiệp vụ từ AST đến sinh mã nguồn Unit Test JUnit 5 hoàn chỉnh trên toàn hệ thống.'
              : 'End-to-end Grey-box progression from AST business rules to executable JUnit 5 test classes.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-softer px-3 py-1 text-xs font-bold text-fg-brand-strong">
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
            {language === 'vi' ? 'Hàng đợi vận hành ổn định' : 'Pipeline Operational'}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
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
              className={`group relative flex flex-col justify-between rounded-xl border p-4 sm:p-5 transition-all cursor-pointer select-none ${
                isActive
                  ? 'border-brand bg-brand-softer/30 shadow-xs ring-2 ring-brand/30'
                  : 'border-border-default-subtle bg-neutral-secondary-soft/60 hover:bg-neutral-secondary-soft hover:border-brand/60 hover:shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-softer text-sm font-sans font-extrabold text-fg-brand group-hover:bg-brand group-hover:text-white transition-colors">
                    {stage.short}
                  </span>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-heading group-hover:text-fg-brand transition-colors">
                      {stage.name}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-body-subtle mt-0.5">{stage.desc}</p>
                  </div>
                </div>
                <Icon size={18} className="text-body-subtle shrink-0 mt-0.5" />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border-default-subtle pt-2.5 text-xs">
                <div>
                  <span className="font-sans tabular-nums text-base sm:text-lg font-extrabold text-heading">
                    {stage.count}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-sans text-xs font-semibold text-fg-brand group-hover:underline">
                  {stage.hasData ? (
                    <>
                      <CheckCircle2 size={13} className="text-fg-success" />
                      <span className="text-fg-brand">{language === 'vi' ? 'Xem tác vụ' : 'View jobs'}</span>
                      <ArrowUpRight size={13} className="text-body-subtle group-hover:text-fg-brand" />
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
                <div className="hidden md:absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-body-subtle pointer-events-none">
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
