# Sửa preview báo không tìm thấy file test đã tách fixture

## Nguyên nhân

Backend `UnitTestFileService.mergeCompatibleFixtures` tách các fixture không tương
thích thành các class/file `OriginalTest_GreyTest_<caseId>`. `UnitTestDto.filePath`
trong danh sách record vẫn là đường dẫn gốc; API `/unit-tests/files` trả đường dẫn
file đã gộp/tách cùng danh sách `caseCodes` thuộc file đó.

Frontend `UnitTestsPanel` chỉ tìm `file.filePath === active.filePath`. Khi file đổi
tên, preview hiện “Không tìm thấy file test” dù kết quả sinh đã hoàn thành và API
files có dữ liệu. Điều hướng qua badge Test Case trong file cũng dùng sai điều kiện
đường dẫn này.

## Thay đổi

- Dùng metadata `caseCodes` có sẵn để nối record với đúng file xuất.
- Giữ fallback theo đường dẫn chính xác khi metadata case không có.
- Chỉ chọn khi có một file phù hợp; không chọn ngầm file có metadata mâu thuẫn.
- Dùng chung resolver khi mở file và khi chọn badge case để chuyển method.

Không thay đổi backend API, dữ liệu lưu, cách tách fixture hay nội dung test đã sinh.
Các thay đổi sẵn có trong progress component/hook được giữ nguyên.

## Kiểm chứng

Hai test tái hiện mới đã thất bại trước sửa:

1. Hai record cùng đường dẫn gốc nhưng file được đổi tên theo từng fixture: mở đúng
   file đầu, chọn record thứ hai sẽ mở đúng file thứ hai và highlight method.
2. File gộp đã đổi tên chứa nhiều case: bấm badge case phải chuyển đúng method.

Thêm kiểm tra fallback với file legacy không có mã case và từ chối file cùng đường
dẫn nhưng metadata case không khớp.

```powershell
npm.cmd test -- src/features/unit-tests/components/UnitTestsPanel.test.tsx src/features/unit-tests/pages/UnitTestsPage.test.tsx src/features/unit-tests/api/unit-test-api.test.ts src/shared/hooks/useGenerationProgress.test.tsx src/shared/components/AiGenerationProgress.test.tsx
npm.cmd run build
```

Kết quả: **47 tests pass**, TypeScript/Vite build thành công. Reviewer chỉ đọc đã
kiểm tra delta, không có phát hiện cần sửa. Lỗi được tái hiện và kiểm chứng bằng
React DOM; chưa kiểm tra trực tiếp phiên web của người dùng vì không có browser
kết nối trong phiên làm việc này.

Bằng chứng tại workspace root:

- `.greytest-generation-verification/ui-test-file/red.log`
- `.greytest-generation-verification/ui-test-file/targeted-final.log`
- `.greytest-generation-verification/ui-test-file/build.log`

Áp dụng bằng frontend mới và tải lại trang. Không cần gọi AI sinh lại Unit Test.
