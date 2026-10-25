# Gọn giao diện sổ Chế biến khác — 26/10/2026

- Bỏ khung "Bản ghi được lưu trong cơ sở dữ liệu" trên cả 8 sổ.
- Đưa bộ chọn mã CB vào cùng thanh lọc với tháng, từ ngày, đến ngày và tìm kiếm. Màn hình rộng dùng 5 cột; màn hình nhỏ tự xuống hàng.
- Sổ Tiếp nhận & Sơ chế dùng chính mảng độ rộng cột của sổ trái tươi, gồm các cột loại 75px, đánh giá 80–125px, ngày giờ 180px. Không đổi cấu trúc cột.
- Các sổ còn lại dùng độ rộng gọn theo kiểu dữ liệu và nội dung hiện có, giữ xuống dòng và cuộn ngang. Không kéo dãn bảng ngắn ra hết màn hình.
- Bỏ STT riêng ở Sổ Theo dõi Cấp đông nhanh; nhóm ba lần đo nhiệt độ giữ nguyên. File xuất phản ánh cùng cấu trúc mới.
- Bỏ nhãn "Bản ghi khởi tạo" dưới mã CB.
- Đã chuẩn hóa 40 bản ghi tại local và 40 bản ghi tương ứng trên production: hành động "Không phát sinh (mẫu)" thành rỗng (bảng/file xuất hiển thị dấu gạch ngang), bỏ hậu tố "(mẫu)" ở Kho/IQF, sản phẩm, quy cách và tên nhân sự.
- Tên người tiếp nhận/người thực hiện được lấy từ hồ sơ nhập hàng cùng nguồn; người giám sát được đối chiếu với sổ sơ chế trái tươi cùng hồ sơ. Không thay các tên cụ thể đã được ghi nhận.
- Giữ nguyên mã lô, số lượng, khối lượng, ngày giờ, trạng thái và lịch sử cũ. Ghi thêm lịch sử chuẩn hóa; có backup riêng trước ghi cho từng môi trường tại `.storage/other-register-cleanup/`.

## File chính

- `src/components/processing/other-register-view.tsx`: bỏ khung thông báo/nhãn, gộp bộ lọc và dùng độ rộng mới.
- `src/components/processing/processing-gmp-register-table.tsx`: hỗ trợ cấu hình trình bày riêng, độ rộng cố định, xuống dòng; hành vi mặc định của nơi gọi cũ được giữ.
- `src/lib/other-register-layout.ts`: độ rộng khớp trái tươi cho sơ chế và gọn theo nội dung cho các sổ khác.
- `src/lib/other-registers.ts`: bỏ cột STT ở cấp đông nhanh.
- `src/lib/other-register-cleanup.ts`: chuẩn hóa nhãn và đối chiếu tên nhân sự.
- `scripts/tidy-other-registers.cjs`: xem kế hoạch, sao lưu, cập nhật theo revision, xác minh không đổi sổ khác.
- `scripts/test-other-register-cleanup.ts`: kiểm tra ánh xạ tên, bất biến dữ liệu nghiệp vụ/lịch sử, độ rộng cột, bộ lọc và file xuất.

## Xác minh trước triển khai

TypeScript và production build đạt. ESLint không có lỗi/cảnh báo. Kiểm thử chuẩn hóa/độ rộng/bộ lọc/file xuất và kiểm thử CB/DG, thời gian, 8 bảng, Excel đều đạt. Kiểm tra sau cập nhật DB xác nhận chuẩn hóa đã hoàn tất ở cả hai môi trường, không đổi các sổ trái tươi/nhập hàng.

## Bổ sung: giãn bảng theo màn hình desktop

Theo yêu cầu tiếp theo, các sổ Ủ chín, Cấp đông nhanh, Tách múi, Bỏ hạt, Nhập kho TP và Giám sát Xuất bán dùng bảng rộng 100% vùng nội dung từ breakpoint desktop 1024px. Các cột chia tỷ lệ phần trăm, tổng đúng 100%, tiêu đề và dữ liệu được xuống dòng nên không cần thanh cuộn ngang trên desktop. Trên màn hình nhỏ vẫn có thể cuộn để đọc đầy đủ.

- Sổ Bỏ hạt bỏ cột STT.
- Nhập kho TP và Giám sát Xuất bán có cột Mã lô NL riêng ngay sau Thời gian.
- Đóng gói, Nhập kho TP và Giám sát Xuất bán chỉ hiển thị tên trong ô sản phẩm, bỏ mã lô bên dưới. File Excel dùng cùng cấu trúc: mã lô nằm ở cột riêng.
- Sổ Tiếp nhận & Sơ chế giữ độ rộng khớp sổ trái tươi; sổ Đóng gói giữ bố cục cuộn ngang hiện có. Không đổi dữ liệu DB hoặc form nghiệp vụ.

Kiểm thử kiểm tra tổng tỷ lệ độ rộng, chế độ desktop theo từng sổ, thứ tự cột, bỏ STT và nội dung xuất file đều đạt.
