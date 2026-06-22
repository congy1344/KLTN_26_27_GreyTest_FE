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
  endpoints: EndpointInfo[];
}

export interface JavaClassInfo {
  id: number;
  packageName: string;
  className: string;
  qualifiedName: string;
  classType: string;
  filePath: string;
  methods: JavaMethodInfo[];
}

export interface ServiceRelation {
  id: number;
  serviceClassName: string;
  serviceQualifiedName: string;
  repositoryClassName: string;
  repositoryQualifiedName: string;
}

export interface AnalysisResult {
  projectId: number;
  projectName: string;
  status: string;
  totalClasses: number;
  totalMethods: number;
  totalEndpoints: number;
  totalRelations: number;
  existingTestFiles: number;
  classes: JavaClassInfo[];
  relations: ServiceRelation[];
}
