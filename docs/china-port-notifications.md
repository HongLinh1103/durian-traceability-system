# Thông báo China Port

## Cấu hình người nhận

Đăng nhập ADMIN → China Port → Cài đặt thông báo. Chọn các sự kiện, nhập email và bấm Lưu cấu hình. Cấu hình được lưu trong PostgreSQL theo tài khoản admin, dùng lại trên các trình duyệt. Lựa chọn cũ trong localStorage chỉ được nạp làm bản nháp khi chưa có cấu hình trong DB; cần bấm Lưu một lần.

Hiện theo dõi Việt Nam (704). SMS chưa được tích hợp. Bỏ chọn Email rồi lưu để dừng nhận. Đồng bộ chỉ dùng cấu hình của admin đã được duyệt, chưa bị xóa, có bật email, và có chọn sự kiện tương ứng. Không tự gửi tới mọi tài khoản admin.

## Dịch vụ gửi thư

Điền trên server hoặc `.env.local` khi chạy local:

```dotenv
SMTP_HOST=may-chu-do-nha-cung-cap-email-ten-mien-cap
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=dia-chi-email-gui
SMTP_PASS=mat-khau-smtp-hoac-mat-khau-ung-dung
SMTP_FROM=dia-chi-email-gui
CRON_SECRET=chuoi-ngau-nhien-dai
```

Lấy host, port và thông tin xác thực từ nhà cung cấp email tên miền. Với cổng 465 dùng SMTP_SECURE=true. Không commit bí mật. SMTP_FROM cần là địa chỉ được nhà cung cấp cho phép gửi. Khởi động lại ứng dụng sau khi thay đổi. API trạng thái chỉ trả tên biến thiếu, không trả mật khẩu.

Gửi email thử dùng đúng mẫu thông báo với dữ liệu giả, tiêu đề [TEST], gửi tới địa chỉ trong biểu mẫu. Thiếu SMTP là lỗi, không báo gửi thành công giả lập. SMTP chấp nhận không bảo đảm email đã vào Inbox; kiểm tra cả Spam.

## Đồng bộ tự động

Triển khai migration bằng `npm run prisma:migrate:deploy` và tạo Prisma Client bằng `npm run prisma:generate`, sau đó khởi động lại ứng dụng.

Cấu hình scheduler trên hosting gọi `GET /api/cron/china-port` với header `Authorization: Bearer <CRON_SECRET>`, ví dụ mỗi 15 phút. Endpoint chưa tự tạo lịch trên hosting. Có thể gọi POST `/api/china-port/sync` bằng phiên admin để đồng bộ thủ công; API này lấy người nhận từ DB.

Đồng bộ đọc các trang Việt Nam, so sánh snapshot trong DB, gửi sự kiện được chọn và lưu snapshot. Khóa PostgreSQL ngăn hai lượt đồng bộ chạy đồng thời. Nếu thiếu SMTP hoặc DB không truy cập được, không cập nhật snapshot. Lỗi gửi thư cũng giữ snapshot cũ để lần sau thử lại. Nếu một số email đã gửi thành công trước khi một email khác lỗi, lần thử lại có thể gửi trùng các email đã thành công; hiện chưa có hàng đợi theo từng người nhận.

Lần đầu chưa có snapshot, mọi bản ghi được xem là mới. Có thể tạo mốc ban đầu bằng POST `/api/china-port/sync` với `{"sendEmail":false}` trước khi bật lịch; thao tác này chủ động ghi nhận dữ liệu hiện tại mà không gửi thông báo.
