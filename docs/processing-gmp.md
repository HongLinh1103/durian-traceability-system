# Quy trình cơ sở chế biến — BM-GMP-01 đến BM-GMP-06

## Các trang

Menu gồm Tổng quan, China Port, Hồ sơ thu mua, Nhập hàng, Tiếp nhận & Sơ chế, Đóng gói & Nhập kho, Kiểm tra trước xuất bán, Xuất bán, Sau xuất bán và Tài chính. China Port giữ chức năng cũ. Các đường dẫn `grading`, `processing`, `shipments` được giữ để liên kết cũ vẫn hoạt động.

## Dữ liệu và nghiệp vụ

- PostgreSQL lưu workspace GMP riêng theo tài khoản trong `processing_gmp_workspaces`. Các bản ghi có công đoạn, mã hồ sơ/mã lô, nguồn liên kết, niên vụ và trường biểu mẫu. Payload các sổ được lưu bằng JSONB; các quy tắc nghiệp vụ nằm trong `src/lib/processing-gmp.ts`.
- API `/api/processing/gmp` xác thực vai trò và chủ tài khoản, kiểm tra dữ liệu ở máy chủ, dùng revision để ngăn ghi đè khi hai phiên cập nhật đồng thời.
- Mã TM dùng cho thu mua (định dạng `TM-YYYY-DDMM`). Mã LH sinh khi nhập hàng theo định dạng `LH-YYYY-DDMM` (tương ứng mã TM, nếu có nhiều lô trong cùng ngày thêm đuôi `-01`, `-02`, `-03`...), được giữ xuyên suốt các công đoạn sau. Thông tin và lượng đầu vào luôn được tính lại từ bản ghi nguồn ở máy chủ.
- Loại 1 + Loại 2 + Loại 3 + lượng từ chối phải bằng khối lượng mua. Đầu ra không vượt đầu vào. Số thùng và số quả là hai trường riêng.
- Lô kiểm tra không đạt không được xuất bán. Kiểm tra lại được lưu thành bản ghi mới, giữ lịch sử. Tổng số thùng lấy mẫu phải ít nhất `ceil(số thùng × 2%)`.
- Một bản ghi nguồn đã chuyển công đoạn hoặc có thanh toán không được sửa. Mỗi lô được chuyển toàn bộ sang một bản ghi công đoạn sau; chưa hỗ trợ chia một lô thành nhiều chuyến xuất.
- Công nợ tính trực tiếp từ thu mua/xuất bán; mỗi lần thanh toán được lưu riêng, không vượt công nợ còn lại.

## Xuất tài liệu

Các nút Xuất Word tạo DOCX với bảng A4 ngang, tiêu đề gộp nhiều tầng, cột theo biểu mẫu, lặp tiêu đề trên trang tiếp theo. Bộ lọc tháng/ngày, niên vụ và tìm kiếm xác định các dòng được xuất. BM-GMP-02 và BM-GMP-03 có tiêu đề ba tầng. Giá mua/bán không đưa vào sổ GMP. Báo cáo thu mua có mã hồ sơ và giá trị mua; báo cáo tài chính xuất CSV UTF-8.

Tên đơn vị lấy từ hồ sơ cơ sở, có thể điều chỉnh trên trang trước khi xuất. Người tiếp nhận hiện được ghi bằng tên, chưa tích hợp chữ ký điện tử.

## Khởi tạo và kiểm tra

```sh
npx prisma generate
npx prisma migrate deploy
npm run seed:processing-gmp
npm run test:processing-gmp
npm run build
```

Seed chỉ tạo workspace chưa tồn tại: 8 hồ sơ thu mua và các lô tại từng công đoạn, một trường hợp kiểm tra không đạt, một giao dịch thanh toán một phần. Không thay thế workspace có sẵn. Tài khoản chưa có workspace cũng được khởi tạo dữ liệu minh họa ở lần truy cập đầu tiên.

Các dữ liệu của luồng cũ trong localStorage và các API chế biến cũ không bị xóa; chưa tự động chuyển sang sổ GMP do thiếu các trường bắt buộc như phân loại 1/2/3 và kiểm tra trước xuất. Luồng GMP mới dùng PostgreSQL, không còn đọc kho demo localStorage cũ.

Kiểm thử bao gồm kế thừa nguồn, cân bằng khối lượng, chống tạo trùng, khóa lô không đạt, lấy mẫu, kiểm tra lại, khóa sửa dữ liệu nguồn, công nợ, thứ tự ngày và cấu trúc DOCX. Cần kiểm tra trực quan trên trình duyệt và Word khi có môi trường tương ứng.
