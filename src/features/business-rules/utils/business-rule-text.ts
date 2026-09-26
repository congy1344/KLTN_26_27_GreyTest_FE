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
