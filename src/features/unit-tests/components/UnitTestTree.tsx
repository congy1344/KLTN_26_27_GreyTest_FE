import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { addPath, entryIcon, pathParts, type TreeEntry } from '../../projects/components/ClassTree';
import type { UnitTest } from '../types';

interface UnitTestTreeProps {
  tests: UnitTest[];
  activeId?: number;
  /** Đang lọc thì mở mọi file để không giấu kết quả tìm được. */
  filtering: boolean;
  /** Người dùng vừa chọn method thì cuộn tới dòng đó; lúc mới mở trang không kéo trang đi. */
  scrollToActive: boolean;
  filePathOf: (test: UnitTest) => string;
  labelOf: (test: UnitTest) => string;
  renderMethod: (test: UnitTest) => ReactNode;
  onSelect: (testId: number) => void;
}

const TEST_ID_PREFIX = 'test:';

/** Gộp chuỗi thư mục chỉ có một nhánh để method không bị đẩy lệch sang phải trong khung hẹp. */
function compactFolders(entries: TreeEntry[]): TreeEntry[] {
  return entries.map((entry) => {
    let current = entry;
    let label = entry.label;
    while (current.kind === 'folder' && current.children.length === 1 && current.children[0].kind === 'folder') {
      current = current.children[0];
      label = `${label}/${current.label}`;
    }
    return { ...current, label, children: compactFolders(current.children) };
  });
}

function entriesOfKind(entries: TreeEntry[], kind: TreeEntry['kind']): TreeEntry[] {
  return entries.flatMap((entry) => [
    ...(entry.kind === kind ? [entry] : []),
    ...entriesOfKind(entry.children, kind),
  ]);
}

/**
 * Hiển thị Unit Test theo thư mục và file test, cùng cách trình bày với cây source ở bước Analysis.
 */
export function UnitTestTree({ tests, activeId, filtering, scrollToActive, filePathOf, labelOf, renderMethod, onSelect }: UnitTestTreeProps) {
  const testById = useMemo(() => new Map(tests.map((test) => [`${TEST_ID_PREFIX}${test.id}`, test])), [tests]);
  const entries = useMemo(() => {
    const root: TreeEntry[] = [];
    tests.forEach((test) => addPath(root, pathParts(filePathOf(test)), {
      id: `${TEST_ID_PREFIX}${test.id}`,
      label: test.testMethodName,
      kind: 'test-method',
      children: [],
    }, 'test-file'));
    return compactFolders(root);
  }, [tests, filePathOf]);

  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  // Mặc định chỉ mở file đang xem; các file khác thu gọn để thấy cấu trúc project.
  const activeItem = `${TEST_ID_PREFIX}${activeId}`;
  const files = entriesOfKind(entries, 'test-file');
  const shownFiles = filtering ? files : files.filter((file) => file.children.some((child) => child.id === activeItem));
  const wantedItems = [...entriesOfKind(entries, 'folder'), ...shownFiles].map((entry) => entry.id).join('\n');
  useEffect(() => {
    setExpandedItems((current) => [...new Set([...current, ...wantedItems.split('\n').filter(Boolean)])]);
  }, [wantedItems, activeItem]);

  const treeRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (!scrollToActive) return;
    treeRef.current?.querySelector('[role="treeitem"][aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' });
    // Không theo expandedItems: mở file khác không được kéo khung về dòng đang chọn.
  }, [scrollToActive, activeItem]);

  const renderEntries = (items: TreeEntry[]): ReactNode => items.map((entry) => {
    const test = testById.get(entry.id);
    return (
      <TreeItem
        key={entry.id}
        itemId={entry.id}
        aria-label={test ? labelOf(test) : entry.label}
        label={test ? renderMethod(test) : (
          <span className="flex items-center gap-2 text-sm" data-node-kind={entry.kind}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-neutral-secondary-soft">
              {entryIcon(entry.kind)}
            </span>
            <span className="truncate" title={entry.label}>{entry.label}</span>
            {entry.kind === 'test-file' && (
              <span className="ml-auto shrink-0 rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] font-semibold text-heading">
                {entry.children.length}
              </span>
            )}
          </span>
        )}
        slotProps={{ groupTransition: { unmountOnExit: true } }}
      >
        {entry.children.length > 0 && renderEntries(entry.children)}
      </TreeItem>
    );
  });

  return (
    <SimpleTreeView
      ref={treeRef}
      selectedItems={activeId === undefined ? null : activeItem}
      onSelectedItemsChange={(_event, item) => {
        const test = item ? testById.get(item) : undefined;
        if (test) onSelect(test.id);
      }}
      expandedItems={expandedItems}
      onExpandedItemsChange={(_event, items) => setExpandedItems(items)}
    >
      {renderEntries(entries)}
    </SimpleTreeView>
  );
}
