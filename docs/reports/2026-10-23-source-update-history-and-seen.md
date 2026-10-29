# Lịch sử xóa và dấu hiệu thay đổi đã xem

## Hành vi giao diện

- Test Plan, Test Case và Unit Test có khung lịch sử xóa ở cuối danh sách hiện hành, kể cả khi danh sách trống.
- Khung lấy các item REMOVE có targetId, đã ACCEPTED/MODIFIED trong bản APPLIED; loại mục REJECTED, mục chưa lưu và ID vẫn còn trong danh sách hiện hành.
- Khung dùng màu đỏ, gạch tên tham chiếu, nhãn ĐÃ XÓA và lý do. Không có thao tác sửa/chạy và không tham gia thống kê, phân trang, export hoặc sinh test.
- Dữ liệu lịch sử cũ không có beforeData được hiển thị bằng loại artifact + targetId, không tự đoán mã TP/TC hoặc tên test đã mất.
- Không hiện lịch sử của một service khác khi scope xác định được. Khi bản cập nhật gồm nhiều service, thiếu scope hoặc đổi wrapper về module gốc `.`, khung ghi rõ **Phạm vi: toàn project**, không giả định mọi mục thuộc service đang chọn.

## Đã xem thay đổi

Giữ dấu mới/sửa trong lần xem hiện tại. Khi rời bước hoặc pagehide (tải lại/rời trang), ghi nhận đã xem; quay lại cùng bước thì bỏ dấu mới/sửa và ưu tiên sắp xếp theo thay đổi. Lần cập nhật tiếp theo hiện dấu mới trở lại.

Khóa lưu tách theo user, project, source-update ID, bước BR/TP/TC/UT và servicePath. Dữ liệu chỉ là tùy chọn UI trong localStorage; không dùng token trong khóa, không thay DB hoặc trạng thái approve. Chặn lưu khi danh sách đang tải/refetch/lỗi hoặc trống; BR còn đợi analysis cần để dựng danh sách.

`useSourceUpdateImpact` giữ nguyên raw impact và lịch sử xóa, chỉ ẩn các map/set dùng cho dấu mới/sửa của bước đã xem. Props diff cũ của màn BR và generationType của UT cũng không làm xuất hiện lại các dấu đã xem. Cảnh báo sửa thủ công giữ logic cũ.

## Kiểm chứng

- Test trước sửa tái hiện thiếu khung xóa, sai vị trí khung, dấu không mất khi quay lại, root-wrapper bị ẩn, item thiếu targetId bị báo đã xóa và cached refetch bị tính đã xem quá sớm.
- **79 test liên quan pass**: ba panel downstream, BR, lịch sử xóa, vòng đời đã xem, StrictMode, pagehide, storage bị chặn, độc lập user/project/stage/service và bản cập nhật mới đến trong lúc đang mở màn.
- Reviewer chỉ đọc không còn phát hiện cần sửa ở phiên bản cuối.
- TypeScript/Vite build thành công; `git diff --check` pass. Vite còn cảnh báo bundle trên 500 kB, không chặn build.

```powershell
npm.cmd test -- src/features/projects/hooks/useSourceUpdateSeen.test.tsx src/features/projects/hooks/useSourceUpdateImpact.test.tsx src/features/projects/components/SourceUpdateHighlights.test.tsx src/features/projects/components/SourceUpdateDeletionHistory.test.tsx src/features/business-rules/components/BusinessRulesPanel.test.tsx src/features/test-plans/components/TestPlansPanel.test.tsx src/features/test-cases/components/TestCasesPanel.test.tsx src/features/unit-tests/components/UnitTestsPanel.test.tsx
npm.cmd run build
```

## Giới hạn

“Đã xem” áp dụng cho cả bước sau khi danh sách đã tải, không theo dõi từng card hoặc vị trí cuộn. localStorage chỉ ghi nhớ trên trình duyệt hiện tại; xóa dữ liệu trình duyệt hoặc dùng trình duyệt khác sẽ hiện dấu lại. Nếu storage bị chặn, giao diện vẫn hoạt động và có thể hiện lại dấu khi quay lại.

Chưa tự Apply bản cập nhật trên project thật qua UI hoặc triển khai bundle mới vào container. Frontend cần nạp code/bundle mới để dùng thay đổi.
