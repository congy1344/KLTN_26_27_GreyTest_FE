import { apiClient } from '../../../shared/api/api-client';
import type { ReportFormat } from '../types';

/** Lấy nội dung report thô từ backend (dùng chung cho preview và download). */
export async function fetchReportExport(projectId: number, format: ReportFormat): Promise<string> {
  const { data } = await apiClient.get<string>(`/projects/${projectId}/export`, {
    params: { format },
    responseType: 'text',
    // Giữ raw string, không để axios tự parse JSON
    transformResponse: [(raw) => raw],
  });
  return data;
}
