export type SourceType = 'ZIP' | 'GITHUB';

export type ProjectStatus =
  | 'UPLOADED'
  | 'ANALYZED'
  | 'BR_PENDING_REVIEW'
  | 'BR_APPROVED'
  | 'PLAN_PENDING_REVIEW'
  | 'PLAN_APPROVED'
  | 'CASE_PENDING_REVIEW'
  | 'CASE_APPROVED'
  | 'TEST_GENERATED'
  | 'COVERAGE_ANALYZED'
  | 'COMPLETED'
  | 'FAILED';

export interface Project {
  id: number;
  name: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  status: ProjectStatus;
  createdAt: string;
  ownerUserId: number | null;
  sourceAvailable: boolean;
}

export interface ProjectServiceScope {
  servicePath: string;
  name: string;
  status: ProjectStatus;
}

// ─── Analysis Types ────────────────────────────────────────

export interface MethodParam {
  name: string;
  type: string;
}

export interface EndpointInfo {
  id: number;
  httpMethod: string;
  path: string;
  consumes: string | null;
  produces: string | null;
  methodName: string;
}

export interface RelevantAnnotationInfo {
  id: number;
  targetType: string;
  category: string;
  annotationName: string;
  attributes: string | null;
}

export interface SourceBranchInfo {
  branchId: string;
  kind: string;
  outcome: string;
  condition: string;
  lineStart: number;
  lineEnd: number;
}

export interface JavaMethodInfo {
  id: number;
  methodName: string;
  returnType: string;
  parameters: MethodParam[];
  throwsList: string[];
  visibility: string;
  sourceCode: string;
  lineStart: number;
  lineEnd: number;
  annotations?: RelevantAnnotationInfo[];
  endpoints: EndpointInfo[];
  branches?: SourceBranchInfo[];
}

export interface JavaClassInfo {
  id: number;
  packageName: string;
  className: string;
  qualifiedName: string;
  classType: string;
  filePath: string;
  sourceCode?: string | null;
  annotations?: RelevantAnnotationInfo[];
  methods: JavaMethodInfo[];
}

export interface ServiceRelation {
  id: number;
  serviceClassName: string;
  serviceQualifiedName: string;
  repositoryClassName: string;
  repositoryQualifiedName: string;
}

export interface ControllerServiceRelation {
  id: number;
  controllerClassName: string;
  controllerQualifiedName: string;
  controllerMethodName: string;
  serviceClassName: string;
  serviceQualifiedName: string;
  serviceMethodName: string;
  serviceFieldName: string;
  serviceFieldType: string;
}

export interface AnalysisResult {
  projectId: number;
  projectName: string;
  status: string;
  totalClasses: number;
  totalMethods: number;
  totalEndpoints: number;
  totalRelations: number;
  totalControllerServiceRelations?: number;
  existingTestFiles: number;
  totalProductionFiles?: number;
  parsedProductionFiles?: number;
  failedParseFiles?: number;
  failedParseFilePaths?: string[];
  classes: JavaClassInfo[];
  relations: ServiceRelation[];
  controllerServiceRelations?: ControllerServiceRelation[];
}

export interface ExistingTestMethodInfo {
  name: string;
  annotations: string[];
  assertions: string[];
  mocks: string[];
  lineStart: number;
  lineEnd: number;
}

export interface ExistingTestInfo {
  id: number;
  projectId: number;
  filePath: string;
  packageName: string;
  testClassName: string;
  relatedClassId: number | null;
  relatedMethodId: number | null;
  testMethods: ExistingTestMethodInfo[];
  imports: string[];
  sourceCode: string;
  createdAt: string | null;
}

// ─── Source Update & Incremental Generation Types ────────────────────────────

export type SourceUpdateStatus =
  | 'DRAFT'
  | 'ANALYZING'
  | 'ANALYZED'
  | 'GENERATING'
  | 'READY_TO_APPLY'
  | 'APPLIED'
  | 'CANCELLED'
  | 'FAILED';

export type SourceUpdateAction = 'KEEP' | 'UPDATE' | 'CREATE' | 'REMOVE';

export type SourceUpdateReviewStatus = 'PENDING' | 'ACCEPTED' | 'MODIFIED' | 'REJECTED';

export type SourceUpdateTargetType = 'METHOD' | 'BUSINESS_RULE' | 'TEST_PLAN' | 'TEST_CASE' | 'UNIT_TEST';

export type MethodDiffType = 'ADDED' | 'MODIFIED' | 'DELETED' | 'UNCHANGED';

export interface MethodDiffItem {
  className: string;
  qualifiedClassName: string;
  methodName: string;
  signature: string;
  methodKey: string;
  diffType: MethodDiffType;
  reason: string;
  beforeSource: string | null;
  afterSource: string | null;
  callerMethods: string[];
  isServiceMethod: boolean;
}

export interface ImpactSummaryDto {
  totalChangedMethods: number;
  addedMethodsCount: number;
  modifiedMethodsCount: number;
  deletedMethodsCount: number;
  changedMethods: MethodDiffItem[];
  affectedServiceMethods: string[];
  affectedBusinessRuleIds: number[];
  affectedTestPlanIds: number[];
  affectedTestCaseIds: number[];
  affectedUnitTestIds: number[];
}

export interface SourceUpdateItemDto {
  id: number;
  sourceUpdateId: number;
  targetType: SourceUpdateTargetType;
  targetId: number | null;
  targetKey: string | null;
  action: SourceUpdateAction;
  reason: string | null;
  beforeData: string | null;
  afterData: string | null;
  reviewStatus: SourceUpdateReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SourceUpdateDto {
  id: number;
  projectId: number;
  baseRevisionId: number | null;
  candidateRevisionId: number;
  status: SourceUpdateStatus;
  totalChangedMethods: number;
  impactSummary: string | null;
  items: SourceUpdateItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface SourceRevisionDto {
  id: number;
  projectId: number;
  sourceType: SourceType;
  sourceUrl: string | null;
  branch: string | null;
  commitSha: string | null;
  storagePath: string | null;
  logicalRoot: string | null;
  contentHash: string | null;
  createdAt: string;
}
