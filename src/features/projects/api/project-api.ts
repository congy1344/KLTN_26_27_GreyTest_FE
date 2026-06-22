import { apiClient } from '../../../shared/api/api-client';
import type { AnalysisResult, Project } from '../types';

export async function fetchProjects(): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>('/projects');
  return data;
}

export async function fetchProject(id: number): Promise<Project> {
  const { data } = await apiClient.get<Project>(`/projects/${id}`);
  return data;
}

export async function uploadZip(file: File): Promise<Project> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<Project>('/projects/upload', formData);
  return data;
}

export async function cloneGithub(url: string): Promise<Project> {
  const { data } = await apiClient.post<Project>('/projects/github', { url });
  return data;
}

export async function deleteProject(id: number): Promise<void> {
  await apiClient.delete(`/projects/${id}`);
}

export async function analyzeProject(id: number): Promise<AnalysisResult> {
  const { data } = await apiClient.post<AnalysisResult>(`/projects/${id}/analyze`);
  return data;
}

export async function fetchAnalysis(id: number): Promise<AnalysisResult> {
  const { data } = await apiClient.get<AnalysisResult>(`/projects/${id}/analysis`);
  return data;
}
