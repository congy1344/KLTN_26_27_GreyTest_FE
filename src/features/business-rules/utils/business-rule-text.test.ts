import { describe, expect, it } from 'vitest';
import { splitBusinessRuleText } from './business-rule-text';

describe('splitBusinessRuleText', () => {
  it('returns one rule per non-empty line', () => {
    expect(splitBusinessRuleText(' BR 1 \n\nBR 2\r\n  BR 3  ')).toEqual(['BR 1', 'BR 2', 'BR 3']);
  });
});
