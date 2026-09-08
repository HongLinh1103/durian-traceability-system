# Rà soát cảnh báo GitGuardian ngày 08/09/2026

## Phạm vi và kết luận

Kiểm tra bản làm việc tại HEAD `5c925e9`, danh sách file được Git theo dõi,
lịch sử liên quan tới tài khoản hệ thống, file môi trường và SMTP trong các ref
có sẵn ở máy. Remote trùng repository trong ảnh: HongLinh1103/durian-traceability-system.
Chưa kiểm tra dashboard GitGuardian, header xác thực email, bản triển khai,
cơ sở dữ liệu production hoặc nhật ký truy cập. Đây không phải kiểm toán toàn bộ hệ thống.

Có lộ mật khẩu ứng dụng trong mã nguồn. Nhãn “Company Email Password” chưa
chứng minh đó là mật khẩu hộp thư: bộ dò có thể nhận diện cặp email/mật khẩu
đăng nhập ứng dụng. Chưa xác định chính xác file/commit của incident trong ảnh.
Thời điểm push trong ảnh là 05/09/2026 05:28:26 UTC (12:28:26 giờ Việt Nam),
không nhất thiết là thời điểm commit được tạo.

## Phát hiện

1. **Nghiêm trọng — công khai thông tin đăng nhập qua trình duyệt.**
   `src/lib/system-accounts.ts` trước sửa có 15 tài khoản kèm mật khẩu rõ,
   gồm ADMIN và các vai trò khác. Trang `src/app/(auth)/login/page.tsx` là
   client component, import danh sách này, hiển thị và tự điền mật khẩu.
   Vì vậy rủi ro tồn tại cả khi repository được chuyển sang private.
   File đã có trong lịch sử từ commit `9ba2e09` ngày 26/08/2026.

2. **Nghiêm trọng — bỏ qua xác thực trong cơ sở dữ liệu.**
   `src/lib/auth-service.ts` trước sửa chấp nhận mật khẩu cố định sau khi
   không tìm được tài khoản, mật khẩu DB không khớp hoặc truy vấn DB lỗi.
   Nhánh này còn tự upsert tài khoản, đặt lại mật khẩu, vai trò và phê duyệt.
   Đổi mật khẩu trong DB không đủ vô hiệu hóa nhánh này. Tài khoản bị khóa
   hoặc xóa cũng có thể đi qua nhánh này khi mật khẩu DB không khớp mật khẩu cố định.

3. **Còn tồn tại — mật khẩu trong script tạo dữ liệu.**
   Các file cần xử lý tiếp trước khi chạy seed trên môi trường thật:
   `prisma/seed.ts`, `prisma/seed-store-demo.ts`,
   `scripts/seed-farmer-minh-phat-harvest.ts`, `scripts/seed-nursery-accounts.cjs`,
   `scripts/seed-partner-accounts.cjs`, `scripts/seed-regional-farms-and-logs.cjs`,
   `scripts/seed-role-accounts.cjs`, `scripts/seed-store-marketplace.cjs`,
   `scripts/seed-traceability-demo.ts`, `scripts/seed-tri-an-manager.cjs`,
   `scripts/set-farmer-passwords.ts`.
   Một số script cập nhật mật khẩu tài khoản đã có; chạy lại có thể tái đưa mật khẩu
   công khai vào DB. Script traceability cũng in mật khẩu ra log.
   Chưa chạy hoặc sửa dữ liệu bằng các script này trong lần rà soát.

4. **Chưa tìm thấy bằng chứng lộ SMTP trong phạm vi kiểm tra.**
   Email service đọc `SMTP_PASS` từ biến môi trường. `.env` và `.env.local`
   không được theo dõi ở HEAD; truy vấn lịch sử các đường dẫn `.env`, `.env.local`,
   `.env.production` không trả về commit. Các giá trị bí mật dài từ 8 ký tự
   được kiểm tra trong hai file local không xuất hiện nguyên giá trị trong
   file được theo dõi hiện tại. Đây không phải quét toàn bộ mọi blob lịch sử,
   không loại trừ biến thể mã hóa, file đã đổi tên hoặc ref chưa có trên máy.

## Đã sửa tại máy

- Bỏ danh sách chọn nhanh và import tài khoản khỏi trang đăng nhập.
- Bỏ nhánh đăng nhập bằng mật khẩu cố định và tự upsert tài khoản.
- Bỏ trường mật khẩu khỏi danh sách metadata tài khoản hệ thống.
- Thêm `scripts/test-auth-security.cjs` và đưa kiểm thử vào CI.

Kiểm chứng: `npm.cmd run typecheck` đạt; 8 kiểm thử qua
`node --test scripts/test-auth-security.cjs` đạt; `git diff --check` đạt.
Kiểm thử dùng DB giả lập, không đăng nhập hoặc gửi email trên hệ thống thật.
Chưa build production, commit, push hoặc triển khai. Các chỉnh sửa phân quyền
có sẵn trong workspace được giữ nguyên.

## Việc cần làm trên môi trường thật

1. Triển khai bản sửa đăng nhập cùng việc đổi mật khẩu riêng cho mọi tài khoản
   có thông tin đăng nhập từng xuất hiện trong repository hoặc được tạo bởi seed.
   Tài khoản chỉ tồn tại trong danh sách cũ, chưa tồn tại trong DB, sẽ không còn đăng nhập được.
2. Vô hiệu hóa các phiên đăng nhập cũ. Kiểm tra cả cơ chế NextAuth và JWT riêng;
   đổi mật khẩu không đồng nghĩa tất cả token cũ tự mất hiệu lực.
3. Trực tiếp vào dashboard GitGuardian để đối chiếu file, dòng, commit và loại
   thông tin xác thực. Nếu là mật khẩu hộp thư/SMTP thật, thu hồi và thay mới ở
   nhà cung cấp email, cập nhật cấu hình triển khai. Không gửi mật khẩu vào chat.
4. Kiểm tra log đăng nhập, thay đổi quyền, tài khoản mới và hoạt động dữ liệu
   từ thời điểm thông tin xác thực lần đầu được công khai. Chưa có kết luận bị xâm nhập.
5. Sau khi thu hồi mật khẩu, lập phương án làm sạch lịch sử Git cùng các cộng tác viên;
   chỉ xóa dòng ở commit mới hoặc thêm `.gitignore` không xóa các bản cũ.
   Không force-push hoặc viết lại lịch sử trong lần rà soát này.
6. Thay mật khẩu cố định trong script seed bằng cơ chế cấp mật khẩu ngoài mã nguồn,
   bỏ log mật khẩu và bật quét secret cho các thay đổi mới.

Nguồn đối chiếu:
- https://docs.gitguardian.com/secrets-detection/secrets-detection-engine/detectors/generics/company_email_password
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
