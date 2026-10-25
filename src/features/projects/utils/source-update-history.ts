import type { ImpactSummaryDto } from '../types';

/** Xác định phạm vi lịch sử, giữ thông tin toàn project khi metadata cũ chưa đủ. */
export function sourceUpdateHistoryScope(impact: ImpactSummaryDto | null, servicePath?: string | null) {
  const normalize = (path: string) => path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
  const selected = servicePath ? normalize(servicePath) : undefined;
  const methods = Array.isArray(impact?.changedMethods) ? impact.changedMethods : [];
  const unknownScope = methods.some((method) => typeof method?.servicePath !== 'string' || !method.servicePath);
  const scopes = [...new Set(methods.map((method) => method?.servicePath)
    .filter((path): path is string => typeof path === 'string' && Boolean(path)))];
  const matches = (path: string) => !selected || normalize(path) === selected
    || normalize(path).endsWith(`/${selected}`) || selected.endsWith(`/${normalize(path)}`);
  const rootScopeChanged = selected && scopes.some((path) => normalize(path) !== selected
    && (selected === '.' || normalize(path) === '.'));
  return {
    visible: !selected || unknownScope || rootScopeChanged || scopes.length === 0 || scopes.some(matches),
    projectWide: Boolean(selected && (unknownScope || rootScopeChanged || scopes.length === 0 || scopes.some((path) => !matches(path)))),
  };
}
