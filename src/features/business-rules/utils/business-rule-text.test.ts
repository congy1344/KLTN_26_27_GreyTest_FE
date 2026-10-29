import { describe, expect, it } from 'vitest';
import { formatBusinessRuleReviewNote, splitBusinessRuleText } from './business-rule-text';

describe('splitBusinessRuleText', () => {
  it('returns one rule per non-empty line', () => {
    expect(splitBusinessRuleText(' BR 1 \n\nBR 2\r\n  BR 3  ')).toEqual(['BR 1', 'BR 2', 'BR 3']);
  });
});

describe('formatBusinessRuleReviewNote', () => {
  it('localizes verdicts while preserving the review explanation', () => {
    expect(formatBusinessRuleReviewNote('TOO_VAGUE: Thiếu điều kiện đầu vào.', 'vi'))
      .toBe('Mô tả chưa rõ: Thiếu điều kiện đầu vào.');
    expect(formatBusinessRuleReviewNote('TOO_VAGUE: Missing inputs.', 'en'))
      .toBe('Description is too vague: Missing inputs.');
    expect(formatBusinessRuleReviewNote('Nhận xét riêng: giữ nguyên.', 'vi'))
      .toBe('Nhận xét riêng: giữ nguyên.');
  });

  it('hides legacy informational notes without hiding actual AI feedback', () => {
    expect(formatBusinessRuleReviewNote('AI category: BUSINESS_LOGIC. User review/chinh sua truoc khi approve.', 'vi')).toBe('');
    expect(formatBusinessRuleReviewNote('Da sua thu cong. AI review lai la tuy chon.', 'vi')).toBe('');
    expect(formatBusinessRuleReviewNote(null, 'vi')).toBe('');
    expect(formatBusinessRuleReviewNote('Cần xác nhận yêu cầu.', 'vi')).toBe('Cần xác nhận yêu cầu.');
  });
});
