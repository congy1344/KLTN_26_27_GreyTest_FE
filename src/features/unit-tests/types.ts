export interface UnitTest {
  id: number;
  testCaseId: number;
  testClassName: string;
  testMethodName: string;
  packageName: string;
  generationType: string;
  existingTestFilePath: string | null;
  sourceCode: string;
  filePath: string;
  createdAt: string | null;
}

// File test hoàn chỉnh đã gộp các @Test method cùng class (mirror UnitTestFileDto)
export interface UnitTestFile {
  filePath: string;
  testClassName: string;
  packageName: string;
  testCount: number;
  caseCodes: string[];
  sourceCode: string;
}
