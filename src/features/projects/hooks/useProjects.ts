import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cloneGithub, deleteProject, fetchProjects, uploadZip } from '../api/project-api';

const PROJECTS_KEY = ['projects'];

export function useProjects() {
  return useQuery({ queryKey: PROJECTS_KEY, queryFn: fetchProjects });
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
