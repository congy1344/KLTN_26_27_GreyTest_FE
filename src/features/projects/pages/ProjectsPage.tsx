import { ProjectList } from '../components/ProjectList';
import { ProjectUploadForm } from '../components/ProjectUploadForm';

export function ProjectsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-bold">GreyTest</h1>
        <p className="text-sm text-gray-500">Nhập source code Java Spring Boot để bắt đầu</p>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Thêm project</h2>
        <ProjectUploadForm />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Danh sách project</h2>
        <ProjectList />
      </section>
    </div>
  );
}
