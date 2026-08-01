# 🥇 Triviet Durian Traceability

**Hệ thống quản lý nhật ký nông nghiệp và truy xuất nguồn gốc sầu riêng xuất khẩu**

> Minh bạch từ vườn đến bàn ăn — Đạt chuẩn GACC cho chuỗi sầu riêng xuất khẩu

---

## 📋 Tổng quan

Triviet Traceability là nền tảng **Farm-to-Fork** giúp quản lý toàn bộ chuỗi cung ứng sầu riêng xuất khẩu: từ ghi nhận nhật ký canh tác tại vườn, kiểm soát PHI (Pre-Harvest Interval) và cảnh báo hóa chất cấm theo chuẩn **GACC (General Administration of Customs of China)**, đến đóng gói tại vựa, sinh mã QR truy xuất độc bản cho từng lô hàng.

### 🎯 Đối tượng sử dụng

| Vai trò | Mô tả |
|---------|-------|
| **Nông dân / Chủ vườn** | Quản lý MSVT, ghi nhật ký canh tác, kiểm soát PHI |
| **Chủ vựa / Quản lý vựa** | Quản lý MSCSĐG, lô hàng, duyệt đóng gói, sinh tem QR |
| **Quản trị viên (Admin)** | Giám sát toàn hệ thống, gửi nhắc nhở, theo dõi cảnh báo |

---

## ✨ Tính năng chính

### 🌱 Module Canh tác (Farming Logs)
- ✅ Ghi nhật ký phun thuốc, bón phân, tưới nước theo giai đoạn sinh trưởng
- ✅ Tự động **cảnh báo hóa chất cấm** theo danh sách GACC
- ✅ **Đếm ngược PHI** — Kiểm tra thời gian cách ly trước thu hoạch
- ✅ **Voice-to-text** nhập ghi chú bằng giọng nói (Web Speech API)
- ✅ **Chụp ảnh & nén tự động** trực tiếp từ camera điện thoại
- ✅ **Offline-first** — Lưu nhật ký ngoại tuyến bằng IndexedDB, tự động đồng bộ khi có mạng
- ✅ Form **Mobile-first** tối ưu thao tác tại vườn

### 📦 Module Đóng gói (Packhouse / QR)
- ✅ Quản lý lô hàng theo mã MSVT (vườn) và MSCSĐG (vựa)
- ✅ **Sinh mã QR** độc bản cho từng lô
- ✅ Phân loại chất lượng: **Loại 1, Loại 2, Loại kem**
- ✅ Biểu đồ phân phối chất lượng (recharts)
- ✅ Hỗ trợ in tem QR

### 🔍 Module Truy xuất (Traceability)
- ✅ **Trang tra cứu** bằng QR Code — `/trace/[qrCodeString]`
- ✅ Timeline canh tác chi tiết từng giai đoạn
- ✅ **Tích hợp Google Maps** hiển thị tọa độ vườn
- ✅ Thông tin GACC, số lượt quét, cơ sở đóng gói
- ✅ Progressive Web App (PWA) với Service Worker

### 🔔 Module Cảnh báo & Nhắc nhở (Admin)
- ✅ Dashboard **Admin** giám sát vườn trễ nhật ký
- ✅ Cron job kiểm tra tự động (API: `/api/cron/check-missing-logs`)
- ✅ **Gửi nhắc nhở tức thời** đến nông dân
- ✅ Hệ thống Notification với trạng thái đã đọc/chưa đọc

---

## 🏗️ Kiến trúc & Công nghệ

### Technology Stack

| Thành phần | Công nghệ |
|------------|-----------|
| **Framework** | Next.js 14.2 (App Router, React 18) |
| **Ngôn ngữ** | TypeScript 5.6 |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | NextAuth.js v4 (Credentials Provider) |
| **UI** | Tailwind CSS + Custom Components |
| **Font** | Plus Jakarta Sans, Fraunces (Google Fonts) |
| **Biểu đồ** | Recharts |
| **QR Code** | qrcode (SVG generation) |
| **Nén ảnh** | browser-image-compression |
| **Offline** | IndexedDB (idb) + Service Worker |
| **Form** | react-hook-form + zod |

### Cấu trúc thư mục

```
triviet/
├── prisma/
│   └── schema.prisma          # Database schema (7 models, 6 enums)
├── public/
│   ├── banner-triviet.svg     # Banner panorama (3 bước)
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker
│   ├── offline.html           # Offline fallback page
│   └── icon-{192,512}.svg     # PWA icons
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (fonts, providers)
│   │   ├── globals.css        # Global styles + Tailwind
│   │   ├── page.tsx           # Landing page
│   │   ├── register/          # User registration
│   │   ├── trace/[qrCodeString]/  # Trace lookup page
│   │   ├── dashboard/
│   │   │   ├── farmer/        # Farmer dashboard
│   │   │   │   ├── page.tsx   # Dashboard overview
│   │   │   │   └── logs/new/  # New farming log form
│   │   │   ├── packhouse/batches/ # Packhouse batch management
│   │   │   └── admin/reminders/   # Admin reminders
│   │   └── api/
│   │       ├── auth/           # NextAuth API
│   │       ├── farming-logs/   # POST farming logs
│   │       ├── dashboard/farmer/ # Farmer dashboard data
│   │       ├── trace/[qrCodeString]/ # Trace API
│   │       ├── admin/reminders/ # Admin reminders API
│   │       └── cron/check-missing-logs/ # Cron job
│   ├── components/
│   │   ├── ui/                # UI components (button, card, input, ...)
│   │   ├── providers.tsx      # Toast + PWA + Service Worker
│   │   └── pwa-install-banner.tsx
│   ├── lib/
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── validation.ts      # Zod schemas
│   │   ├── mock-data.ts       # Fallback demo data
│   │   ├── constants.ts       # Constants (chemicals, stages, grades)
│   │   ├── mappings.ts        # Vietnamese → Prisma enum mapping
│   │   ├── workflow.ts        # PHI evaluation, prohibited check
│   │   ├── reminders.ts       # Reminder engine (DB + fallback)
│   │   ├── trace-store.ts     # In-memory trace record store
│   │   ├── offline-farming-logs.ts # IndexedDB offline storage
│   │   └── utils.ts           # cn() utility
│   └── types/
│       └── next-auth.d.ts     # Type augmentation
```

### Database Schema (7 Models)

```
User ──┬── Farm (1:n) ──┬── FarmingLog (1:n)
       │                └── HarvestBatch (1:n) ──┬── QRCode (1:1)
       └── Packhouse (1:n) ──┘
User ──┐
       └── Notification (1:n)
ProhibitedChemical (standalone)
```

---

## 🚀 Hướng dẫn cài đặt & chạy

### Yêu cầu

- **Node.js** >= 18
- **npm** >= 9
- **PostgreSQL** (tùy chọn — dùng mock data nếu không có)

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Tạo file .env.local

```bash
cp .env.example .env.local
```

Nội dung `.env.local`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/triviet?schema=public"
NEXTAUTH_SECRET="r8UzPq3mWx5vY7nA9cDeFgHiJkLmNoPqRsTuVwXyZ12345="
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. (Tùy chọn) Migrate database

```bash
npx prisma migrate dev
```

### 5. Chạy development server

```bash
npm run dev
```

**Truy cập:** [http://localhost:3000](http://localhost:3000)

---

## 🔐 Tài khoản mặc định

### ⚠️ QUAN TRỌNG: Tài khoản Admin

> Hệ thống **hiện tại đang chạy ở chế độ DEMO với mock data**. Tất cả tài khoản đều là giả lập.
> Khi kết nối database thật, bạn cần tạo tài khoản Admin qua form đăng ký hoặc seed database.

| Vai trò | Số điện thoại | Mật khẩu | Ghi chú |
|---------|---------------|----------|---------|
| **Admin** | `admin@triviet.vn` | `admin123` | Tài khoản mock để test dashboard admin |
| Nông dân | Bất kỳ số nào | Bất kỳ (>=6 ký tự) | Đăng ký qua form `/register` |
| Chủ vựa | Bất kỳ số nào | Bất kỳ (>=6 ký tự) | Đăng ký qua form `/register` |

### Cách truy cập Admin Dashboard:

1. Mở trình duyệt và vào **http://localhost:3000/register**
2. Nhập bất kỳ thông tin nào (hệ thống đang demo, không validate thực tế)
3. Sau đó truy cập trực tiếp:
   - **Dashboard Admin (Reminders):** [http://localhost:3000/dashboard/admin/reminders](http://localhost:3000/dashboard/admin/reminders)
   - Trang này hiển thị danh sách vườn trễ nhật ký, có nút **Gửi nhắc nhở** và **Chạy kiểm tra ngay**

### Các tài khoản mock có sẵn:

| Vườn | Mã MSVT | Trạng thái |
|------|---------|------------|
| Vườn Sầu Riêng Hợp Tác Xanh | MSVT-001 | Trễ 2 ngày |
| Trang trại Đông Phú | MSVT-002 | Trễ 3 ngày |
| Vườn Musang King An Phát | MSVT-003 | Trễ 4 ngày |

---

## 🌐 Các route chính

| Route | Mô tả | Yêu cầu |
|-------|-------|---------|
| `/` | Trang chủ — Banner + Giới thiệu | Public |
| `/register` | Đăng ký tài khoản (Nông dân / Chủ vựa) | Public |
| `/dashboard/farmer` | Dashboard nông dân — Thông báo, nhắc nhở | Login |
| `/dashboard/farmer/logs/new` | Form nhập nhật ký canh tác mới | Login |
| `/dashboard/packhouse/batches` | Quản lý lô hàng & sinh QR | Login |
| `/dashboard/admin/reminders` | Dashboard Admin — Cảnh báo & nhắc nhở | Admin |
| `/trace/[qrCodeString]` | Trang truy xuất nguồn gốc | Public |

---

## 🧪 Demo nhanh

1. **Xem trang chủ:** [http://localhost:3000](http://localhost:3000)
2. **Nhập nhật ký canh tác:** [http://localhost:3000/dashboard/farmer/logs/new](http://localhost:3000/dashboard/farmer/logs/new)
   - Thử nhập tên thuốc cấm: `Trichlorfon` hoặc `Carbendazim` → hệ thống cảnh báo đỏ
   - Thử bấm micro để nhập ghi chú bằng giọng nói
   - Chụp ảnh từ camera hoặc chọn từ máy
3. **Sinh mã QR cho lô hàng:** [http://localhost:3000/dashboard/packhouse/batches](http://localhost:3000/dashboard/packhouse/batches)
4. **Truy xuất nguồn gốc:** [http://localhost:3000/trace/demo-trace-code](http://localhost:3000/trace/demo-trace-code)
5. **Dashboard Admin:** [http://localhost:3000/dashboard/admin/reminders](http://localhost:3000/dashboard/admin/reminders)

---

## 🔧 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/dashboard/farmer?userId=` | Dashboard nông dân (cảnh báo, thông báo) |
| `POST` | `/api/farming-logs` | Tạo nhật ký canh tác mới (multipart/form-data) |
| `GET` | `/api/trace/[qrCodeString]` | Lấy thông tin truy xuất theo mã QR |
| `GET` | `/api/admin/reminders` | Danh sách vườn trễ nhật ký |
| `POST` | `/api/admin/reminders/send` | Gửi nhắc nhở tức thời đến nông dân |
| `GET` | `/api/cron/check-missing-logs` | Cron job kiểm tra vườn thiếu nhật ký |
| `POST` | `/api/auth/...` | NextAuth authentication |

---

## 📱 PWA (Progressive Web App)

Ứng dụng hỗ trợ cài đặt trên màn hình chính điện thoại:
- **Service Worker:** `/sw.js` — Cache offline
- **Manifest:** `/manifest.json` — Cấu hình PWA
- **Offline page:** `/offline.html` — Fallback khi mất mạng
- **Banner cài đặt:** PWA Install Banner tự động hiển thị

---

## 🧠 Chi tiết kỹ thuật nổi bật

### 1. Offline-first với IndexedDB
Sử dụng `idb` (IndexedDB wrapper) để lưu nhật ký canh tác khi không có mạng. Tự động đồng bộ khi online qua `window.addEventListener("online")`.

### 2. Kiểm soát hóa chất cấm GACC
Danh sách 5 hóa chất cấm: `Trichlorfon`, `Carbendazim`, `Chlorpyrifos`, `Paraquat`, `Glyphosate`. Nhập đúng tên → tự động gắn cờ `isGACCCompliant = false`.

### 3. Voice-to-text (Web Speech API)
Hỗ trợ nhập ghi chú bằng giọng nói tiếng Việt qua `webkitSpeechRecognition`. Trình duyệt hỗ trợ: Chrome, Edge, Safari.

### 4. Nén ảnh phía client
Sử dụng `browser-image-compression` để nén ảnh xuống <500KB trước khi upload, tiết kiệm dữ liệu di động.

### 5. Mock data fallback
Tất cả API đều có `try/catch` fallback về mock data khi database không khả dụng — giúp chạy demo ngay lập tức không cần PostgreSQL.

---

## 🤝 Đóng góp

1. Fork repository
2. Tạo branch: `git checkout -b feature/ten-tinh-nang`
3. Commit: `git commit -m 'feat: thêm tính năng mới'`
4. Push: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

---

## 📄 Giấy phép

**© 2026 Triviet.** Bản quyền thuộc về TTDN TriViet. Mọi quyền được bảo lưu.

---

## 📞 Liên hệ & Hỗ trợ

> Dự án được phát triển bởi đội ngũ **TTDN TriViet** — Giải pháp công nghệ cho nông nghiệp xuất khẩu.

---

*Hệ thống đang ở giai đoạn phát triển (v0.1.0). Một số tính năng có thể thay đổi trong các phiên bản tiếp theo.*

