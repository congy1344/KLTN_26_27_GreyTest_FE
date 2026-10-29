# Tốc độ sinh theo gói và lịch sử thanh toán

## Thay đổi

- Trang Hồ sơ ghi rõ Free tối đa 2, Plus 3, Pro 4 batch đồng thời, khớp LlmBatchExecutor hiện có. Hộp chọn gói cũng hiển thị Plus 3 và Pro 4. Thêm giải thích mỗi batch là một nhóm dữ liệu, thời gian sinh còn phụ thuộc model AI và độ phức tạp source.
- Thay các mô tả ước lượng ~400 test/không chạm trần hạn mức bằng giới hạn batch thực tế.
- Thêm PaymentHistory dưới bảng gói trên trang Hồ sơ. Dùng lại fetchPaymentHistory và GET /api/payment/history, vốn đã xác thực tài khoản và trả giao dịch mới nhất trước.
- Bảng hiển thị ngày tạo đã lưu, mã đơn hàng, gói, số tiền của giao dịch, ngân hàng và trạng thái. Không thay số tiền lịch sử bằng giá gói hiện tại. Chờ xác nhận không được xem là đã thanh toán.
- Có trạng thái tải, rỗng, lỗi/thử lại và nút làm mới. Query cache tách theo userId.

## Kiểm chứng

- 19 kiểm thử frontend qua: PaymentHistory (6), ProfilePage (2), ProfileCancellation (7), UpgradeToProModal (4).
- 13 kiểm thử backend qua: PaymentControllerTest (7), LlmBatchTierConcurrencyTest (6). Hai kiểm thử mới của history kiểm tra lọc theo user đã xác thực và từ chối đọc repository khi phiên không hợp lệ.
- TypeScript/Vite build thành công, còn cảnh báo bundle lớn đã có trước. Kiểm thử chuyển trang VNPay vẫn chịu giới hạn navigation của jsdom.
- Reviewer chỉ đọc không phát hiện lỗi. Hai repository qua git diff --check.
- Vite đang phục vụ ProfilePage và PaymentHistory mới với HTTP 200. API history đang chạy trả 401 với token không hợp lệ.

Không sửa backend production hoặc database; API lịch sử và giới hạn batch đã tồn tại. Không cần build lại backend cho thay đổi giao diện này. Chưa kiểm tra trực quan trong trình duyệt hoặc thực hiện giao dịch VNPay mới.

## Điều chỉnh hiển thị theo yêu cầu tiếp theo

Lịch sử chỉ hiển thị giao dịch SUCCESS (Thành công) và FAILED (Không thành công). Giao dịch PENDING được ẩn khỏi bảng, không chuyển thành FAILED và không sửa dữ liệu đã lưu. Bỏ nhãn và chú thích Chờ xác nhận. Nếu chỉ có PENDING, hiển thị trạng thái rỗng; nút Làm mới vẫn đưa giao dịch vào bảng khi có kết quả. Đã cập nhật kiểm thử lọc, danh sách rỗng và làm mới; 19 kiểm thử giao diện qua.
