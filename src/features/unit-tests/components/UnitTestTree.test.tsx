// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { UnitTestTree } from './UnitTestTree';
import type { UnitTest } from '../types';

afterEach(cleanup);

// Selector zebra trong index.css phải khớp đúng cấu trúc DOM của MUI TreeView
it('alternates method rows matched by the zebra-tree CSS selector', () => {
  const tests = [1, 2, 3].map((id) => ({ id, testCaseId: id, testMethodName: `m${id}` }) as UnitTest);
  const { container } = render(<UnitTestTree tests={tests} filtering scrollToActive={false} filePathOf={() => 'src/test/java/demo/UserServiceTest.java'}
    labelOf={(t) => t.testMethodName} renderMethod={(t) => t.testMethodName} onSelect={() => {}} />);
  const zebra = container.querySelectorAll('.zebra-tree .MuiCollapse-wrapperInner > li:nth-child(even) > .MuiTreeItem-content');
  expect([...zebra].map((row) => row.textContent)).toContain('m2');
});
