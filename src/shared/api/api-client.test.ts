// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './api-client';

describe('getErrorMessage', () => {
  it('keeps the generic message for an internal Error by default', () => {
    expect(getErrorMessage(new Error('Unit Test khong hop le'))).toBe('Có lỗi xảy ra');
  });

  it('can expose a validated backend message when the caller opts in', () => {
    expect(getErrorMessage(new Error('Unit Test khong hop le'), true)).toBe('Unit Test khong hop le');
  });
});
