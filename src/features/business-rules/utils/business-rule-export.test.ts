// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisResult } from '../../projects/types';
import type { BusinessRule } from '../types';
import { buildBusinessRuleExport, downloadBusinessRules } from './business-rule-export';

const rule: BusinessRule = {
  id: 1, projectId: 7, methodId: 12, ruleCode: 'BR-001', description: 'Giữ nguyên yêu cầu đã duyệt.',
  reviewNote: null, suggestedDescription: null, source: 'USER_MODIFIED', status: 'APPROVED',
  isModified: false, createdAt: '', updatedAt: '', sourceBranchId: 'IF-1',
};
const analysis: AnalysisResult = {
  projectId: 7, projectName: 'Sample', status: 'ANALYZED', totalClasses: 1, totalMethods: 2,
  totalEndpoints: 0, totalRelations: 0, existingTestFiles: 0,
  classes: [{ id: 2, packageName: 'sample', className: 'Service', qualifiedName: 'sample.Service',
    classType: 'SERVICE', filePath: 'src/main/java/sample/Service.java',
    methods: ['Long', 'String'].map((type, index) => ({ id: 11 + index, methodName: 'find',
      parameters: [{ name: 'value', type }], returnType: 'String', throwsList: [], visibility: 'PUBLIC',
      sourceCode: '', lineStart: 1, lineEnd: 2, endpoints: [] })) }], relations: [],
};

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Business Rule export', () => {
  it('preserves reviewed content, scope and the exact overloaded method, and marks missing methods', () => {
    const exported = buildBusinessRuleExport(7, 'service-a', [rule, { ...rule, id: 2, methodId: 999 }], analysis);
    expect(exported.servicePath).toBe('service-a');
    expect(exported.rules[0]).toMatchObject({ ...rule, method: {
      qualifiedClassName: 'sample.Service', methodName: 'find', parameters: [{ name: 'value', type: 'String' }],
    } });
    expect(exported.rules[1].method).toBeNull();
    expect(JSON.parse(JSON.stringify(exported)).rules[0].description).toBe(rule.description);
  });

  it('downloads a JSON file with a project-specific filename', async () => {
    const createObjectURL = vi.fn(() => 'blob:rules');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    let filename = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { filename = this.download; });
    downloadBusinessRules(7, undefined, [rule], analysis);
    expect(filename).toBe('greytest-project-7-business-rules.json');
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(document.querySelector('a')).toBeNull();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:rules');
  });
});
