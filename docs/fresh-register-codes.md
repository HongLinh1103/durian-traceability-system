# Chuẩn hóa sổ trái tươi — 26/10/2026

- Sổ Nhập hàng giữ mã LH của hồ sơ tiếp nhận. Từ Tiếp nhận & Sơ chế đến Đóng gói & Nhập kho, Kiểm tra trước Xuất bán, Theo dõi Xuất bán và Theo dõi sau Xuất bán dùng mã DG đã được phân bổ trong Sổ Nhập hàng. Không tạo mã dựa vào ngày ở công đoạn sau.
- Bộ giải mã lô đi ngược theo ID nguồn hoặc lô sản xuất. Không tự chọn một mã khi hồ sơ bị chia thành nhiều lô và thiếu định danh phân bổ. Khi chuẩn hóa, giữ nguyên ID, sourceId, số lượng, khối lượng, giá trị và khoản thanh toán; mã trước đó lưu ở `legacyLotCode`.
- Nguồn chọn cho bản ghi mới và các giá trị kế thừa cũng dùng DG. API đồng bộ chuẩn hóa bản ghi cũ để biểu mẫu, chi tiết, bảng, file xuất và tài chính dùng cùng định danh.
- Cột Khách hàng giảm từ 200 xuống 150 px; Thông tin khách hàng từ 220 xuống 130 px. Số điện thoại hiển thị liền mạch, không xuống dòng. Form/API của sổ trái tươi nhận số di động Việt Nam 10 chữ số; đầu +84, 0084 hoặc 84 được đổi về 0. Bộ kiểm tra điện thoại quốc tế dùng chung cho phân hệ Exporter vẫn được giữ.
- Cột Đơn vị xuất khẩu chỉ hiển thị tên. Dữ liệu hiện có tại cơ sở tài khoản `0909000003` được đổi thành **Công ty TNHH TM&DV XNK Vina T&T**. Không tự liên kết các giao dịch cũ vào tài khoản Exporter hay đổi trạng thái tiếp nhận thực tế.
- Theo yêu cầu rõ ràng của người dùng, hai số ngoài Việt Nam được thay bằng số khởi tạo đúng định dạng. Số cũ và nguồn khởi tạo lưu ở `previousCustomerInfo`, `customerInfoOrigin`, `customerInfoNote`. Đây không phải số liên hệ được xác minh thực tế.

Chạy `scripts/update-fresh-register-codes.ts --target local|production` để xem kế hoạch; thêm `--apply` để ghi. Script sao lưu workspace và phiếu bàn giao cần cập nhật vào `.storage/fresh-register-codes/`, kiểm tra revision và ghi nguyên tử. Phiếu bàn giao đang chờ được cập nhật mã DG/điện thoại nhất quán và lưu audit; không sửa phiếu đã tiếp nhận hay snapshot QR đã phát hành.

Kiểm tra: `test-fresh-register-codes.ts` (chuỗi DG, trường hợp chia lô, dữ liệu không đổi, idempotency, điện thoại, độ rộng, file xuất); `test-sales-contact.tsx`; `test-production-lots.ts`; `test-processing-gmp.ts`; `test-other-finance.tsx`; build production.
