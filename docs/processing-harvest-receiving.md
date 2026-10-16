# Sổ nhập hàng từ hồ sơ thu hoạch

Nguồn nhập hàng là `HarvestRecord.buyerFacilityId`, khớp đúng cơ sở PROCESSING_FACILITY đã phê duyệt. Đồng bộ các trạng thái WAITING_CONFIRMATION, CONFIRMED, HARVESTING, HARVESTED, DELIVERY_CONFIRMED, COMPLETED; loại DRAFT, REJECTED, CANCELLED. Khối lượng nguồn dùng actualWeight, sau đó deliveredWeight, cuối cùng expectedWeight; chỉ xử lý đơn vị kg.

Hồ sơ mới có ngày tiếp nhận trống và trạng thái chờ tiếp nhận. Khóa định danh là harvest ID, không dùng tên nông dân, ngày hoặc mã lô để ghép dữ liệu. Các lần lưu/cập nhật hồ sơ thu hoạch kích hoạt đồng bộ; đọc Sổ nhập hàng cũng đối chiếu lại để phục hồi khi đồng bộ gián đoạn. Trang đang mở kiểm tra lại mỗi 30 giây khi không sửa dữ liệu.

## Công thức và xác nhận

- Trái tươi = Loại 1 + Loại 2 + Loại 3 + Khác.
- Tiếp nhận = trái tươi + chế biến khác.
- Khối lượng đối soát = khối lượng ban đầu từ thu hoạch + chênh lệch cân; chênh lệch khác 0 phải có lý do.
- Lưu tạm: phần dư là chưa phân loại, chưa ghi nhận từ chối và chưa chuyển sản xuất.
- Xác nhận: phần dư là từ chối; tự ghi ngày tiếp nhận, sinh mã lô và khóa kết quả phân loại.
- Chế biến khác > 0 đòi hỏi xác nhận đủ điều kiện chất lượng và an toàn thực phẩm; không tự chuyển nguyên liệu bị từ chối thành nguyên liệu đạt.

Sản xuất nhận hai nhánh có liên kết về bản ghi tiếp nhận và hồ sơ thu hoạch: trái tươi theo phân loại, chế biến khác theo tổng kg. Sổ sơ chế hiện có chỉ lấy khối lượng trái tươi.

Nếu hồ sơ thu hoạch đổi khối lượng sau xác nhận, giữ ảnh chụp khối lượng đã xác nhận, đánh dấu xung đột nguồn và chặn chuyển tiếp đến khi đối soát. Nếu nguồn bị hủy hoặc đổi cơ sở, bỏ hồ sơ chờ cũ; giữ hồ sơ đã xác nhận để truy xuất và chặn sử dụng tiếp. Không xóa hồ sơ thu hoạch đã được xác nhận tiếp nhận.

## Ví dụ dữ liệu mẫu

Ví dụ kiểm thử: khối lượng nguồn 1.100 kg; Loại 1 = 600, Loại 2 = 250, Loại 3 = 100, Khác = 50; chế biến khác = 60 kg với xác nhận đủ điều kiện; tiếp nhận = 1.060 kg; trước xác nhận còn 40 kg chưa phân loại; sau xác nhận từ chối = 40 kg. Tổng nguồn không đổi. Không dùng ví dụ này để thay số liệu hay chứng nhận an toàn của hồ sơ thực tế.

## Dữ liệu cũ

Sổ thu mua bị gỡ khỏi điều hướng và đường dẫn cũ chuyển về Sổ nhập hàng. Dữ liệu thương mại cũ được giữ để không mất lịch sử thanh toán/QR. Chỉ nhận kế thừa bản ghi nhập hàng cũ khi có harvest ID rõ ràng. Bản ghi không có liên kết được đánh dấu lịch sử, không được tiếp nhận lại.

Đối chiếu: `node node_modules/tsx/dist/cli.mjs scripts/sync-processing-harvests.ts`. Ghi: thêm `--apply`. Script sao lưu JSON trước khi đồng bộ; các lần ghi dùng revision để tránh ghi đè chỉnh sửa đồng thời.
