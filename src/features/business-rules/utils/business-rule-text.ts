const reviewLabels: Record<string, { vi: string; en: string }> = {
  OK: { vi: 'Nội dung rõ ràng', en: 'Clear wording' },
  NEEDS_REVISION: { vi: 'Cần làm rõ', en: 'Needs clarification' },
  DUPLICATE: { vi: 'Nội dung trùng lặp', en: 'Duplicate rule' },
  WRONG_METHOD: { vi: 'Liên kết sai phương thức', en: 'Wrong method' },
  TOO_VAGUE: { vi: 'Mô tả chưa rõ', en: 'Description is too vague' },
  SOURCE_MISMATCH: { vi: 'BR không khớp với code', en: 'BR differs from code' },
};

export function formatBusinessRuleReviewNote(note: string | null | undefined, language: 'vi' | 'en'): string {
  const text = note?.trim();
  if (!text || text.startsWith('AI category:')
    || text === 'Da sua thu cong. AI review lai la tuy chon.') return '';
  const separator = text.indexOf(':');
  const label = reviewLabels[text.slice(0, separator)];
  return label ? `${label[language]}: ${text.slice(separator + 1).trim()}` : text;
}

export function splitBusinessRuleText(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function cleanAiText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/抛出异常/g, ' ném ra ngoại lệ ')
    .replace(/抛出/g, ' ném ra ')
    .replace(/扔出异常/g, ' ném ra ngoại lệ ')
    .replace(/扔异常/g, ' ném ngoại lệ ')
    .replace(/大于/g, ' lớn hơn ')
    .replace(/小于/g, ' nhỏ hơn ')
    .replace(/等于/g, ' bằng ')
    .replace(/异常/g, ' ngoại lệ ')
    .replace(/返回/g, ' trả về ')
    .replace(/如果/g, ' nếu ')
    .replace(/为空/g, ' là null ')
    .replace(/不为空/g, ' không null ')
    .replace(/[\u4e00-\u9fa5]+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]+([.,;:?!])/g, '$1')
    .trim();
}
