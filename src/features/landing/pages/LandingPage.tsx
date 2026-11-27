import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Check, FileSearch, GitBranch, ListChecks, PlayCircle, Upload } from 'lucide-react';
import { BrandMark } from '../../../shared/components/BrandMark';
import { CodeBlock } from '../../../shared/components/CodeBlock';
import { LanguageToggle } from '../../../shared/components/LanguageToggle';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';
import { useLanguage } from '../../../shared/i18n/language';

// Đoạn mã thật trong dự án mẫu course-registration, dùng để minh hoạ cách GreyTest bám theo từng nhánh.
const SAMPLE_SOURCE = `private void assertNoResourceConflict(ClassSection section) {
    List<ClassSection> others = sectionRepository
        .findBySemesterIdAndStatusNot(semesterId, SectionStatus.CANCELLED);
    for (ClassSection other : others) {
        if (!section.overlapsWith(other)) {
            continue;
        }
        if (section.getRoom().equalsIgnoreCase(other.getRoom())) {
            throw new BusinessException("Phòng " + section.getRoom() + " đã có lớp trong khung giờ này");
        }
        if (section.getLecturer().equalsIgnoreCase(other.getLecturer())) {
            throw new BusinessException("Giảng viên đã có lớp trong khung giờ này");
        }
    }
}`;

const SAMPLE_START = 136;

/** Trang giới thiệu trước khi đăng nhập: GreyTest làm gì, theo các bước nào, và vì sao gọi là grey-box. */
export function LandingPage() {
  const { t } = useLanguage();
  // Đã đăng nhập thì vào thẳng danh sách dự án; token hết hạn sẽ được AuthSessionListener đưa về /login.
  if (localStorage.getItem('greytest.token')) return <Navigate to="/projects" replace />;

  const steps = [
    { icon: Upload, title: t('Tải mã nguồn', 'Upload the source'), text: t('File ZIP, link GitHub public hoặc kho private từ tài khoản GitHub đã liên kết của một dự án Java Spring Boot.', 'A ZIP file, a public GitHub link or a private repository from your linked GitHub account, for a Java Spring Boot project.') },
    { icon: FileSearch, title: t('Rút Business Rule', 'Extract Business Rules'), text: t('AI đọc từng nhánh if, switch, vòng lặp trong service và viết thành quy tắc để bạn duyệt.', 'AI reads every if, switch and loop in each service and writes it up as a rule for you to review.') },
    { icon: ListChecks, title: t('Sinh Test Plan, Test Case, Unit Test', 'Generate plans, cases and unit tests'), text: t('Mỗi bước dựa trên bước trước đã duyệt, sinh ra test JUnit 5 và Mockito được biên dịch thử trong sandbox.', 'Each step builds on the one you approved, ending in JUnit 5 and Mockito tests that are compiled in a sandbox.') },
    { icon: PlayCircle, title: t('Chạy thật và đo coverage', 'Run them and measure coverage'), text: t('Test chạy trong sandbox Docker riêng, đo bằng JaCoCo; test lỗi biên dịch được AI tự sửa, test sai kết quả được liệt kê để bạn xem.', 'Tests run in an isolated Docker sandbox and are measured with JaCoCo; AI repairs tests that fail to compile, and tests with wrong results are listed for you to review.') },
  ];

  const trace = [
    { code: 'BR-066', text: t('Trùng giờ và trùng phòng thì báo lỗi', 'Same slot and same room is rejected') },
    { code: 'TP-062', text: t('Kế hoạch kiểm thử ngoại lệ', 'Exception test plan') },
    { code: 'TC-118', text: t('Hai lớp cùng phòng, cùng khung giờ', 'Two sections, same room, same slot') },
    { code: 'SectionServiceTest', text: t('Unit Test JUnit 5', 'JUnit 5 unit test') },
  ];

  return (
    <div className="min-h-[100dvh] bg-neutral-primary text-body">
      <header className="landing-nav">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-8">
          <Link to="/" aria-label="GreyTest" className="rounded-control"><BrandMark size={28} withWordmark /></Link>
          <nav aria-label={t('Mục trên trang', 'On this page')} className="hidden items-center gap-5 text-sm md:flex">
            <a href="#how-it-works" className="landing-link">{t('Cách hoạt động', 'How it works')}</a>
            <a href="#grey-box" className="landing-link">Grey-box</a>
            <a href="#traceability" className="landing-link">{t('Truy vết', 'Traceability')}</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Link to="/login" className="btn btn-ghost hidden sm:inline-flex">{t('Đăng nhập', 'Sign in')}</Link>
            <Link to="/register" className="btn btn-brand">{t('Dùng thử', 'Get started')}</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <svg viewBox="0 0 480 300" fill="none" aria-hidden="true" className="landing-hero-mark">
            <path d="M370 50A140 140 0 1 0 410 150H300" style={{ stroke: 'var(--band-mark)' }} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="370" cy="50" r="22" style={{ fill: 'var(--accent)' }} />
            <circle cx="130" cy="150" r="22" style={{ fill: 'var(--band-dot)' }} />
            <circle cx="300" cy="150" r="22" style={{ fill: 'var(--on-band)' }} />
          </svg>
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:pt-24">
            <div className="animate-fade-in-up">
              <h1 className="landing-title">{t('Test sinh ra từ chính mã nguồn', 'Tests that come from your own code')}</h1>
              <p className="landing-lead mt-5 max-w-xl text-lg leading-relaxed">
                {t('GreyTest đọc service Spring Boot và sinh test truy vết được tới từng nhánh code.', 'GreyTest reads your Spring Boot services and generates tests you can trace back to every branch.')}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="btn btn-brand landing-cta">
                  <Upload size={18} aria-hidden="true" />{t('Tải dự án đầu tiên', 'Upload your first project')}
                </Link>
                <Link to="/login" className="btn btn-band landing-cta">{t('Đăng nhập', 'Sign in')}</Link>
              </div>
            </div>
            <div className="animate-fade-in-up delay-2">
              <CodeBlock code={SAMPLE_SOURCE} startLine={SAMPLE_START}
                title="SectionService.assertNoResourceConflict" meta="IF-2 L143-144"
                highlight={(line) => line === 143 || line === 144} bodyClassName="max-h-[360px]"
                ariaLabel={t('Ví dụ mã nguồn service', 'Example service code')} />
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-8">
          <h2 className="landing-h2">{t('Từ mã nguồn tới test chạy thử', 'From source code to tests you can run')}</h2>
          <p className="mt-3 max-w-2xl text-base text-body">{t('Bạn duyệt ở mỗi bước, nên AI không tự ý đổi ý nghĩa nghiệp vụ của dự án.', 'You approve every step, so AI never quietly changes what your business logic means.')}</p>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step.title} className="landing-step">
                <span className="flex items-center gap-3">
                  <span className="landing-step-icon"><step.icon size={18} aria-hidden="true" /></span>
                  <span className="font-mono text-xs text-body-subtle">{String(index + 1).padStart(2, '0')}</span>
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-heading">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-body">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="grey-box" className="landing-band-soft scroll-mt-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-8 lg:grid-cols-2">
            <div>
              <h2 className="landing-h2">{t('Grey-box: nhìn vào mã, kiểm theo hành vi', 'Grey-box: read the code, test the behaviour')}</h2>
              <p className="mt-4 text-base leading-relaxed text-body">
                {t('Black-box không biết code có những nhánh nào. White-box lại lấy chính code làm đáp án, nên code sai thì test cũng sai theo. GreyTest dùng mã nguồn để tìm đủ các nhánh cần kiểm, còn kết quả đúng lấy từ Business Rule bạn đã duyệt.',
                  'Black-box testing cannot see which branches exist. White-box testing takes the code itself as the answer, so wrong code gets wrong tests. GreyTest uses the source to find every branch worth testing, and takes the expected result from the Business Rules you approved.')}
              </p>
            </div>
            <ul className="grid gap-3 self-center">
              {[
                t('Mỗi Business Rule gắn với một nhánh cụ thể và số dòng trong file.', 'Every Business Rule points at a specific branch and line range.'),
                t('Test Case giữ nguyên dữ liệu và kết quả bạn duyệt, kể cả khi code hiện tại làm khác.', 'Test Cases keep the data and results you approved, even when current code disagrees.'),
                t('Khi mã nguồn đổi, chỉ phần bị ảnh hưởng được sinh lại.', 'When the source changes, only the affected parts are regenerated.'),
              ].map((item) => (
                <li key={item} className="landing-point"><Check size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-fg-success-strong" />{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section id="traceability" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-8">
          <h2 className="landing-h2">{t('Truy vết từ quy tắc tới từng test', 'Trace every rule down to a test')}</h2>
          <p className="mt-3 max-w-2xl text-base text-body">{t('Một ví dụ thật từ dự án đăng ký học phần dùng để thử nghiệm.', 'A real example from the course registration project used in evaluation.')}</p>
          <ol className="landing-trace">
            {trace.map((item, index) => (
              <li key={item.code} className="landing-trace-item">
                <span className="font-mono text-sm font-semibold text-heading">{item.code}</span>
                <span className="text-sm text-body">{item.text}</span>
                {index < trace.length - 1 && <ArrowRight size={18} aria-hidden="true" className="landing-trace-arrow" />}
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-hero">
          <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-16 sm:px-8">
            <div>
              <h2 className="landing-h2 landing-on-band">{t('Thử với dự án Spring Boot của bạn', 'Try it on your Spring Boot project')}</h2>
              <p className="mt-2 text-base landing-on-band">{t('Đăng ký bằng email, Google hoặc GitHub. Dùng miễn phí với gói FREE, nâng cấp PLUS, PRO qua VNPay khi cần thêm lượt.', 'Sign up with email, Google or GitHub. Start free, then upgrade to PLUS or PRO via VNPay when you need more requests.')}</p>
            </div>
            <Link to="/register" className="btn btn-brand landing-cta">
              <GitBranch size={18} aria-hidden="true" />{t('Bắt đầu với ZIP hoặc GitHub', 'Start with ZIP or GitHub')}
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-body-subtle sm:px-8">
        <BrandMark size={20} withWordmark />
        <span>{t('Đồ án tốt nghiệp ngành Kỹ thuật phần mềm · Khoa Công nghệ Thông tin, Trường Đại học Công nghiệp TP. Hồ Chí Minh · Huỳnh Công Ý, Nguyễn Văn Khải Tiến', 'Software Engineering graduation project · Faculty of Information Technology, Industrial University of Ho Chi Minh City · Huynh Cong Y, Nguyen Van Khai Tien')}</span>
      </footer>
    </div>
  );
}
