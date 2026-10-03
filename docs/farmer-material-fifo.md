# Nhật ký, xuất vật tư và chi phí canh tác

Nhật ký sử dụng vật tư cho Bón lót, Bón phân, Phun phân bón lá và Phun thuốc BVTV. Mỗi dòng vật tư có nội dung riêng; PHI chỉ lưu tại nhật ký cho hoạt động phun thuốc. PHI của nhật ký bằng số ngày lớn nhất trong các vật tư.

Xuất kho có ba mục đích: `CULTIVATION` (Phục vụ canh tác), `DISPOSAL` (Hủy vật tư), `OTHER` (Khác). Chỉ xuất phục vụ canh tác có đầy đủ vườn và niên vụ được tính vào chi phí. Thành tiền của cả ba loại xuất đều được tính theo các lần nhập thực tế.

Vật tư được tổng hợp theo tên, loại, đơn vị và quy cách đóng gói. Các bản ghi mua/nhập vẫn giữ riêng. FIFO xử lý ngày giao dịch tăng dần, rồi ngày tạo và ID; nhập trước xuất khi cùng thời điểm. Chi tiết phân bổ lưu ngày nhập, lượng lấy, đơn giá và HSD. Đơn giá tổng của giao dịch chỉ dùng nội bộ để tương thích dữ liệu cũ; bảng Xuất hiển thị thành tiền và đơn giá từng lần nhập trong Chi tiết FIFO.

Lưu, sửa, xóa nhật ký và nhập/xuất kho giữ khóa theo chủ kho, rồi tính lại phân bổ và giá trị các giao dịch bị ảnh hưởng trong cùng transaction. Thiếu tồn tại ngày xuất làm rollback toàn bộ; tồn hiện tại đủ chưa bảo đảm đủ tồn tại ngày xuất trong quá khứ. Các lần xuất sử dụng mới/sửa không được lấy lô đã hết hạn; xuất hủy được phép.

## Cập nhật cơ sở dữ liệu

Chạy khi triển khai phiên bản này:

```powershell
npm.cmd run prisma:migrate:deploy
npm.cmd run prisma:generate
npm.cmd run materials:reconcile
npm.cmd run materials:reconcile -- --apply
```

Lệnh đối soát mặc định chỉ kiểm tra và rollback. `--apply` lưu phân bổ FIFO và cập nhật giá trị giao dịch cũ. Nếu lịch sử từng chủ kho không đủ tồn, chủ kho đó được rollback và báo lỗi, cần đối chiếu chứng từ. Migration thêm trường, phân loại giao dịch cũ và lấy HSD hiện có; không suy ra HSD bị thiếu trong chứng từ cũ.

Nếu Windows báo `EPERM` khi tạo Prisma Client, đóng tiến trình đang giữ thư viện query engine rồi chạy lại `prisma:generate`.

## Kiểm tra

```powershell
npm.cmd run test:material-fifo
npm.cmd run typecheck
npm.cmd run build
```

Bộ kiểm thử FIFO kiểm tra phân bổ 3 + 5 chai, giá trị 1.490.000 đồng, tồn 11 chai, sửa/xóa xuất kho, tính lại giá giao dịch sau, thiếu tồn tại ngày xuất, tổng hợp vật tư và loại Hủy/Khác khỏi chi phí canh tác.

Nếu có tiến trình phát triển đang dùng `.next`, đặt `TRIVIET_BUILD_DIR=scratch/material-build` cho lần build kiểm tra để dùng thư mục riêng. `NEXTAUTH_URL` phải là URL hợp lệ; lần kiểm tra này dùng tạm `http://localhost:3000` vì cấu hình production hiện có giá trị thay thế chưa hợp lệ. Migration và kiểm thử tích hợp trên cơ sở dữ liệu chưa được chạy trong lần chỉnh sửa này.
