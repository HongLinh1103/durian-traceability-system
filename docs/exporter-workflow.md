# Quy trình bàn giao cho Exporter

## Thiết lập tài khoản

1. Trong **Quản trị → Tài khoản**, tạo và duyệt tài khoản có vai trò **Exporter – Đơn vị xuất khẩu**.
2. Mở **Quản trị → Đơn vị xuất khẩu** (`/dashboard/admin/exporters`), tạo hồ sơ doanh nghiệp, mã đơn vị và liên kết các tài khoản nhân viên.
3. Bật **Hoạt động** và **Được phép nhận hàng**. Danh sách chọn của cơ sở đóng gói chỉ hiển thị doanh nghiệp có ít nhất một nhân viên Exporter đã duyệt, chưa khóa.

Một doanh nghiệp có thể có nhiều tài khoản nhân viên nhưng chỉ xuất hiện một lựa chọn trong danh sách Exporter.

## Cơ sở đóng gói

- Sổ Xuất bán ghi tên cá nhân liên hệ, số điện thoại (cho phép mã quốc gia), ngày bàn giao, đơn vị Exporter và nước nhập khẩu dự kiến.
- Mã phiếu tự sinh. Số lượng và khối lượng lấy từ lô đã kiểm tra; giá trị có thể để chưa xác định. Container là thông tin tùy chọn nếu đã biết.
- Lưu phiếu đồng thời tạo bàn giao cho đúng doanh nghiệp Exporter. Mở Chi tiết để xem trạng thái thực nhận và từng chuyến đã xác nhận.
- Bản ghi lịch sử vẫn giữ nguyên khi chưa liên kết Exporter. Có thể bổ sung chứng từ riêng sau thanh toán. Khi liên kết bản ghi cũ, tên doanh nghiệp/khách hàng cũ được lưu lại để đối chiếu.

## Exporter

- Đăng nhập để mở `/dashboard/exporter`. Chỉ xem các phiếu của doanh nghiệp mình, kể cả khi nhiều nhân viên cùng làm việc.
- Xác nhận số thùng, khối lượng thực nhận. Nếu khác số bàn giao, phải ghi nhận chênh lệch; không được nhận vượt số bàn giao.
- Tạo chuyến, chọn nhiều lô đã nhận và phân bổ số thùng/kg cho từng lô. Một lô có thể chia vào nhiều chuyến, một chuyến có thể gom hàng từ nhiều cơ sở.
- Chuyến nháp giữ chỗ số lượng phân bổ. Hủy nháp để trả lại lượng khả dụng.
- Trước xác nhận, bổ sung vận chuyển, container, seal, cảng/cửa khẩu đi và đến, nước nhập khẩu, người phụ trách. Khi chuyển sang đã xuất, bổ sung ngày xuất thực tế.
- Sau xác nhận, không được sửa phân bổ hoặc lùi trạng thái. Exporter vẫn được cập nhật thông tin vận chuyển, ngày xuất thực tế và chế độ công khai; mọi thay đổi có lịch sử. Cơ sở đóng gói không có quyền sửa phần thông tin này.
- Chọn công khai nếu muốn thông tin chuyến đã xác nhận xuất hiện trên QR. Chứng từ ảnh vẫn cần đăng nhập và đúng quyền truy cập.

## QR

- Có thể tạo QR từ lô đã đóng gói trước khi tạo phiếu xuất bán, không cần biết vận chuyển.
- Token và ảnh chụp dữ liệu nguồn đã phát hành không bị thay thế. Khi lô được bàn giao, QR hiện có tiếp tục sử dụng.
- Trang QR đọc thêm từng chuyến đã xác nhận và được công khai; mỗi chuyến hiển thị số lượng/kg phân bổ riêng. Không gán một container/seal duy nhất cho toàn bộ lô.
- Thông tin nguồn gốc và sản xuất chỉ được Exporter xem, không sửa.

## Triển khai và kiểm tra

Chạy `prisma generate` và `prisma migrate deploy`, sau đó khởi động lại tiến trình ứng dụng để nạp Prisma Client mới. Các migration là bổ sung bảng/role, không xóa hoặc tự động gán Exporter cho lịch sử.

Kiểm thử tích hợp tạo các bản ghi có mã ngẫu nhiên trong PostgreSQL local và dọn đúng các bản ghi đó khi xong:

```powershell
node node_modules/typescript/bin/tsc -p scripts/tsconfig-exporter-tests.json
node -r ./scripts/register-test-aliases.cjs scratch/exporter-tests/scripts/test-exporter.js
```

Kiểm thử HTTP dùng cổng riêng `3011`, cơ sở dữ liệu local và tiến trình Next phát triển riêng với `TRIVIET_BUILD_DIR=scratch/exporter-next`:

```powershell
node scripts/test-exporter-http.cjs
```

Không chạy những kiểm thử này với cơ sở dữ liệu production; script chủ động kiểm tra hostname local trước khi tạo dữ liệu.
