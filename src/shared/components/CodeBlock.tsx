import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { useLanguage } from '../i18n/language';

const JAVA_KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'if', 'implements', 'import', 'instanceof',
  'int', 'interface', 'long', 'new', 'package', 'private', 'protected', 'public', 'record', 'return', 'short', 'static',
  'super', 'switch', 'this', 'throw', 'throws', 'try', 'var', 'void', 'volatile', 'while', 'null', 'true', 'false',
]);

// Thứ tự nhóm quyết định ưu tiên: chú thích và chuỗi phải bắt trước từ khoá.
const TOKEN = /(\/\/.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])')|(@[A-Za-z_]\w*)|(\b\d[\d_]*(?:\.\d+)?[lLfFdD]?\b)|(\b[A-Za-z_]\w*\b)/g;

type Kind = 'com' | 'str' | 'ann' | 'num' | 'kw' | 'type';

/**
 * Tô màu Java theo từng dòng, đủ để đọc nhanh; không phải trình phân tích cú pháp đầy đủ.
 * Chú thích nhiều dòng được theo dõi qua biến trạng thái giữa các dòng.
 */
function highlightJava(lines: string[]): ReactNode[][] {
  let inBlockComment = false;
  return lines.map((line) => {
    const parts: ReactNode[] = [];
    let rest = line;
    let key = 0;
    const push = (text: string, kind?: Kind) => {
      if (!text) return;
      parts.push(kind ? <span key={key++} className={`code-${kind}`}>{text}</span> : text);
    };
    while (rest) {
      if (inBlockComment) {
        const end = rest.indexOf('*/');
        if (end < 0) { push(rest, 'com'); rest = ''; break; }
        push(rest.slice(0, end + 2), 'com');
        rest = rest.slice(end + 2);
        inBlockComment = false;
        continue;
      }
      const start = rest.indexOf('/*');
      const segment = start < 0 ? rest : rest.slice(0, start);
      let last = 0;
      for (const match of segment.matchAll(TOKEN)) {
        push(segment.slice(last, match.index));
        const [text, comment, string, annotation, number, word] = match;
        if (comment) push(text, 'com');
        else if (string) push(text, 'str');
        else if (annotation) push(text, 'ann');
        else if (number) push(text, 'num');
        else if (word && JAVA_KEYWORDS.has(word)) push(text, 'kw');
        else if (word && /^[A-Z]/.test(word)) push(text, 'type');
        else push(text);
        last = (match.index ?? 0) + text.length;
      }
      push(segment.slice(last));
      if (start < 0) break;
      rest = rest.slice(start);
      inBlockComment = true;
    }
    return parts;
  });
}

interface CodeBlockProps {
  code: string;
  /** Số dòng của dòng đầu tiên (ví dụ lineStart của method). */
  startLine?: number;
  /** Các số dòng được tô nổi (theo đánh số hiển thị). */
  highlight?: (lineNumber: number) => boolean;
  /** Tiêu đề trên thanh đầu khối, thường là đường dẫn file hoặc tên method. */
  title?: ReactNode;
  /** Ghi chú nhỏ bên phải tiêu đề, ví dụ "L11-22". */
  meta?: ReactNode;
  /** Cuộn tới dòng tô nổi đầu tiên khi hiện. */
  scrollToHighlight?: boolean;
  className?: string;
  /** Lớp chiều cao cho vùng code, mặc định tối đa 480px rồi cuộn. */
  bodyClassName?: string;
  ariaLabel?: string;
}

/** Khung hiển thị mã nguồn dùng chung: thanh tiêu đề, số dòng, tô màu Java, dòng nổi bật và nút sao chép. */
export function CodeBlock({ code, startLine = 1, highlight, title, meta, scrollToHighlight = false, className = '', bodyClassName = 'max-h-[480px]', ariaLabel }: CodeBlockProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const firstHighlight = useRef<HTMLLIElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const lines = code.replace(/\r\n/g, '\n').split('\n');
  const tokens = highlightJava(lines);
  const firstHighlightIndex = highlight ? lines.findIndex((_, index) => highlight(startLine + index)) : -1;

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  // Chỉ cuộn trong khung code, không kéo cả trang theo.
  useEffect(() => {
    const line = firstHighlight.current;
    const body = bodyRef.current;
    if (!scrollToHighlight || !line || !body) return;
    body.scrollTop += line.getBoundingClientRect().top - body.getBoundingClientRect().top - body.clientHeight / 2;
  }, [scrollToHighlight, firstHighlightIndex, code]);

  const copy = async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
  };

  return (
    <figure className={`code-block ${className}`}>
      <figcaption className="code-block-bar">
        <span className="min-w-0 truncate">{title}</span>
        {meta && <span className="shrink-0 font-mono text-xs code-dim">{meta}</span>}
        <button type="button" onClick={copy} className="code-block-copy" aria-label={copied ? t('Đã sao chép mã', 'Code copied') : t('Sao chép mã', 'Copy code')}>
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          <span>{copied ? t('Đã chép', 'Copied') : t('Chép', 'Copy')}</span>
        </button>
      </figcaption>
      <div ref={bodyRef} role="region" tabIndex={0} aria-label={ariaLabel ?? t('Mã nguồn', 'Source code')} className={`code-block-body ${bodyClassName}`}>
        <ol className="min-w-max py-3">
          {tokens.map((parts, index) => {
            const lineNumber = startLine + index;
            const on = highlight?.(lineNumber) ?? false;
            return (
              <li key={index} ref={index === firstHighlightIndex ? firstHighlight : undefined} aria-current={on ? 'true' : undefined}
                className={`code-line ${on ? 'code-line-on' : ''}`}>
                <span aria-hidden="true" className="code-ln">{lineNumber}</span>
                <code className="whitespace-pre">{parts.length ? parts : ' '}</code>
              </li>
            );
          })}
        </ol>
      </div>
    </figure>
  );
}
