import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProjectSourceUpdates } from '../api/source-update-api';
import type { ImpactSummaryDto, MethodDiffType } from '../types';

const normalize = (str?: string | null) => (str ? str.replace(/\s+/g, '') : '');

/** Hook cung cấp thông tin AST diff và các artifact bị ảnh hưởng (BR, TP, TC, UT) cho toàn bộ các bước downstream. */
export function useSourceUpdateImpact(projectId: number) {
  let query: { data?: typeof fetchProjectSourceUpdates extends (...args: any[]) => Promise<infer R> ? R : any; isLoading: boolean; error: unknown };
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    query = useQuery({
      queryKey: ['source-updates', projectId],
      queryFn: () => fetchProjectSourceUpdates(projectId),
      enabled: projectId > 0,
    });
  } catch {
    query = { data: undefined, isLoading: false, error: null };
  }

  const activeUpdate = query.data?.find((u) => u.status === 'READY_TO_APPLY' || u.status === 'ANALYZED' || u.status === 'GENERATING' || u.status === 'DRAFT')
    ?? query.data?.find((u) => u.status === 'APPLIED' && ((u.totalChangedMethods ?? 0) > 0 || (u.items && u.items.length > 0)))
    ?? query.data?.find((u) => u.status === 'APPLIED');

  let impact: ImpactSummaryDto | null = null;
  if (activeUpdate?.impactSummary) {
    try {
      impact = JSON.parse(activeUpdate.impactSummary);
    } catch {
      impact = null;
    }
  }

  // Exact maps with normalized signatures vs fuzzy maps
  const exactMethodDiffMap: Record<string, MethodDiffType> = {};
  const fuzzyMethodDiffMap: Record<string, MethodDiffType> = {};
  const methodDiffMap: Record<string, MethodDiffType> = {};

  if (impact?.changedMethods) {
    for (const m of impact.changedMethods) {
      const diff = m.diffType;
      if (m.methodKey) {
        exactMethodDiffMap[normalize(m.methodKey)] = diff;
        methodDiffMap[m.methodKey] = diff;
      }
      if (m.qualifiedClassName && m.signature) {
        exactMethodDiffMap[normalize(`${m.qualifiedClassName}#${m.signature}`)] = diff;
      }
      if (m.className && m.signature) {
        exactMethodDiffMap[normalize(`${m.className}#${m.signature}`)] = diff;
      }
      if (m.signature) {
        exactMethodDiffMap[normalize(m.signature)] = diff;
      }
      // Fuzzy (name only)
      if (m.qualifiedClassName && m.methodName) {
        fuzzyMethodDiffMap[normalize(`${m.qualifiedClassName}#${m.methodName}`)] = diff;
        methodDiffMap[`${m.qualifiedClassName}#${m.methodName}`] = diff;
      }
      if (m.className && m.methodName) {
        fuzzyMethodDiffMap[normalize(`${m.className}#${m.methodName}`)] = diff;
      }
      if (m.methodName) {
        fuzzyMethodDiffMap[normalize(m.methodName)] = diff;
        if (!methodDiffMap[m.methodName]) {
          methodDiffMap[m.methodName] = diff;
        }
      }
    }
  }

  // Bổ sung từ activeUpdate.items nếu có targetType === 'METHOD'
  if (activeUpdate?.items) {
    for (const item of activeUpdate.items) {
      if (item.targetType === 'METHOD' && item.targetKey) {
        const diff: MethodDiffType = item.action === 'CREATE' ? 'ADDED' : item.action === 'REMOVE' ? 'DELETED' : 'MODIFIED';
        exactMethodDiffMap[normalize(item.targetKey)] = diff;
        methodDiffMap[item.targetKey] = diff;
        const hashIdx = item.targetKey.indexOf('#');
        if (hashIdx >= 0) {
          const qualifiedClass = item.targetKey.slice(0, hashIdx);
          const sig = item.targetKey.slice(hashIdx + 1);
          exactMethodDiffMap[normalize(`${qualifiedClass}#${sig}`)] = diff;
          const openParen = sig.indexOf('(');
          const name = openParen >= 0 ? sig.slice(0, openParen) : sig;
          fuzzyMethodDiffMap[normalize(`${qualifiedClass}#${name}`)] = diff;
        }
      }
    }
  }

  const getMethodDiff = (
    qualifiedClassName?: string | null,
    methodName?: string | null,
    parameters?: Array<{ name?: string; type?: string }> | null
  ): MethodDiffType | undefined => {
    if (!methodName) return undefined;
    const paramTypes = (parameters ?? []).map((p) => p.type ?? '').join(',');
    const sigWithParams = `${methodName}(${paramTypes})`;

    if (qualifiedClassName) {
      const exactFull = exactMethodDiffMap[normalize(`${qualifiedClassName}#${sigWithParams}`)];
      if (exactFull) return exactFull;

      const simpleClass = qualifiedClassName.split('.').pop();
      if (simpleClass) {
        const exactSimple = exactMethodDiffMap[normalize(`${simpleClass}#${sigWithParams}`)];
        if (exactSimple) return exactSimple;
      }
    }

    const exactSig = exactMethodDiffMap[normalize(sigWithParams)];
    if (exactSig) return exactSig;

    // Fuzzy fallback
    if (qualifiedClassName) {
      const fuzzyFull = fuzzyMethodDiffMap[normalize(`${qualifiedClassName}#${methodName}`)];
      if (fuzzyFull) return fuzzyFull;
      const simpleClass = qualifiedClassName.split('.').pop();
      if (simpleClass) {
        const fuzzySimple = fuzzyMethodDiffMap[normalize(`${simpleClass}#${methodName}`)];
        if (fuzzySimple) return fuzzySimple;
      }
    }

    return fuzzyMethodDiffMap[normalize(methodName)] || methodDiffMap[methodName];
  };

  const affectedRuleIds = new Set<number>(impact?.affectedBusinessRuleIds ?? []);
  const affectedPlanIds = new Set<number>(impact?.affectedTestPlanIds ?? []);
  const affectedCaseIds = new Set<number>(impact?.affectedTestCaseIds ?? []);
  const affectedUnitTestIds = new Set<number>(impact?.affectedUnitTestIds ?? []);

  const addedRuleIds = new Set<number>();
  const modifiedRuleIds = new Set<number>(affectedRuleIds);
  const deletedRuleIds = new Set<number>();

  const addedPlanIds = new Set<number>();
  const modifiedPlanIds = new Set<number>(affectedPlanIds);
  const deletedPlanIds = new Set<number>();

  const addedCaseIds = new Set<number>();
  const modifiedCaseIds = new Set<number>(affectedCaseIds);
  const deletedCaseIds = new Set<number>();

  const addedUnitTestIds = new Set<number>();
  const modifiedUnitTestIds = new Set<number>(affectedUnitTestIds);
  const deletedUnitTestIds = new Set<number>();

  if (activeUpdate?.items) {
    for (const item of activeUpdate.items) {
      if (item.targetId != null) {
        const isCreate = item.action === 'CREATE';
        const isRemove = item.action === 'REMOVE';

        if (item.targetType === 'BUSINESS_RULE') {
          affectedRuleIds.add(item.targetId);
          if (isCreate) { addedRuleIds.add(item.targetId); modifiedRuleIds.delete(item.targetId); }
          else if (isRemove) { deletedRuleIds.add(item.targetId); modifiedRuleIds.delete(item.targetId); }
          else { modifiedRuleIds.add(item.targetId); }
        } else if (item.targetType === 'TEST_PLAN') {
          affectedPlanIds.add(item.targetId);
          if (isCreate) { addedPlanIds.add(item.targetId); modifiedPlanIds.delete(item.targetId); }
          else if (isRemove) { deletedPlanIds.add(item.targetId); modifiedPlanIds.delete(item.targetId); }
          else { modifiedPlanIds.add(item.targetId); }
        } else if (item.targetType === 'TEST_CASE') {
          affectedCaseIds.add(item.targetId);
          if (isCreate) { addedCaseIds.add(item.targetId); modifiedCaseIds.delete(item.targetId); }
          else if (isRemove) { deletedCaseIds.add(item.targetId); modifiedCaseIds.delete(item.targetId); }
          else { modifiedCaseIds.add(item.targetId); }
        } else if (item.targetType === 'UNIT_TEST') {
          affectedUnitTestIds.add(item.targetId);
          if (isCreate) { addedUnitTestIds.add(item.targetId); modifiedUnitTestIds.delete(item.targetId); }
          else if (isRemove) { deletedUnitTestIds.add(item.targetId); modifiedUnitTestIds.delete(item.targetId); }
          else { modifiedUnitTestIds.add(item.targetId); }
        }
      }
    }
  }

  // Danh sách các method đã bị xóa (để hiển thị trực quan phần ĐÃ XÓA)
  const deletedMethods = useMemo(() => {
    const list: Array<{
      methodKey: string;
      className: string;
      qualifiedClassName: string;
      methodName: string;
      signature: string;
      reason?: string | null;
      beforeSource?: string | null;
    }> = [];

    if (impact?.changedMethods) {
      for (const m of impact.changedMethods) {
        if (m.diffType === 'DELETED') {
          list.push({
            methodKey: m.methodKey ?? `${m.qualifiedClassName}#${m.methodName}`,
            className: m.className ?? (m.qualifiedClassName ? m.qualifiedClassName.split('.').pop()! : ''),
            qualifiedClassName: m.qualifiedClassName ?? '',
            methodName: m.methodName ?? '',
            signature: m.signature ?? `${m.methodName}()`,
            reason: m.reason,
            beforeSource: m.beforeSource,
          });
        }
      }
    }

    if (activeUpdate?.items) {
      for (const item of activeUpdate.items) {
        if (item.targetType === 'METHOD' && item.action === 'REMOVE' && item.targetKey) {
          if (!list.some((existing) => existing.methodKey === item.targetKey)) {
            const hashIdx = item.targetKey.indexOf('#');
            const qualifiedClassName = hashIdx >= 0 ? item.targetKey.slice(0, hashIdx) : '';
            const sig = hashIdx >= 0 ? item.targetKey.slice(hashIdx + 1) : item.targetKey;
            const openParen = sig.indexOf('(');
            const methodName = openParen >= 0 ? sig.slice(0, openParen) : sig;
            list.push({
              methodKey: item.targetKey,
              className: qualifiedClassName.split('.').pop() || '',
              qualifiedClassName,
              methodName,
              signature: sig,
              reason: item.reason,
              beforeSource: item.beforeData,
            });
          }
        }
      }
    }

    return list;
  }, [impact, activeUpdate]);

  return {
    ...query,
    activeUpdate,
    impact,
    methodDiffMap,
    getMethodDiff,
    deletedMethods,
    affectedRuleIds,
    affectedPlanIds,
    affectedCaseIds,
    affectedUnitTestIds,
    addedRuleIds,
    modifiedRuleIds,
    deletedRuleIds,
    addedPlanIds,
    modifiedPlanIds,
    deletedPlanIds,
    addedCaseIds,
    modifiedCaseIds,
    deletedCaseIds,
    addedUnitTestIds,
    modifiedUnitTestIds,
    deletedUnitTestIds,
  };
}

