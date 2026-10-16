# Đối chiếu nhật ký và xuất kho

Rà soát database **local** ngày 08/10/2026 bằng `npx tsx scripts/audit-journal-stock.ts` (chỉ đọc):

- 956 nhật ký thuộc các hoạt động sử dụng vật tư.
- 558 nhật ký có tên vật tư nhưng chưa có dòng `FarmingLogMaterial`.
- 254 phiếu xuất kho, tất cả đều không có liên kết `farmingLogId`.
- Không có phiếu xuất liên kết nhật ký để đối chiếu số lượng trong dữ liệu hiện tại.

Các phiếu xuất thủ công và các nhật ký lịch sử được ghi nhận độc lập. Liều lượng cũ như `kg/gốc`, `ml/bình` không xác định được tổng số bao/chai đã xuất. Vì vậy chưa tự tạo phiếu xuất hoặc trừ tồn cho các nhật ký cũ. Cần đối chiếu phiếu thực tế, tổng số lượng và đơn vị kho trước khi bổ sung liên kết; tránh ghi xuất hai lần.

Code hiện tại:

- Mỗi vật tư kho trong nhật ký mới có một dòng sử dụng và một phiếu xuất liên kết, lưu trong cùng transaction.
- Sửa số lượng nhật ký cập nhật phiếu xuất và chi phí FIFO; giữ liều lượng đã sửa tay.
- Replay FIFO đồng bộ số lượng và chi phí của dòng sử dụng ngay cả khi giá trị FIFO trên phiếu xuất không đổi.
- Khi thay toàn bộ vật tư kho bằng vật tư tự ủ, hoàn lại tồn kho của các phiếu xuất vừa xóa.
- Bảng xuất phân biệt nguồn `Nhật ký canh tác` và `Xuất kho thủ công`; dùng tên, đơn vị và nội dung đã ghi nhận trong dòng vật tư liên kết.
- Quy cách đóng gói được lưu riêng; vật tư cùng tên nhưng khác quy cách không gộp chung.
- Vật tư tự chuẩn bị/tự ủ không tạo phiếu xuất hay chi phí kho.

Kết quả trên không đại diện cho database production. Script có thể chạy lại trong môi trường cần đối chiếu với kết nối database phù hợp.
