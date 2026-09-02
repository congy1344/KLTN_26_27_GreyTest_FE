export function serviceParams(servicePath?: string) {
  return servicePath ? { servicePath } : undefined;
}

export function projectWorkflowPath(projectId: number, step?: string, servicePath?: string) {
  const path = step ? `/projects/${projectId}/${step}` : `/projects/${projectId}`;
  if (!servicePath) return path;
  return `${path}?${new URLSearchParams({ servicePath }).toString()}`;
}

export function modulePathFromFile(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  const marker = '/src/main/java/';
  if (normalized.startsWith('src/main/java/')) return '.';
  const index = normalized.indexOf(marker);
  return index < 0 ? '.' : normalized.slice(0, index) || '.';
}

export function belongsToService(filePath: string, servicePath?: string) {
  return !servicePath || modulePathFromFile(filePath) === servicePath;
}
