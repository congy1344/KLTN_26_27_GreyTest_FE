import { apiClient } from '../../../shared/api/api-client';
import type { Project } from '../types';

export async function fetchProjects(): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>('/projects');
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
