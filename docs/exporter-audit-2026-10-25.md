# Đối chiếu yêu cầu Exporter ngày 25/10/2026

Phạm vi: mã nguồn đang có trong workspace và PostgreSQL local từ `.env`. Không triển khai hoặc tạo tài khoản trên production. Workspace đã có các thay đổi Exporter trước lần kiểm tra này; không ghi đè các thay đổi khác.

| Yêu cầu | Kết quả đối chiếu |
| --- | --- |
| Khách hàng là cá nhân, số điện thoại hỗ trợ mã quốc gia | Có kiểm tra ở server, chuẩn hóa số điện thoại |
| Dropdown theo doanh nghiệp đang hoạt động và được nhận hàng | Có, lưu exporterId; nhiều nhân viên dùng chung doanh nghiệp |
| Sổ xuất bán, mã phiếu, phân loại thùng/kg, giá trị và giấy kiểm nghiệm | Đã có; dữ liệu lượng hàng kế thừa từ công đoạn trước |
| Tiếp nhận đúng doanh nghiệp, ghi nhận chênh lệch | Kiểm thử tích hợp và HTTP đạt |
| Chuyến nháp, thông tin vận chuyển/hành trình, ngày xuất và chứng từ | Đã có; kiểm tra dữ liệu theo trạng thái chuyến |
| Gom nhiều cơ sở, chia một lô cho nhiều chuyến | Kiểm thử tích hợp đạt |
| Chống phân bổ vượt số thực nhận, kể cả ghi đồng thời | Kiểm thử tích hợp đạt; nháp giữ chỗ, hủy nháp trả lượng khả dụng |
| QR trước xuất bán, giữ token cũ, bổ sung từng chuyến công khai đã xác nhận | Kiểm thử tích hợp và HTTP đạt |
| Exporter không sửa dữ liệu nguồn; cơ sở không sửa hồ sơ chuyến | API tách theo vai trò; kiểm thử HTTP từ chối truy cập trái quyền |
| Lịch sử cập nhật và tài khoản thực hiện | Có audit trên bàn giao và chuyến; giữ snapshot nguồn QR |

## Kiểm tra đã chạy

- TypeScript toàn dự án: `tsc --noEmit` đạt.
- Biên dịch bộ kiểm thử: `tsc -p scripts/tsconfig-exporter-tests.json` đạt.
- `test-exporter.js`: đạt kiểm tra nghiệp vụ, phân quyền, phân bổ đồng thời, công khai QR và giữ snapshot.
- `test-exporter-http.cjs`: đạt kiểm tra API, chứng từ riêng tư, liên kết phiếu lịch sử đã thanh toán, trạng thái tiếp nhận, QR và trang Exporter.
- Đăng nhập bằng mật khẩu qua NextAuth Credentials: tạo session EXPORTER thành công; API trả đúng doanh nghiệp `EXP-TRIVIET-001`.

## Tài khoản đã tạo

- Doanh nghiệp: Công ty TNHH TM&DV XNK Vina T&T (đã đổi tên theo yêu cầu, môi trường local).
- Mã đơn vị: `EXP-TRIVIET-001`.
- Tên đăng nhập: `0909000890`.
- Đã duyệt; doanh nghiệp hoạt động và được nhận hàng.
- Mật khẩu được cung cấp riêng trong hội thoại, không lưu trong tài liệu.

## Giới hạn xác minh

Chưa chạy production build, kiểm thử giao diện bằng trình duyệt hoặc kiểm tra website production. Next dev phục vụ được trang Exporter; tải Google Fonts thất bại trong môi trường mạng hiện tại nên dùng font dự phòng. Các kiểm thử HTTP dùng tiến trình riêng ở cổng 3011 với DB local. Tài khoản trên không dùng được ở production nếu chưa được tạo tại đó. Chi tiết sử dụng và migration nằm trong `docs/exporter-workflow.md`.
