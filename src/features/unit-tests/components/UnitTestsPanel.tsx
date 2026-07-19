import { useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Code2,
  FileText,
  ListChecks,
  PlayCircle,
  Settings2,
  ShieldCheck,
} from 'lucide-react';

const TARGET_LAYERS = ['Controller', 'Service', 'Repository'] as const;
const GENERATION_MODES = ['NEW_TEST', 'IMPROVE_EXISTING_TEST', 'SUPPLEMENT_EXISTING_TEST'] as const;

export function UnitTestsPanel() {
  const [targetLayer, setTargetLayer] = useState<(typeof TARGET_LAYERS)[number]>('Service');
  const [generationMode, setGenerationMode] = useState<(typeof GENERATION_MODES)[number]>('NEW_TEST');

  const preview = useMemo(
    () => `@Test
void shouldReturnExpectedResult() {
    // Arrange
    var request = buildValidRequest();

    // Act
    var result = ${targetLayer.toLowerCase()}UnderTest.execute(request);

    // Assert
    assertThat(result).isNotNull();
}`,
    [targetLayer],
  );

  return (
    <section className="mt-8 animate-fade-in">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-heading">Unit Tests</h3>
          <p className="mt-1 text-xs text-body-subtle">Chuẩn bị class test, method test và assertion trước khi sinh code.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" disabled>
            <Bot size={14} />
            AI sinh Unit Test
          </button>
          <button className="btn btn-brand" disabled>
            <CheckCircle2 size={14} />
            Approve
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-default bg-brand-softer text-fg-brand-strong">
            <ListChecks size={16} strokeWidth={1.8} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-body-subtle">Approved Cases</p>
          <p className="mt-1 text-2xl font-bold text-heading">0</p>
        </div>
        <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-default bg-neutral-secondary-medium text-body-subtle">
            <FileText size={16} strokeWidth={1.8} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-body-subtle">Draft Classes</p>
          <p className="mt-1 text-2xl font-bold text-heading">0</p>
        </div>
        <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-default bg-neutral-secondary-medium text-body-subtle">
            <Settings2 size={16} strokeWidth={1.8} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-body-subtle">Mode</p>
          <p className="mt-1 truncate text-sm font-semibold text-heading">{generationMode}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-default bg-neutral-secondary-medium text-body-subtle">
              <Code2 size={15} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-semibold text-heading">Test generation setup</p>
              <p className="mt-0.5 text-xs text-body-subtle">UI-only, chờ dữ liệu Test Case đã duyệt.</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <select
              aria-label="Chọn Test Case"
              className="form-input md:col-span-2"
              disabled
              defaultValue=""
            >
              <option value="">Chọn Test Case đã duyệt</option>
            </select>
            <select
              aria-label="Target layer"
              className="form-input"
              value={targetLayer}
              onChange={(event) => setTargetLayer(event.target.value as (typeof TARGET_LAYERS)[number])}
            >
              {TARGET_LAYERS.map((layer) => (
                <option key={layer} value={layer}>{layer}</option>
              ))}
            </select>
            <select
              aria-label="Generation mode"
              className="form-input"
              value={generationMode}
              onChange={(event) => setGenerationMode(event.target.value as (typeof GENERATION_MODES)[number])}
            >
              {GENERATION_MODES.map((mode) => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
            <input
              aria-label="Test class name"
              className="form-input"
              placeholder="Test class name, ví dụ OrderServiceTest"
            />
            <input
              aria-label="Test method name"
              className="form-input"
              placeholder="Test method name"
            />
            <input
              aria-label="Package name"
              className="form-input md:col-span-2"
              placeholder="Package name"
            />
            <textarea
              aria-label="Mock setup"
              className="form-input min-h-[92px] resize-y md:col-span-2"
              placeholder="Mock setup"
            />
            <textarea
              aria-label="Assertion focus"
              className="form-input min-h-[92px] resize-y md:col-span-2"
              placeholder="Assertion focus"
            />
          </div>
        </div>

        <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-heading">Code preview</p>
              <p className="mt-0.5 text-xs text-body-subtle">Khung xem trước để reviewer đọc nhanh trước khi approve.</p>
            </div>
            <button className="btn btn-secondary shrink-0" disabled>
              <PlayCircle size={14} />
              Chạy test
            </button>
          </div>
          <pre className="min-h-[236px] overflow-x-auto rounded-default border border-border-default bg-neutral-secondary-soft p-4 text-xs leading-relaxed text-heading">
            <code>{preview}</code>
          </pre>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-base border border-border-default bg-neutral-primary-soft shadow-sm">
        <div className="grid grid-cols-[140px_minmax(0,1fr)_140px] bg-neutral-secondary-soft px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-body-subtle">
          <span>Case</span>
          <span>Target</span>
          <span>Status</span>
        </div>
        <div className="grid grid-cols-[140px_minmax(0,1fr)_140px] items-center border-t border-border-default px-3 py-4 text-sm">
          <span className="font-mono text-xs font-semibold text-heading">-</span>
          <span className="truncate text-body-subtle">Chưa có Test Case đã duyệt để sinh Unit Test.</span>
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] font-semibold text-body-subtle">
            <ShieldCheck size={11} />
            Chờ case
          </span>
        </div>
      </div>
    </section>
  );
}
