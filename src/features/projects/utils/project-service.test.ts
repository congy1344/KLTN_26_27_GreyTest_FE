import { describe, expect, it } from 'vitest';
import {
  belongsToService,
  modulePathFromFile,
  projectWorkflowPath,
} from './project-service';

describe('project service scope', () => {
  it('extracts root and nested Maven module paths on both path separators', () => {
    expect(modulePathFromFile('src/main/java/com/example/App.java')).toBe('.');
    expect(modulePathFromFile('account-service/src/main/java/com/example/AccountService.java')).toBe('account-service');
    expect(modulePathFromFile('apps\\auth-service\\src\\main\\java\\com\\example\\AuthService.java'))
      .toBe('apps/auth-service');
  });

  it('matches classes only inside the selected service', () => {
    const filePath = 'statistics-service/src/main/java/com/example/StatisticsService.java';
    expect(belongsToService(filePath, 'statistics-service')).toBe(true);
    expect(belongsToService(filePath, 'account-service')).toBe(false);
  });

  it('keeps the selected service while navigating between workflow steps', () => {
    expect(projectWorkflowPath(7, 'unit-tests', 'apps/account service'))
      .toBe('/projects/7/unit-tests?servicePath=apps%2Faccount+service');
  });
});
