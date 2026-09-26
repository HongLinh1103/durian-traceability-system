# Danh mục xưởng chế biến đóng gói trên production

Trang `/dashboard/admin/packing-facilities` kết hợp bảng `packing_facility_catalog`
và hồ sơ `partner_facilities` loại `PROCESSING_FACILITY`, loại trùng theo mã cơ sở.
Chuyển tài khoản người dùng không tự chuyển danh mục này.

Ngày 26/09/2026, production chưa có 36 bản ghi danh mục ở local và thiếu hai cột
`partner_facilities.code`, `partner_facilities.approvalCode`. Migration
`202609260002_add_partner_facility_codes` bổ sung các cột nullable và unique index
cho `code`. Các lần deploy sau áp dụng qua `prisma migrate deploy`.

Sau khi đã có kết nối production trong `.env.production.local` (Git bỏ qua),
Node.js 22 có thể chạy:

```powershell
npm run packing-catalog:plan
npm run packing-catalog:transfer
```

Nguồn là database local qua `.env.local`/`.env`. Công cụ chỉ thêm mã danh mục chưa
có và điền mã còn trống cho hồ sơ khớp chủ tài khoản. Không thay mã hiện có, không
xóa cơ sở khác, không chuyển tài khoản, giao dịch hoặc giấy tờ. Đối chiếu chủ tài
khoản bằng ID, số điện thoại hoặc email; định danh mơ hồ làm dừng thao tác.

Trước khi ghi, công cụ lưu bản sao phần dữ liệu liên quan vào thư mục
`scratch/packing-catalog-transfer` được Git bỏ qua. Các thay đổi và kiểm tra dữ liệu
chạy trong một transaction, tự rollback nếu không khớp. Chạy lại sẽ bỏ qua các mã
đã có. Dữ liệu production được giữ qua các lần deploy, không cần seed lại.

Kiểm thử: `node --test scripts/test-transfer-packing-catalog.cjs`.
