import { useSearchParams } from 'react-router-dom';
import { useProjectServices } from './useProjects';

export function useProjectServiceScope(projectId: number, enabled = true) {
  const query = useProjectServices(projectId, enabled);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPath = searchParams.get('servicePath');
  const services = query.data ?? [];
  const selected = services.find((service) => service.servicePath === requestedPath)
    ?? (services.length === 1 ? services[0] : undefined);

  const select = (servicePath: string) => {
    const next = new URLSearchParams(searchParams);
    if (servicePath) next.set('servicePath', servicePath);
    else next.delete('servicePath');
    setSearchParams(next);
  };

  return {
    ...query,
    services,
    selected,
    servicePath: selected?.servicePath,
    requiresSelection: services.length > 1 && !selected,
    select,
  };
}
