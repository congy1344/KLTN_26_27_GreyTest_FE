# Giữ dấu hiệu thay đổi source sau approve và coverage

Cập nhật tiếp theo: dấu mới/sửa được ghi nhận đã xem theo từng bước và bản cập nhật; xem [Lịch sử xóa và dấu hiệu thay đổi đã xem](2026-10-23-source-update-history-and-seen.md).

## Nguyên nhân

BR, Test Plan, Test Case dùng các cờ `isPastRules`, `isPastPlans`, `isPastCases` để ẩn nhãn và bỏ ưu tiên sắp xếp khi workflow đã qua bước tương ứng. Unit Test có thêm `isCoverageVisited`, lấy từ status project và localStorage. Do đó các mục thuộc bản cập nhật source đã Apply cũng mất dấu hiệu khi project đã có coverage.

## Bản sửa

- Dấu hiệu từ source-update diff và các ID artifact thuộc bản cập nhật vẫn có hiệu lực sau approve, coverage và completed.
- Giữ nhãn `+ MỚI THÊM`, `~ CẬP NHẬT THEO CODE` và màu nhận biết ở cả bốn danh sách.
- Giữ thứ tự ưu tiên đã có: mới thêm → cập nhật → không đổi; BR vẫn giữ cách nhóm theo file/class/method.
- Cờ sửa thủ công và nhãn chỉ dựa vào generationType của UT vẫn theo điều kiện ẩn trước đây.

Không thay API, DB hoặc logic sinh test. Thay đổi ở bốn panel FE; giữ nguyên các chỉnh sửa mapping file UT đã tồn tại trước lượt này.

## Kiểm chứng

`SourceUpdateHighlights.test.tsx` dùng hook impact thực, QueryClient có bản APPLIED và mock dữ liệu artifact ở ranh giới API. Kiểm tra nhãn và thứ tự trên cả bốn panel với `COVERAGE_ANALYZED` / `COMPLETED`, có localStorage đã đi tới Coverage. Cả 8 test mới fail trước sửa và pass sau sửa.

```powershell
npm.cmd test -- src/features/projects/components/SourceUpdateHighlights.test.tsx src/features/business-rules/components/BusinessRulesPanel.test.tsx src/features/test-plans/components/TestPlansPanel.test.tsx src/features/test-cases/components/TestCasesPanel.test.tsx src/features/unit-tests/components/UnitTestsPanel.test.tsx
npm.cmd run build
```

Kết quả: **43 test pass**, TypeScript và Vite build thành công. Reviewer chỉ đọc không còn phát hiện cần sửa. Build có cảnh báo kích thước bundle trên 500 kB; không chặn build.

Chưa thực hiện upload/generate/apply trên project thật qua UI và chưa triển khai bundle mới vào frontend container. Frontend cần nạp code/bundle mới để hiển thị bản sửa.
