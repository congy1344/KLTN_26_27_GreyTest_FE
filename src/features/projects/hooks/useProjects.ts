import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  analyzeProject,
  cloneGithub,
  deleteProject,
  fetchAnalysis,
  fetchProject,
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

export function useAnalyzeProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: analyzeProject,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['analysis', data.projectId] });
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}
