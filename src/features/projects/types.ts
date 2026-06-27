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
  sourceAvailable: boolean;
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
}

export interface JavaClassInfo {
  id: number;
  packageName: string;
  className: string;
  qualifiedName: string;
  classType: string;
  filePath: string;
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
