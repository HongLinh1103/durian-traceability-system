# Nâng cấp TriViet theo yêu cầu ngày 26/10/2026

## Dữ liệu khách hàng

Đã đồng bộ 11 cặp `customer` / `customerInfo` từ database local lên production, trong 3 workspace. Chỉ đối chiếu cùng chủ sở hữu, ID bản ghi và mã lô; giữ nguyên toàn bộ số lượng, khối lượng, tiền, nguồn, token và các bản ghi chỉ có trên production. Snapshot trước ghi nằm trong `.storage/sales-contact-sync/`. Không đưa file này lên Git.

Không tự điền dữ liệu liên hệ mặc định khi mở sổ. Deploy mã nguồn không sao chép database; khi có dữ liệu local cần chuyển, dùng `scripts/sync-sales-contacts.ts` để lập kế hoạch và thêm `--apply` để ghi có sao lưu/revision.

## 1. Tem thùng QR Trung–Anh

- Thay bố cục poster A5 cũ bằng bảng nền trắng, chữ đen, viền đen; nhãn Trung giản thể/Anh, mã vùng trồng và cơ sở đóng gói nổi bật, QR có quiet zone và thông tin nước nhập khẩu bên dưới. Tiếng Việt chỉ có ở khu vực cấu hình, không nằm trên tem in.
- Tái sử dụng token/URL truy xuất và bản công bố hiện có. Không thay snapshot đã công bố. QR đã được giải mã bằng ZXing trong kiểm thử HTTP và trả đúng URL của token.
- Lấy mã nguồn từ snapshot nguyên liệu, hoặc nguồn sản xuất thực tế nếu snapshot cũ chưa chứa danh sách nguồn; lấy mã cơ sở từ hồ sơ cơ sở đóng gói. Không sinh mã mặc định.
- Lô nhiều vùng trồng yêu cầu người thao tác chọn đúng vùng của thùng. Mã ngoài danh sách nguồn bị API từ chối. Thiếu dữ liệu/dịch thuật hoặc nội dung vượt kích thước thì chặn in và cảnh báo.
- Bản dịch tỉnh chỉ được đề xuất khi khớp tên tỉnh trong nguồn dữ liệu. Có thể kiểm tra/sửa bản dịch và lưu cấu hình riêng cho token; chỉ chủ cơ sở có quyền lưu.
- Kích thước mặc định 148 × 160 mm, có thể chỉnh rộng 120–210 mm và cao 140–297 mm. CSS `@page` theo cấu hình, ẩn Navbar/nút và ngăn chia tem. QR 45 mm, nguồn PNG 900 px.

Kiểm tra nhanh: **Mã QR → In QR → chọn vùng trồng (nếu có nhiều nguồn) → kiểm tra bản dịch, kích thước → Lưu cấu hình tem → In tem**. Chọn tỷ lệ in 100%, tắt header/footer của trình duyệt.

## 2. Nhật ký: ghi âm và ảnh là file thật

- Giữ tính năng nói để nhập chữ và camera/gallery hiện có. Bổ sung MediaRecorder ghi âm tối đa 90 giây, dừng, nghe lại, xóa/ghi lại, chọn file âm thanh dự phòng. Ngắt microphone và thu hồi object URL khi đóng form.
- Ảnh có thumbnail và xóa từng ảnh; giữ nén ảnh phía client. Nút Lưu bị chặn khi còn nén ảnh hoặc ghi âm.
- Upload file cùng yêu cầu lưu nhật ký (multipart). Backend kiểm tra dung lượng và chữ ký file, tạo ID UUID, ghi bytes thật vào bảng `farming_log_media` trong cùng transaction với nhật ký. URL trả về `/api/farming-logs/media/{id}`. Không ghi Base64 vào nhật ký mới và không dùng filesystem tạm của Vercel để lưu file bền vững.
- Tái sử dụng PostgreSQL hiện có cho dịch vụ file nhị phân có xác thực; không cần khóa object storage hoặc dịch vụ trả phí mới. Tối đa 2 MB/file, 12 ảnh/nhật ký và 3,5 MB file mới/yêu cầu. Ảnh: JPG/PNG/WebP; audio: WebM/MP4/M4A/Ogg/WAV.
- URL có kiểm tra quyền chủ vườn/Trưởng ban theo phạm vi/Admin. Audio hỗ trợ HTTP Range để nghe/tua. Không tải lại file cũ khi sửa; xóa/thay file và cập nhật tham chiếu trong cùng transaction. Rollback không để lại file mồ côi; xóa nhật ký thì file liên quan được cascade.
- Hàng đợi offline lưu Blob/File vào IndexedDB, gồm audio, ảnh và vật tư; chỉ báo lưu vào máy khi chưa đồng bộ.
- `migrate-diary-images.ts` chuyển ảnh Base64 cũ có sẵn thành file/URL có sao lưu. Local hiện kiểm tra được **0 ảnh cũ**; production kiểm tra sau khi triển khai migration schema. Ảnh cũ còn Base64 cũng được chuyển khi sửa nhật ký.

Kiểm tra nhanh: **Nông dân → Ghi nhật ký → Ghi âm / Chọn ảnh / Chụp ảnh → nghe/xem trước → Lưu → Xem / Sửa**. File cũ phải còn khi chỉ sửa ghi chú. Từ chối quyền microphone phải có thông báo, không giả lập ghi âm thành công.

## 3. GPS từng bẫy

- Thêm nút **Lấy vị trí hiện tại** và tọa độ thủ công dự phòng ở mỗi dòng bẫy ban đầu và form thêm/sửa bẫy.
- Chỉ gọi `getCurrentPosition` khi nhấn nút; high accuracy, timeout 15 giây, không dùng watchPosition. Có thông báo chờ, từ chối quyền, không hỗ trợ và timeout; có thể thử lại.
- Mỗi dòng có khóa giao diện riêng; callback GPS cập nhật theo khóa thay vì số thứ tự để tránh ghi đè khi xóa dòng khác. Callback sau đóng form bị bỏ qua.
- API kiểm tra cặp tọa độ, giới hạn ±90/±180, lưu số 0 đúng, sai số và thời điểm. Xem lại có tọa độ, sai số, thời gian và liên kết Google Maps. Sửa một bẫy không thay đổi bẫy khác.

Kiểm tra nhanh: **Sổ sinh vật gây hại → Tạo sổ → Biện pháp Bẫy → thêm ít nhất hai bẫy → Lấy vị trí ở từng dòng → Lưu → mở lại → Sửa vị trí / bẫy**.

## 4. Nhật ký vườn của Trưởng ban quản lý

- Trang danh sách vườn và nhật ký riêng dùng toàn chiều ngang, lề 12–20 px; bảng có cuộn ngang khi màn hình hẹp.
- Nhật ký mở theo `gardenId`, giữ tên/mã vườn, vùng trồng và chủ vườn. Tái sử dụng `CultivationLogsTab`, bộ lọc, bảng, xem chi tiết và form sửa của Nông dân.
- Có **Xem | Sửa**, không cung cấp thao tác tạo/xóa cho Trưởng ban ở trang này. Xem đầy đủ ghi chú, ảnh và audio trong chế độ chỉ đọc.
- Backend GET/PATCH/PUT và đọc file kiểm tra phân công vùng còn hiệu lực; không chỉ dựa vào role. List yêu cầu `farmId` cho Trưởng ban. Đổi ID sang vườn/nhật ký ngoài phạm vi bị từ chối. Hai API xóa không cho Trưởng ban xóa nhật ký của người khác.
- Ghi actor, thời gian, trường thay đổi vào `trace_audit_logs`; giữ `createdById`/chủ vườn, lưu `updatedById`, kiểm tra `updatedAt` để tránh ghi đè bản sửa mới.

Kiểm tra nhanh: **Trưởng ban → Quản lý vườn trồng → Nhật ký của một vườn → lọc → Xem → Sửa → Lưu → tải lại**. Thử ID vườn ngoài phạm vi phải bị chặn.

## Schema và API

Migration bổ sung `20261026140000_labels_diary_media_trap_gps`:

- `FarmingLog`: `voiceUrl`, `createdById`, `updatedById`.
- `farming_log_media`: metadata và bytes, FK/cascade theo nhật ký.
- `pest_traps`: `accuracyMeters`, `locationCapturedAt`.
- `processing_qr_publications`: `labelConfig` JSON, giữ nguyên token/snapshot.

API mới: `GET /api/farming-logs/media/[id]`, `PUT /api/processing/qr/[token]/label`. API nhật ký hiện có hỗ trợ multipart; JSON sửa ghi chú cũ vẫn hoạt động. API tạo/sửa bẫy hiện có bổ sung metadata GPS.

## File chính đã chỉnh sửa/thêm

- `prisma/schema.prisma`, migration nêu trên.
- `src/lib/export-label.ts`, `export-label-service.ts`, `processing-qr.ts`; `src/components/processing/export-label-preview.tsx`; trang `src/app/trace/packing/[token]/print/page.tsx`; API cấu hình tem.
- `src/lib/diary-media.ts`, `farming-log-access.ts`, `offline-farming-logs.ts`; API nhật ký và API đọc media; `src/components/farmer/diary-media-input.tsx`, `farming-log-detail.tsx`, `cultivation-logs-tab.tsx`; trang ghi nhật ký mới.
- `src/lib/trap-location.ts`, `src/components/farmer/trap-location-input.tsx`, `pest-monitoring-tab.tsx`; API tạo sổ và thêm/sửa bẫy.
- Trang nhật ký từng vườn của Trưởng ban, `src/components/region-manager/gardens-manager.tsx`.
- Chuẩn hóa liên hệ và script đồng bộ/chuyển ảnh; các script kiểm thử được liệt kê bên dưới. Các chỉnh sửa local về nội dung hướng dẫn trường liên hệ được giữ lại.

## Kiểm thử đã chạy

- TypeScript toàn dự án: đạt. Build Next.js production: đạt, 131 trang tĩnh và các route động.
- ESLint các file liên quan: không có lỗi; còn cảnh báo sẵn có về biến chưa dùng và `<img>` (ảnh private cần browser gửi cookie).
- `test-export-label.tsx`: song ngữ, không tiếng Việt trên tem, mã riêng biệt, thiếu dữ liệu/mã ngoài nguồn, kích thước in.
- `test-diary-media.ts`: lưu bytes thực trên PostgreSQL local, URL, giữ/thay/xóa, kiểm tra loại/dung lượng, rollback không mồ côi.
- `test-trap-gps.ts`: giới hạn/cặp tọa độ, giá trị 0, lưu sai số/thời gian, cập nhật riêng từng bẫy.
- `test-system-upgrade-http.cjs`: đăng nhập thực, multipart thật, quyền đọc media và Range, Trưởng ban sửa/audit đúng phạm vi, chặn đổi ID/xóa ngoài quyền, upload lỗi giữ nguyên dữ liệu; tạo/sửa hai bẫy; lưu cấu hình tem, không đổi token/snapshot; giải mã PNG QR bằng ZXing về đúng URL; kiểm tra ngữ cảnh/chiều rộng trang vườn. Fixture chỉ ở local, được xóa trong `finally`.
- `npm run test:processing-gmp`: đạt kiểm thử kế thừa, cân bằng khối lượng, khóa sửa, thanh toán và 7 file Word.

Chạy lại các kiểm thử đơn vị/tích hợp database bằng `tsc -p scripts/tsconfig-system-upgrade-tests.json`, sau đó `node -r ./scripts/register-system-upgrade-tests.cjs scratch/system-upgrade-tests/scripts/test-*.js` từng file; HTTP dùng `node scripts/test-system-upgrade-http.cjs` với server local.

## Giới hạn xác minh

Chưa xác minh bằng microphone/GPS thật, trên điện thoại thật hoặc máy in vật lý. Computer-use Windows tự dừng vì không xác định được URL trình duyệt đủ chắc chắn để áp dụng chính sách an toàn; không tiếp tục tự động hóa UI bằng cách khác. Các kiểm thử HTTP/database, giải mã QR và kiểm tra CSS/SSR đã chạy; kiểm tra cảm biến, hiển thị font và print preview trên thiết bị thực theo hướng dẫn trên vẫn cần thực hiện thủ công.
