# Chuyển tài khoản local lên production

Deploy mã nguồn không sao chép dữ liệu PostgreSQL local. Sau khi chuyển một lần,
tài khoản nằm trong database production và vẫn tồn tại ở các lần deploy tiếp theo.
Không cần chạy lại các script seed có khả năng ghi đè mật khẩu.

## Sửa lỗi đăng nhập ngày 26/09/2026

Database production thiếu `User.identityNumber` dù Prisma Client đọc trường này
khi đăng nhập. Migration `202609260001_add_user_identity_number` bổ sung cột
nullable, không thay đổi các bản ghi hiện có. `prisma migrate deploy` trong
`vercel-build` sẽ áp dụng migration này cho các môi trường khác.

Lỗi truy vấn database được trả thành `AUTH_UNAVAILABLE` thay vì sai mật khẩu.

## Chuyển tài khoản

Yêu cầu Node.js 22 và hai kết nối riêng:

- Local: `DATABASE_URL` trong `.env.local` hoặc `.env`.
- Production: `DATABASE_URL` trong `.env.production.local` (được Git bỏ qua).

Có thể lấy cấu hình production sau khi đăng nhập Vercel CLI:

```powershell
npx vercel login
npx vercel env pull .env.production.local --environment=production
npm run accounts:plan
npm run accounts:transfer
```

`accounts:plan` chỉ đọc dữ liệu. `accounts:transfer` thêm các tài khoản còn thiếu
trong một transaction và kiểm tra lại hash mật khẩu, vai trò, trạng thái duyệt,
khóa và xóa trước khi commit. Nếu bất kỳ bước nào thất bại, transaction rollback.

Tài khoản đã có cùng ID, số điện thoại hoặc email được giữ nguyên. Nếu các định
danh trỏ đến nhiều người khác nhau, script dừng để kiểm tra. Số lượng hash khác
nhau không chứng minh mật khẩu khác nhau vì bcrypt sử dụng salt.

Script chỉ chuyển tài khoản đăng nhập và trạng thái bảo mật; không chuyển ảnh,
hồ sơ định danh, quyền tùy chỉnh, vườn, cửa hàng, cơ sở hay giao dịch liên quan.
Không ghi mật khẩu/hash hoặc danh sách người dùng vào log và mã nguồn.
Chỉ chạy lại khi cần đưa thêm tài khoản mới lên production.

Kiểm tra công cụ:

```powershell
node --test scripts/test-transfer-accounts.cjs scripts/test-auth-security.cjs
```
