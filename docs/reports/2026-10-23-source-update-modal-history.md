# Lịch sử trong cửa sổ cập nhật source

Phần lịch sử nằm phía trên lựa chọn ZIP/GitHub. Người dùng mở từng bản cập nhật để xem thời gian và các mục đã thêm, sửa, xóa thuộc Method, BR, Test Plan, Test Case và Unit Test. Bản mới nhất được xếp trước.

Chỉ hiển thị bản APPLIED và thay đổi đã được ACCEPTED/MODIFIED; bỏ KEEP và mục bị từ chối. Nếu có payload trước/sau, người dùng có thể mở để xem nội dung. Dữ liệu cũ thiếu nội dung chỉ hiện mã tham chiếu, không suy đoán tên hoặc nội dung đã mất.

Lịch sử dùng lại request tải danh sách update của modal, không thêm API hay thay đổi database. Scope dùng chung với khung lịch sử xóa: bỏ bản thuộc service khác khi xác định được, ghi rõ phạm vi toàn project nếu thiếu thông tin để phân biệt. Mở lịch sử không làm mất dấu mới/sửa ở các bước BR/TP/TC/UT.

## Kiểm chứng

- 69 test trong 6 suite liên quan pass: modal, lịch sử, lịch sử xóa, dấu thay đổi, impact và vòng đời đã xem.
- Có kiểm tra nội dung trước/sau, dữ liệu cũ thiếu payload, scope thiếu/sai, lỗi tải lịch sử, request project cũ trả về muộn và các nút lịch sử không gọi mutation.
- TypeScript/Vite build thành công; còn cảnh báo bundle trên 500 kB.
- Reviewer chỉ đọc không phát hiện lỗi cần sửa. `git diff --check` pass.
- Vite đang chạy tại localhost:3000 trả về module mới. Chưa kiểm tra tương tác bằng trình duyệt vì phiên công cụ không có browser kết nối.

```powershell
npm.cmd test -- src/features/projects/components/SourceUpdateModal.test.tsx src/features/projects/components/SourceUpdateHistory.test.tsx src/features/projects/components/SourceUpdateDeletionHistory.test.tsx src/features/projects/components/SourceUpdateHighlights.test.tsx src/features/projects/hooks/useSourceUpdateImpact.test.tsx src/features/projects/hooks/useSourceUpdateSeen.test.tsx
npm.cmd run build
```
