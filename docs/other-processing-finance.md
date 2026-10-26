# Chế biến khác và Tài chính — 26/10/2026

- Sổ Nhập hàng có 7 mã CB. Hai mã `CB-2026-2908`, `CB-2026-2007` bị bộ chọn nguồn ẩn vì `sourceConflict=1`, nên cả 8 sổ chỉ có 5 mã. Nguồn đã nhập được giữ lại để truy xuất, đánh dấu chờ đối chiếu khi không còn khớp hồ sơ thu hoạch. Không xóa cờ sai khác hoặc thay số liệu thu hoạch để ép đủ điều kiện.
- Các sổ hiển thị đủ mã CB, kể cả chưa có công đoạn. Script khởi tạo 16 bản nháp có nguồn rõ ràng cho hai lô, lưu trong database; giữ nguyên 40 bản ghi trước đó. Chỉ khối lượng tiếp nhận có sẵn được kế thừa; không tạo số đo, kết quả kiểm tra hay phiếu bán đã xác nhận cho hai lô. Backend từ chối xác nhận khi nguồn còn sai khác.
- Toàn bộ ô của các sổ Chế biến khác căn giữa. Độ rộng/khả năng vừa desktop của 6 bảng giữ nguyên; không đổi bố cục trái tươi.
- Nhập kho TP và Xuất bán dùng nhóm **Số lượng/khối lượng**, có hai cột con **Số lượng (thùng)** và **Khối lượng (kg)**. Chỉ Xuất bán thêm **Giá trị (đ)** ngay sau nhóm này, theo lựa chọn của người dùng.
- Khách hàng Chế biến khác gồm tên doanh nghiệp và địa chỉ riêng: tên in đậm bên trên, địa chỉ thường bên dưới. Dữ liệu khởi tạo dùng danh sách doanh nghiệp/địa chỉ người dùng cung cấp, thay giá trị “Khách hàng mẫu · Địa chỉ minh họa”. Form và Excel dùng cùng trường; Excel có rich text và chiều cao dòng theo nội dung.
- Giá trị của 5 phiếu đã có được khởi tạo theo yêu cầu, tham chiếu 180.000 đ/kg, tổng 42.778.980 đ. Đây là giá trị khởi tạo để người dùng đối chiếu/chỉnh theo chứng từ, không phải dữ liệu hóa đơn được xác minh độc lập. Nguồn khởi tạo lưu ở `valueOrigin`/`valueNote` và lịch sử; không tạo khoản thu tự động.
- Tài chính → Xuất bán tổng hợp trực tiếp phiếu trái tươi và phiếu Chế biến khác đã xác nhận. Một phiếu CB tương ứng một dòng, không sao chép vào chuỗi truy xuất trái tươi. Cột **Phân hệ xuất bán** nằm sau **Mã số lô hàng**, trước **Đối tác**: badge xanh lá cho trái tươi, xanh dương cho Chế biến khác. File tài chính Excel cũng có cột phân hệ.
- Công nợ và thao tác Thu tiền dùng cùng sổ thanh toán. ID chứng từ CB có namespace riêng; kiểm tra tiền thu không vượt công nợ, không được hạ giá trị thấp hơn tiền đã thu hoặc đổi ngày bán sau ngày thu. Bản nháp không được thu tiền; nhập kho không tạo doanh thu. Bộ lọc tháng xét cả giao dịch CB.

## Thay đổi kỹ thuật

`other-register-data.ts`, `other-registers.ts`, `other-register-write.ts`, `other-register-view.tsx`, `other-register-form.tsx`: nguồn chờ đối chiếu, các cột và form. `processing-gmp-register-table.tsx`: tùy chọn căn giữa riêng cho Chế biến khác. `other-monitoring-export.ts`: cột nhóm và định dạng khách hàng/số tiền.

`processing-finance-sales.ts`: phép tổng hợp hai loại chứng từ, định danh CB, phân hệ và đối tác. `processing-gmp.ts`: dùng tổng hợp này khi ghi thanh toán. `processing-gmp-view.tsx`, `sales-subsystem-badge.tsx`: bảng/Excel/bộ lọc/tổng tiền và badge.

Không thêm bảng hay migration schema; dữ liệu bổ sung nằm trong workspace JSON hiện có. GET không tự tạo giao dịch. Chạy `scripts/update-other-register-finance.ts --target local|production` để xem kế hoạch; thêm `--apply` để ghi. Script chỉ sửa workspace cơ sở tài khoản `0909000003`, sao lưu vào `.storage/other-finance/` và kiểm tra revision. Không đổi Sổ Nhập hàng, sổ trái tươi, thanh toán đã có, token QR hoặc dữ liệu riêng trên production.

## Kiểm tra

- Các bài kiểm thử sẵn có về 8 sổ, nhập/xuất kho, thời gian, quyền sở hữu, sửa bản ghi, lịch sử, Excel và desktop tiếp tục chạy.
- `test-other-finance.tsx`: mã CB đang xung đột vẫn hiển thị, chặn xác nhận/thu tiền bản nháp; căn giữa, nhóm lượng, kiểu tên/địa chỉ, giá trị chỉ ở xuất bán, ghi công nợ/thu tiền không trùng giao dịch, chống thu vượt/hạ giá trị dưới tiền đã thu, màu badge và xuất Excel.
- `test-other-registers-http.cjs`: kiểm thử HTTP local cho 8 trang, tạo/sửa đủ 8 sổ, readback database, stale revision, tranh chấp tồn kho và thu tiền phiếu CB qua API Tài chính. Fixture được dọn sau kiểm tra.

Trên giao diện: mở Chế biến khác, chọn từng sổ và bỏ bộ lọc tháng để thấy cả 7 mã. Hai lô có nguồn sai khác được ghi “Chờ đối chiếu nguồn”. Mở Sổ Xuất bán để sửa doanh nghiệp/địa chỉ/giá trị; mở Tài chính → Xuất bán để xem badge, giá trị/công nợ và Thu tiền.
