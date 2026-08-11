export function displaySourcePath(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const sourceIndex = normalized.indexOf('/src/');
  return sourceIndex >= 0 ? normalized.slice(sourceIndex + 1) : normalized;
}
