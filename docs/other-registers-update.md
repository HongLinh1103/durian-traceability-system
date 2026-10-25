# Cập nhật giao diện Chế biến khác

**Cập nhật mới nhất:** chức năng lưu database và modal đã được bổ sung theo yêu cầu tiếp theo. Xem [báo cáo lưu dữ liệu và biểu mẫu](other-register-records.md). Các phần ghi "chờ form" hoặc "chế độ mẫu" bên dưới mô tả giai đoạn triển khai trước.

## Kết quả

Phân hệ có 8 sổ theo đúng thứ tự trong yêu cầu, dùng chung danh sách cho Navbar và tab. Đường dẫn mặc định `/dashboard/processing/other` chuyển đến `/dashboard/processing/other/preprocessing`. Mỗi sổ có một H1, breadcrumb, tab active, bộ lọc và bảng riêng.

| Sổ | Đường dẫn cuối | Cấu trúc |
| --- | --- | --- |
| Tiếp nhận & Sơ chế | preprocessing | Cấu trúc bảng trái tươi: phân loại đầu vào/đầu ra, vệ sinh, hong khô và chất lượng; chỉ đọc lô CB |
| Theo dõi Ủ chín | ripening | 7 cột theo BM-GMP.04 |
| Theo dõi Cấp đông nhanh | quick-freezing | STT, lô, Kho/IQF, thời gian, 3 lần đo nhiệt độ, đánh giá và nhân sự |
| Theo dõi Tách múi | peeling | 7 cột theo BM-GMP.06 |
| Theo dõi Bỏ hạt | deseeding | 8 cột theo BM-GMP.07 |
| Theo dõi Đóng gói | packing | 12 cột tạm thời theo yêu cầu |
| Giám sát Nhập kho TP | warehouse | Đúng 6 cột, không thêm mã lô hoặc cột nghiệp vụ khác |
| Giám sát Xuất bán | sales-monitoring | Đúng 8 cột, không thêm thông tin Exporter/vận chuyển ngoài mẫu |

Mỗi đường dẫn cuối nằm dưới `/dashboard/processing/other/`.

## Dữ liệu và phần chờ hoàn thiện

- Không thay đổi schema, migration, API ghi hoặc tính toán sản xuất. Không xóa/chuyển đổi dữ liệu sổ cũ.
- Các trang mới dùng API chỉ đọc workspace hiện có. Truy cập trang không chạy đồng bộ thu hoạch và không tạo bản ghi công đoạn.
- Không lấy `records.preprocessing` của trái tươi để hiển thị như CB. Chế độ thực tế đọc bản ghi CB đã lưu trong `otherProcessing` hoặc `otherMonitoring`, đồng thời hiển thị nguyên liệu CB từ Sổ Nhập hàng đang chờ sơ chế.
- Những trường phân loại chưa có dữ liệu để trống; không chia tổng khối lượng sang Loại 1/2/3/Khác. Thời gian cũ chỉ có HH:mm không được tự gắn ngày. Ngày cũ chưa có giờ được chú thích rõ.
- Đ/K hiển thị bằng badge. Ngày giờ đầy đủ hiển thị theo giờ Việt Nam, `DD/MM/YYYY HH:mm`; công đoạn có thể kéo dài nhiều ngày. Giá trị âm được giữ nguyên cho nhiệt độ.
- Xuất file dùng cơ chế Excel hiện có, xuất đúng các dòng sau lọc và header nhóm. Không có dòng thì vô hiệu hóa nút xuất.
- Nút **Thêm bản ghi** có màu/icon/vị trí tương ứng trái tươi, hiện vô hiệu hóa và có chú thích chờ form. Không tạo form suy đoán hoặc thông báo lưu thành công.
- Sổ Đóng gói còn chờ mẫu GMP chính thức. Cấu trúc nhập liệu, việc bổ sung phân loại CB và phương án chuyển dữ liệu sổ cũ cần yêu cầu nghiệp vụ riêng.

## Bổ sung theo phản hồi về bố cục và dữ liệu

- Đổi đúng một nhãn cột ở Sổ Tiếp nhận & Sơ chế: **Mã số lô hàng → Mã lô NL**; giữ nguyên các cột còn lại.
- Sửa cả hai tầng header để nhãn dài xuống dòng trong ô, tăng độ rộng cột đánh giá/ngày giờ và giữ bảng trong vùng cuộn ngang. Lỗi cũ nằm ở tầng header thứ hai vẫn dùng `whitespace-nowrap`.
- Thêm `src/lib/other-register-data.ts`: đọc mã `cbLotCodes` đã lưu tại Sổ Nhập hàng hoặc mã lô CB đã phân bổ; không tạo mã từ ngày hoặc đổi tiền tố DG/LH thành CB. Các mã cũ có nhiều lô nhưng chưa rõ lượng phân bổ được giữ nguyên, không tự chia khối lượng.
- Phần nguyên liệu thực tế kế thừa khối lượng Loại 1/2/3/Khác đã có ở Sổ Nhập hàng; chưa có kết quả sơ chế thì để trống và đánh dấu chờ sơ chế. Bản ghi công đoạn đã có được truy ngược qua sourceId về mã CB nguồn.
- Có hai chế độ **Dữ liệu thực tế** và **Dữ liệu mẫu (xem thử)**. Nếu sổ chưa có kết quả công đoạn nhưng có nguồn CB hợp lệ, mặc định hiển thị mẫu để kiểm tra giao diện. Không ghi các dòng mẫu xuống DB.
- Tất cả 8 sổ có dữ liệu mẫu dùng chung mã CB và lượng nguyên liệu nguồn; thời gian, nhân sự, đánh giá, lượng thành phẩm là số liệu minh họa được gắn nhãn. File Excel mẫu có tiền tố `DU-LIEU-MAU`, tiêu đề và cảnh báo rõ ràng.
- Các bảng có mẫu cột không chứa Mã lô NL (Nhập kho TP, Xuất bán) hiển thị liên kết mã dưới tên sản phẩm và đưa mã vào cùng ô sản phẩm khi xuất Excel, không thêm cột.
- Thêm bộ chọn mã CB để lọc dữ liệu và liên kết quay về Sổ Nhập hàng.
- Route nạp dữ liệu nguồn trên server để bảng có dữ liệu ngay khi mở trang; kiểm tra tài khoản đã duyệt trước khi đọc.

Kiểm thử bổ sung xác nhận cùng mã CB xuyên suốt 8 sổ, kế thừa khối lượng nguồn, không tự tạo mã/khối lượng phân loại, không đổi dữ liệu DB, mẫu được gắn nhãn khi render và khi xuất. Với tài khoản Trần Minh Anh trên DB local, có 5 nguồn CB hợp lệ và 5 dòng mẫu ở mỗi sổ. Các kiểm thử này chỉ đọc DB.

Build cuối cùng dùng URL xác thực local tạm thời `http://localhost:3014` và thư mục build riêng `scratch/other-material-build` đã đạt. Kiểm thử HTTP trên bản build cổng 3014 xác nhận cả 8 bảng có dòng mẫu ngay ở lần render đầu, nhãn mẫu rõ ràng, mã CB đúng nguồn, đổi tên cột đúng, 5 route trái tươi vẫn hoạt động, API và workspace không bị ghi thay đổi. ESLint không có lỗi/cảnh báo.

Computer Use đã dừng vì không xác định được URL Chrome đủ tin cậy để thực thi chính sách công cụ. Vì vậy chưa xác minh bố cục bằng tương tác trình duyệt; đã kiểm tra HTML render và quy tắc xuống dòng ở cả hai tầng header.

## File thay đổi trong lần này

| File | Thay đổi |
| --- | --- |
| `src/lib/processing-navigation.ts` | Chuẩn hóa đúng tên 8 mục Chế biến khác; giữ nguyên danh sách trái tươi |
| `src/components/mobile-bottom-navigation.tsx` | Cập nhật mô tả Chế biến khác từ 5 sang 8 sổ |
| `src/app/dashboard/processing/other/[book]/page.tsx` | Kiểm tra khóa sổ và render đúng bảng theo URL |
| `src/lib/other-registers.ts` | Cấu hình cột, ánh xạ chỉ đọc, lọc và định dạng |
| `src/components/processing/other-register-view.tsx` | Thanh thao tác, bộ lọc, bảng và xuất Excel |
| `src/components/processing/processing-gmp-register-table.tsx` | Thêm tùy chọn trình bày chỉ đọc, tái sử dụng table hiện có; giữ hành vi mặc định cho nơi gọi cũ |
| `src/app/api/processing/other-registers/route.ts` | API GET dữ liệu theo tài khoản cơ sở, không ghi workspace |
| `scripts/test-other-registers.ts` | Kiểm tra tách CB/DG, dữ liệu cũ, thời gian, bộ lọc, render và Excel |
| `scripts/tsconfig-other-register-tests.json` | Biên dịch kiểm thử bằng TypeScript |
| `scripts/register-other-register-aliases.cjs` | Giải quyết alias khi chạy bản kiểm thử đã biên dịch |
| `scripts/test-other-registers-http.cjs` | Kiểm tra URL, H1, tab, API chỉ đọc và quyền truy cập trên DB local |
| `docs/other-registers-update.md` | Báo cáo này |

Các thay đổi đã có trong workspace trước lần này được giữ nguyên.

## Xác minh

- TypeScript toàn dự án đạt.
- ESLint các file triển khai chính đạt, không có cảnh báo hoặc lỗi.
- Kiểm thử CB/DG, giữ nguyên state, thời gian qua nhiều ngày, bộ lọc, 8 bảng và xuất Excel đạt; dữ liệu kiểm thử chỉ ở bộ nhớ.
- Kiểm thử HTTP trên bản production local đạt: chuyển trang mặc định, 8 URL trực tiếp, mỗi trang một H1, đủ tab/nút; 5 route trái tươi trả 200; API chỉ đọc không đổi workspace và từ chối vai trò khác/khách chưa đăng nhập. Kiểm thử chỉ đọc tài khoản hiện có, không tạo dữ liệu nghiệp vụ trong database.
- Production build đạt khi truyền `NEXTAUTH_URL=http://localhost:3012` và `NEXTAUTH_URL_INTERNAL=http://localhost:3012` tạm thời cho lệnh build. `NEXTAUTH_URL` trong môi trường production có sẵn không phải URL hợp lệ, nên cần cấu hình URL thật khi triển khai. Không sửa file môi trường trong lần này.
- Chưa thực hiện kiểm tra tương tác và bố cục bằng trình duyệt; kiểm tra điều hướng sử dụng HTTP và HTML render trên server.

Chạy lại kiểm thử:

```powershell
node node_modules/typescript/bin/tsc -p scripts/tsconfig-other-register-tests.json
node -r ./scripts/register-other-register-aliases.cjs scratch/other-register-tests/scripts/test-other-registers.js
# Cần tiến trình ứng dụng local cổng 3013 dùng cùng DB local và NEXTAUTH_SECRET:
node scripts/test-other-registers-http.cjs
```
