import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { Box, Boxes, ClipboardCheck, Code2, Database, FileCode2, Folder, Globe, ListTree, Table2, TestTube2 } from 'lucide-react';
import type { ExistingTestInfo, JavaClassInfo, JavaMethodInfo } from '../types';
import { useLanguage } from '../../../shared/i18n/language';
import { displaySourcePath } from '../../../shared/utils/source-path';

interface ClassTreeProps {
  classes: JavaClassInfo[];
  existingTests?: ExistingTestInfo[];
}

interface TreeEntry {
  id: string;
  label: string;
  kind: TreeEntryKind;
  children: TreeEntry[];
}

type TreeEntryKind = 'folder' | 'java-file' | 'test-file' | 'controller' | 'service'
  | 'repository' | 'entity' | 'record' | 'enum' | 'class' | 'method' | 'test-method';

const EMPTY_TESTS: ExistingTestInfo[] = [];
const CODE_BLOCK_CLASS = 'max-h-[calc(100vh-220px)] overflow-auto rounded-default border border-border-default bg-neutral-primary-medium p-3 font-mono text-xs leading-relaxed text-heading';

function pathParts(path: string) {
  return path.replace(/\\/g, '/').split('/').filter(Boolean);
}

function addPath(root: TreeEntry[], parts: string[], leaf: TreeEntry, fileKind: 'java-file' | 'test-file') {
  let current = root;
  let prefix = '';
  parts.forEach((part, index) => {
    prefix = prefix ? `${prefix}/${part}` : part;
    let entry = current.find((item) => item.id === `path:${prefix}`);
    if (!entry) {
      entry = {
        id: `path:${prefix}`,
        label: part,
        kind: index === parts.length - 1 ? fileKind : 'folder',
        children: [],
      };
      current.push(entry);
    }
    if (index === parts.length - 1) {
      entry.children.push(leaf);
    }
    current = entry.children;
  });
}

function classKind(classType: string): TreeEntryKind {
  switch (classType.toUpperCase()) {
    case 'CONTROLLER': return 'controller';
    case 'SERVICE': return 'service';
    case 'REPOSITORY': return 'repository';
    case 'ENTITY': return 'entity';
    case 'RECORD': return 'record';
    case 'ENUM': return 'enum';
    default: return 'class';
  }
}

function entryIcon(kind: TreeEntryKind) {
  const props = { size: 14, strokeWidth: 1.8, 'aria-hidden': true } as const;
  switch (kind) {
    case 'folder': return <Folder {...props} className="text-body-subtle" />;
    case 'java-file': return <FileCode2 {...props} className="text-fg-brand-strong" />;
    case 'test-file': return <TestTube2 {...props} className="text-fg-success-strong" />;
    case 'controller': return <Globe {...props} className="text-fg-warning" />;
    case 'service': return <Boxes {...props} className="text-fg-success-strong" />;
    case 'repository': return <Database {...props} className="text-fg-purple" />;
    case 'entity': return <Table2 {...props} className="text-fg-purple" />;
    case 'record': return <Box {...props} className="text-fg-brand" />;
    case 'enum': return <ListTree {...props} className="text-fg-warning" />;
    case 'method': return <Code2 {...props} className="text-fg-brand" />;
    case 'test-method': return <ClipboardCheck {...props} className="text-fg-success-strong" />;
    default: return <Box {...props} className="text-body" />;
  }
}

function methodDetail(method: JavaMethodInfo) {
  return (
    <div className="space-y-3">
      <div className="font-mono text-xs text-body-subtle">
        {method.visibility.toLowerCase()} {method.returnType} {method.methodName}({method.parameters.map((p) => p.type).join(', ')})
      </div>
      {method.endpoints.length > 0 && (
        <div className="space-y-1 text-xs text-body">
          {method.endpoints.map((endpoint) => <div key={endpoint.id}>{endpoint.httpMethod} {endpoint.path}</div>)}
        </div>
      )}
      <pre className={CODE_BLOCK_CLASS}>
        <code>{method.sourceCode}</code>
      </pre>
    </div>
  );
}

function classDetail(javaClass: JavaClassInfo, emptyMessage: string) {
  const sourceCode = javaClass.sourceCode?.trim();
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="font-mono text-xs text-body-subtle">{javaClass.qualifiedName}</div>
        <div className="font-mono text-[11px] text-body-subtle" title={javaClass.filePath}>
          {displaySourcePath(javaClass.filePath)}
        </div>
      </div>
      {sourceCode ? (
        <pre className={CODE_BLOCK_CLASS}>
          <code>{sourceCode}</code>
        </pre>
      ) : (
        <div className="rounded-default border border-border-warning-subtle bg-warning-soft p-3 text-xs text-body">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

function renderEntries(entries: TreeEntry[], expandedIds: Set<string>): ReactNode {
  return entries.map((entry) => (
    <TreeItem
      key={entry.id}
      itemId={entry.id}
      label={(
        <span className="flex items-center gap-2 text-sm" data-node-kind={entry.kind}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-neutral-secondary-soft">
            {entryIcon(entry.kind)}
          </span>
          <span className="truncate">{entry.label}</span>
        </span>
      )}
      slotProps={{ groupTransition: { unmountOnExit: true } }}
    >
      {entry.children.length > 0 && (expandedIds.has(entry.id)
        ? renderEntries(entry.children, expandedIds)
        : <TreeItem itemId={`${entry.id}:collapsed`} label="" disabled />)}
    </TreeItem>
  ));
}

export function ClassTree({ classes, existingTests = EMPTY_TESTS }: ClassTreeProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const { t } = useLanguage();
  const entries = useMemo(() => {
    const root: TreeEntry[] = [];
    classes.forEach((javaClass) => {
      const classEntry: TreeEntry = {
        id: `class:${javaClass.id}`,
        label: javaClass.className,
        kind: classKind(javaClass.classType),
        children: javaClass.methods.map((method) => ({
          id: `method:${method.id}`,
          label: method.methodName,
          kind: 'method',
          children: [],
        })),
      };
      addPath(root, pathParts(javaClass.filePath), classEntry, 'java-file');
    });
    existingTests.forEach((test) => addPath(root, pathParts(test.filePath), {
      id: `test:${test.id}`,
      label: test.testClassName,
      kind: 'test-file',
      children: test.testMethods.map((method) => ({
        id: `test-method:${test.id}:${method.name}`,
        label: method.name,
        kind: 'test-method',
        children: [],
      })),
    }, 'test-file'));
    return root;
  }, [classes, existingTests]);
  const rootExpandedItems = useMemo(() => entries.map((entry) => entry.id), [entries]);
  const [expandedItems, setExpandedItems] = useState<string[]>(rootExpandedItems);
  const expandedIds = useMemo(() => new Set(expandedItems), [expandedItems]);

  useEffect(() => {
    setExpandedItems(rootExpandedItems);
  }, [rootExpandedItems]);

  const selectedId = selectedItem;
  const selectedDetail = useMemo(() => {
    for (const javaClass of classes) {
      if (`class:${javaClass.id}` === selectedId) {
        return classDetail(javaClass, t('Class source chưa có trong analysis cũ. Bấm Phân tích lại để cập nhật.', 'Class source is missing from the old analysis. Analyze again to update it.'));
      }
      for (const method of javaClass.methods) if (`method:${method.id}` === selectedId) return methodDetail(method);
    }
    const test = existingTests.find((item) => `test:${item.id}` === selectedId);
    return test ? <pre className={CODE_BLOCK_CLASS}><code>{test.sourceCode}</code></pre> : null;
  }, [classes, existingTests, selectedId, t]);

  if (!classes.length && !existingTests.length) {
    return <div className="rounded-base border border-border-default bg-neutral-primary-soft p-8 text-center shadow-sm"><p className="text-sm font-semibold text-heading">{t('Chưa có source được trích xuất', 'No source has been extracted')}</p></div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div className="rounded-base border border-border-default bg-neutral-primary-soft p-3 shadow-sm">
        <SimpleTreeView
          selectedItems={selectedItem}
          onSelectedItemsChange={(_event, item) => setSelectedItem(item)}
          expandedItems={expandedItems}
          onExpandedItemsChange={(_event, items) => setExpandedItems(items)}
        >
          {renderEntries(entries, expandedIds)}
        </SimpleTreeView>
      </div>
      <div className="min-h-[220px] rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
        {selectedDetail ? <>{selectedDetail}</> : <div className="flex h-full items-center justify-center text-sm text-body-subtle"><FileCode2 size={16} className="mr-2" />{t('Chọn class, method hoặc test để xem chi tiết.', 'Select a class, method, or test to view details.')}</div>}
      </div>
    </div>
  );
}
