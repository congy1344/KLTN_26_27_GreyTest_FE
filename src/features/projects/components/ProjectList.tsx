import { getErrorMessage } from '../../../shared/api/api-client';
import { useDeleteProject, useProjects } from '../hooks/useProjects';

export function ProjectList() {
  const { data: projects, isLoading, error } = useProjects();
  const remove = useDeleteProject();

  if (isLoading) return <p className="text-sm text-gray-500">Đang tải...</p>;
  if (error) return <p className="text-sm text-red-600">{getErrorMessage(error)}</p>;
  if (!projects?.length) return <p className="text-sm text-gray-500">Chưa có project nào.</p>;

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="py-2">ID</th>
          <th className="py-2">Tên</th>
          <th className="py-2">Nguồn</th>
          <th className="py-2">Trạng thái</th>
          <th className="py-2"></th>
        </tr>
      </thead>
      <tbody>
        {projects.map((p) => (
          <tr key={p.id} className="border-b">
            <td className="py-2">{p.id}</td>
            <td className="py-2">{p.name}</td>
            <td className="py-2">{p.sourceType}</td>
            <td className="py-2">{p.status}</td>
            <td className="py-2 text-right">
              <button
                onClick={() => remove.mutate(p.id)}
                disabled={remove.isPending}
                className="text-red-600 hover:underline disabled:opacity-50"
              >
                Xóa
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
