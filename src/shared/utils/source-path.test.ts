import { describe, expect, it } from 'vitest';
import { displaySourcePath } from './source-path';

describe('displaySourcePath', () => {
  it('shows source paths from src', () => {
    expect(displaySourcePath('springboots4test1/src/main/java/demo/UserService.java'))
      .toBe('src/main/java/demo/UserService.java');
    expect(displaySourcePath('piggymetrics\\account-service\\src\\main\\java\\demo\\UserService.java'))
      .toBe('src/main/java/demo/UserService.java');
    expect(displaySourcePath('module/src/main/java/com/example/src/UserService.java'))
      .toBe('src/main/java/com/example/src/UserService.java');
  });

  it('keeps paths without a src segment', () => {
    expect(displaySourcePath('UserServiceTest.java')).toBe('UserServiceTest.java');
  });
});
