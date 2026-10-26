# Liên hệ trong Sổ Theo dõi Xuất bán

- `customer` / **Khách hàng**: họ tên cá nhân đầu mối giao dịch hoặc bàn giao; không đồng nhất với doanh nghiệp, đơn vị xuất khẩu hay người mua cuối cùng.
- `customerInfo` / **Thông tin khách hàng**: chỉ chứa số điện thoại. Biểu mẫu dùng `type="tel"`; kiểm tra tại trình duyệt và máy chủ. Chấp nhận 8–15 chữ số, mã quốc gia bắt đầu bằng `+`, khoảng trắng, dấu chấm, ngoặc và gạch nối; loại bỏ dấu phân cách khi lưu. Giữ số 0 đầu số nội địa.
- Bảng, chi tiết và file Word dùng cùng nhãn trường. Việc bổ sung giấy kiểm nghiệm vẫn được phép khi phiếu cũ chưa có liên hệ.
- Cho phép sửa riêng liên hệ trên phiếu đã thanh toán hoặc có công đoạn tiếp theo. Số lượng, khối lượng, tiền, liên kết nguồn và các bản ghi sau vẫn được bảo vệ. Phiếu đã được Exporter tiếp nhận tiếp tục tuân thủ khóa thông tin bàn giao đã xác nhận.

## Dữ liệu cũ

Theo lựa chọn của người dùng, không suy đoán hay tạo họ tên/số điện thoại thay thế. Chuyển giá trị không hợp lệ sang `values.legacySalesContact` để đối chiếu, xóa riêng trường không hợp lệ và hiển thị `—`. Giá trị hợp lệ được giữ lại; chỉ chuẩn hóa dấu phân cách số điện thoại. Hàm chuẩn hóa chạy khi tải workspace, có kiểm tra revision và không lặp lại thay đổi.

Để chuẩn hóa đồng loạt trước triển khai:

```
node node_modules/tsx/dist/cli.mjs scripts/normalize-sales-contacts.ts --target local
node node_modules/tsx/dist/cli.mjs scripts/normalize-sales-contacts.ts --target production
```

Thêm `--apply` để ghi. Script sao lưu các workspace bị ảnh hưởng vào `.storage/sales-contact-backups/` trước khi ghi và cập nhật trong transaction có kiểm tra revision. Không thay đổi phiếu chỉ có trên production hoặc snapshot bàn giao/QR đã công bố.

## Kiểm tra

Cập nhật tiếp theo ngày 26/10/2026: theo yêu cầu mới, đã đồng bộ 11 cặp họ tên/số điện thoại được người dùng lưu tại local sang production, trên 3 workspace. Script `sync-sales-contacts.ts` chỉ sao chép hai trường từ bản ghi cùng ID và mã lô, có sao lưu và kiểm tra revision; giữ mọi bản ghi riêng trên production. Không điền liên hệ mặc định khi tải sổ. Lệnh `populate-sales-contacts.ts` cũ chuyển sang cùng cơ chế đồng bộ có chủ đích, mặc định chỉ lập kế hoạch.

```
node node_modules/typescript/bin/tsc -p scripts/tsconfig-sales-contact-tests.json
node scratch/sales-contact-tests/scripts/test-sales-contact.js
npm run test:processing-gmp
```
