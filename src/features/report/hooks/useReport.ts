import { useQuery } from '@tanstack/react-query';
import { fetchReportExport } from '../api/report-api';
import type { ReportFormat, ReportSummary } from '../types';

export function useReportExport(projectId: number, format: ReportFormat) {
  return useQuery({
    queryKey: ['report', projectId, format],
    queryFn: () => fetchReportExport(projectId, format),
    enabled: projectId > 0,
  });
}

export function parseReportSummary(json: string | undefined): ReportSummary | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ReportSummary;
  } catch {
    return null;
  }
}
