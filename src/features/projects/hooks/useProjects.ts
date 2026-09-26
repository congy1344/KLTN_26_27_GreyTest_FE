import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  analyzeProject,
  cloneGithub,
  completeProject,
  deleteProject,
  fetchAnalysis,
  fetchExistingTests,
  fetchProject,
  fetchProjectServices,
  fetchProjects,
  uploadZip,
} from '../api/project-api';

const PROJECTS_KEY = ['projects'];

export function useProjects() {
  return useQuery({ queryKey: PROJECTS_KEY, queryFn: fetchProjects });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id),
    enabled: id > 0,
  });
}

export function useProjectServices(id: number, enabled = true) {
  return useQuery({
    queryKey: ['project-services', id],
    queryFn: () => fetchProjectServices(id),
    enabled: id > 0 && enabled,
  });
}

export function useUploadProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadZip,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}

export function useCloneGithub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cloneGithub,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}

export function useAnalysis(projectId: number, enabled = true) {
  return useQuery({
    queryKey: ['analysis', projectId],
    queryFn: () => fetchAnalysis(projectId),
    enabled: projectId > 0 && enabled,
  });
}

export function useExistingTests(projectId: number, enabled = true) {
  return useQuery({
    queryKey: ['existing-tests', projectId],
    queryFn: () => fetchExistingTests(projectId),
    enabled: projectId > 0 && enabled,
  });
}

export function useAnalyzeProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: analyzeProject,
    // Re-analyze xóa toàn bộ BR/Plan/Case/Unit Test/coverage → làm mới mọi cache
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useCompleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: number) => completeProject(projectId),
    onSuccess: (project) => {
      queryClient.setQueryData(['project', project.id], project);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-services', project.id] });
    },
  });
}
