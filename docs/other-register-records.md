# Lưu dữ liệu và biểu mẫu Chế biến khác — 26/10/2026

## Kết quả

- Đã nhập 40 bản ghi khởi tạo vào PostgreSQL local cho tài khoản Trần Minh Anh: 5 bản ghi ở mỗi sổ trong 8 sổ. Mỗi bản ghi giữ mã CB gốc từ Sổ Nhập hàng.
- Dữ liệu được lưu trong `ProcessingGmpWorkspace.data.otherProcessing` (sơ chế) và `otherMonitoring` (7 sổ còn lại). Không cần thay đổi schema và không phát sinh mã CB mới.
- Bộ dữ liệu khởi tạo xuất phát từ dữ liệu minh họa đã hiển thị ở lần trước, được nhập theo yêu cầu người dùng. Giữ `dataOrigin=IMPORTED_PREVIEW` và ghi nguồn, tài khoản, thời điểm trong lịch sử; không khẳng định các thông số minh họa là phép đo thực tế đã xác minh. Những trường chứa nội dung minh họa được giữ nguyên để người quản lý đối chiếu và chỉnh sửa.
- Giao diện đọc bản ghi đã lưu; bỏ chế độ tự sinh mẫu khi mở trang. Nguyên liệu chưa sơ chế vẫn được hiển thị ở trạng thái chờ ghi nhận.
- Đã sao lưu workspace trước khi nhập tại `.storage/processing-backups/`. Nhập lại không tạo bản ghi trùng. Sổ Nhập hàng, sổ trái tươi và thanh toán giữ nguyên.

## Modal và lưu dữ liệu

Nút **Thêm bản ghi** hoạt động trên cả 8 sổ; nút **Sửa** mở lại bản ghi hiện có. Modal có chọn mã CB, các trường theo cấu trúc sổ, kiểm tra ngày giờ, đánh giá Đ/K, nhiệt độ âm, lưu nháp, lưu xác nhận và tải lại sổ.

Các khối lượng tiếp nhận đã có được kế thừa từ Sổ Nhập hàng và khóa trong form. Sơ chế không được vượt lượng nguồn/từng loại. Các công đoạn tiếp theo cần sơ chế đạt, hoàn tất thời gian hong khô. Đóng gói không vượt lượng đã sơ chế; nhập kho không vượt lượng đóng gói đạt; xuất bán không vượt tồn kho đạt, kể cả kiểm tra theo thời điểm.

API POST chỉ cho tài khoản cơ sở đang hoạt động, đã duyệt. Lưu dữ liệu trong transaction với điều kiện revision; cập nhật đồng thời trả 409 và giữ dữ liệu trong form. Chỉ thông báo lưu thành công sau khi database đã ghi. Mọi lần tạo/sửa có lịch sử tài khoản, thời gian và nội dung. Không lùi bản ghi đã xác nhận thành nháp.

## Xuất file

Tên file là đúng tên sổ và phần mở rộng `.xlsx`, ví dụ `SỔ TIẾP NHẬN & SƠ CHẾ.xlsx`. Không thêm tháng hoặc tiền tố. Nội dung vẫn dùng các dòng sau khi lọc.

## File chính

- `src/lib/other-register-write.ts`: trường nhập và kiểm tra nghiệp vụ của 8 sổ.
- `src/lib/other-register-service.ts`: transaction và kiểm soát phiên bản sổ.
- `src/lib/other-register-import.ts`: nhập dữ liệu khởi tạo, giữ nguồn, chống trùng.
- `src/lib/other-registers.ts`: tên file xuất là tên sổ.
- `src/app/api/processing/other-registers/route.ts`: GET dữ liệu/phiên bản, POST lưu bản ghi, kiểm tra tài khoản.
- `src/app/dashboard/processing/other/[book]/page.tsx`: truyền dữ liệu và revision ban đầu.
- `src/components/processing/other-register-form.tsx`: modal, trường dữ liệu, lưu nháp/xác nhận, bàn phím và focus.
- `src/components/processing/other-register-view.tsx`: đọc bản ghi đã lưu, mở modal, báo kết quả lưu, xuất file.
- `scripts/adopt-other-registers.cjs`: lập kế hoạch/nhập vào DB local có sao lưu.
- `scripts/test-other-register-write.ts`, `scripts/test-other-registers.ts`, `scripts/test-other-registers-http.cjs`, `scripts/tsconfig-other-register-tests.json`: kiểm thử.

## Xác minh

- TypeScript trong build và ESLint: đạt.
- Kiểm thử nghiệp vụ: tạo 8 loại bản ghi, nhập dữ liệu không trùng, lưu nguồn/lịch sử, nháp/xác nhận/sửa, giới hạn ngày giờ, nhiệt độ âm và tồn kho: đạt.
- Kiểm thử HTTP trên bản build cổng 3015: 8 trang có dữ liệu đã lưu, nút thêm bản ghi được bật; tạo mới 8 loại bản ghi bằng POST và đọc lại trực tiếp từ DB; sửa có lịch sử; dữ liệu ngoài cơ sở bị từ chối; phiên bản cũ bị từ chối; hai yêu cầu xuất bán đồng thời chỉ một yêu cầu được ghi; 5 route trái tươi tiếp tục hoạt động: đạt. Kiểm thử ghi dùng tài khoản/workspace tạm và dọn đúng dữ liệu đó khi kết thúc.
- Build production đạt với URL xác thực local tạm thời `http://localhost:3015`, thư mục riêng `scratch/other-records-build`. Không sửa file môi trường production và chưa triển khai website production.
- Chưa kiểm thử thao tác modal bằng trình duyệt; đã kiểm tra cấu trúc form, dữ liệu và API lưu thực tế.

```powershell
node node_modules/typescript/bin/tsc -p scripts/tsconfig-other-register-tests.json
node -r ./scripts/register-other-register-aliases.cjs scratch/other-register-tests/scripts/test-other-registers.js
node -r ./scripts/register-other-register-aliases.cjs scratch/other-register-tests/scripts/test-other-register-write.js
$env:OTHER_REGISTERS_TEST_URL='http://localhost:3015'
node scripts/test-other-registers-http.cjs
```
