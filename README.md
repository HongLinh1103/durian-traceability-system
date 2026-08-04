# Hệ thống Quản lý Canh tác Sầu riêng

Ứng dụng web quản lý tài khoản, hồ sơ nông dân, vùng trồng, vườn trồng và nhật ký canh tác sầu riêng. Hệ thống cung cấp cơ chế phân quyền, phê duyệt hồ sơ, theo dõi hoạt động canh tác và quản lý dữ liệu phục vụ kiểm tra, đối chiếu.

Hệ thống được xây dựng bằng Next.js App Router, PostgreSQL và Prisma, hỗ trợ đăng nhập bằng số điện thoại hoặc email, giao diện responsive và khả năng cài đặt dưới dạng PWA.

## Chức năng hiện có

### Nông dân

- Đăng ký tài khoản và khai báo một hoặc nhiều vườn.
- Nhập mã vùng trồng ngay trong thông tin từng vườn.
- Khai báo nhiều giống sầu riêng cho cùng một vườn.
- Theo dõi trạng thái hồ sơ: chờ duyệt, cần bổ sung, đã duyệt hoặc bị từ chối.
- Xem dashboard vườn và tạo nhật ký canh tác.
- Lưu tạm nhật ký trên IndexedDB khi mất kết nối.

### Trưởng ban quản lý vùng trồng

- Đăng ký hồ sơ tổ chức, thông tin định danh, giấy tờ thẩm quyền và vùng phụ trách.
- Xem dashboard theo phạm vi vùng: tổng số vườn, số hộ, hồ sơ cần duyệt và vườn trễ nhật ký.
- Nhận badge số hồ sơ chờ duyệt tại mục **Hồ sơ nông dân** trên navbar.
- Xem, duyệt, yêu cầu bổ sung, từ chối, cập nhật, khóa hoặc xóa mềm hồ sơ nông dân thuộc vùng quản lý.
- Quản lý vườn và gửi nhắc nhở ghi nhật ký.

### Quản trị viên

- Quản lý tài khoản: xem, sửa, khóa/mở khóa và xóa mềm.
- Phê duyệt hồ sơ đăng ký Trưởng ban quản lý vùng trồng.
- Quản lý tình trạng canh tác và nhật ký của các vườn.
- Quản lý giống sầu riêng, phân bón và thuốc bảo vệ thực vật.
- Quản lý tài liệu: tải lên, xuất bản, ẩn, xóa và khôi phục.
- Nhập tin tức từ URL, chỉnh sửa metadata, xuất bản và xóa bài viết.
- Theo dõi và gửi nhắc nhở đối với vườn thiếu nhật ký.

### Nội dung công khai và PWA

- Cung cấp trang chủ, tin tức và tài liệu công khai.
- Có Service Worker, manifest, trang offline và banner cài đặt PWA.

## Vai trò

| Vai trò | Khu vực chính |
|---|---|
| `ADMIN` | Tài khoản, canh tác, danh mục, tài liệu, tin tức và nhắc nhở |
| `AREA_MANAGER` | Dashboard Trưởng ban, hồ sơ nông dân và vườn trong vùng phụ trách |
| `FARMER` | Dashboard nông dân và nhật ký canh tác |

Tài khoản chưa được duyệt, bị khóa hoặc đã xóa không thể sử dụng các khu vực được bảo vệ.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Framework | Next.js 14.2 (App Router), React 18 |
| Ngôn ngữ | TypeScript |
| UI | Tailwind CSS, Lucide React, component nội bộ |
| Xác thực | NextAuth Credentials, JWT session, bcryptjs |
| Database | PostgreSQL 16, Prisma 5 |
| Form | react-hook-form, Zod |
| Biểu đồ | Recharts |
| Offline | Service Worker, IndexedDB (`idb`) |

## Cấu trúc thư mục

```text
prisma/
  schema.prisma                 # Mô hình dữ liệu
  seed.ts                       # Tài khoản và dữ liệu mẫu
public/
  manifest.json
  sw.js
  offline.html
scripts/
  import-legacy-news.cjs        # Chuyển tin tức cũ vào database
  seed-tri-an-manager.cjs       # Tạo tài khoản/vùng Trị An bằng Node
src/
  app/                          # Page và Route Handler
  components/                   # UI và component nghiệp vụ
  data/                         # Dữ liệu phục vụ migration
  lib/                          # Auth, Prisma, validation, reminder, offline...
  types/                        # Khai báo TypeScript
.storage/                       # File upload cục bộ, không commit
middleware.ts                   # Phân quyền route dashboard
```

## Cài đặt và chạy

### Yêu cầu

- Node.js 18 trở lên.
- npm 9 trở lên.
- Docker Desktop hoặc PostgreSQL tương thích.

### 1. Cài dependency

```bash
npm install
```

### 2. Khởi động PostgreSQL

```bash
npm run db:start
```

Docker Compose mở PostgreSQL tại cổng `5433` trên máy host.

### 3. Cấu hình môi trường

Sao chép `.env.example` thành `.env.local`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/triviet"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="thay-bang-chuoi-bi-mat-dai-va-ngau-nhien"
```

`AUTH_JWT_SECRET` là secret dự phòng cho API đăng nhập tùy biến; nếu không khai báo, hệ thống dùng `NEXTAUTH_SECRET`.

### 4. Khởi tạo database

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

### 5. Chạy development server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Tài khoản và vùng seed

| Vai trò | Tài khoản | Mật khẩu | Ghi chú |
|---|---|---|---|
| Admin | `0348110676` hoặc `admin@triviet.vn` | `Admin@123` | Đã duyệt |
| Trưởng ban | `0909123456` hoặc `truongban.trian@triviet.vn` | `Truongban@123` | Quản lý vùng Trị An |

Vùng mẫu của Trưởng ban:

- Mã vùng: `MSVT-DN-TRIAN-001`
- Tên vùng: Vùng trồng sầu riêng Trị An
- Địa bàn: Xã Trị An, huyện Vĩnh Cửu, tỉnh Đồng Nai
- Giống: Ri6, Monthong, Dona

Không sử dụng mật khẩu seed trong production.

## Lệnh npm

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Chạy development server |
| `npm run build` | Build production và kiểm tra TypeScript |
| `npm run start` | Chạy production server sau khi build |
| `npm run lint` | Chạy Next.js ESLint |
| `npm run prisma:generate` | Sinh Prisma Client |
| `npm run prisma:migrate` | Tạo/chạy migration phát triển |
| `npm run prisma:migrate:deploy` | Chạy migration đã commit trên staging/production |
| `npm run typecheck` | Kiểm tra TypeScript mà không tạo output |
| `npm run db:start` | Khởi động PostgreSQL bằng Docker Compose |
| `npm run db:stop` | Dừng PostgreSQL container |
| `npm run seed` | Nạp tài khoản và dữ liệu mẫu |
| `npm run migrate:legacy-news` | Nhập bài báo cũ; bỏ qua URL đã tồn tại |

Nếu `tsx` gặp lỗi môi trường Windows, có thể tạo riêng dữ liệu Trưởng ban Trị An bằng:

```bash
node scripts/seed-tri-an-manager.cjs
```

## Route giao diện chính

| Route | Quyền | Nội dung |
|---|---|---|
| `/` | Công khai | Trang chủ |
| `/login` | Công khai | Đăng nhập bằng điện thoại/email |
| `/register` | Công khai | Chọn loại tài khoản đăng ký |
| `/register/farmer` | Công khai | Đăng ký nông dân và khai báo vườn |
| `/register/area-manager` | Công khai | Đăng ký Trưởng ban |
| `/account` | Đã đăng nhập | Thông tin tài khoản |
| `/dashboard/farmer` | Nông dân | Dashboard nông dân |
| `/dashboard/farmer/logs` | Nông dân | Nhật ký canh tác |
| `/dashboard/farmer/logs/new` | Nông dân | Thêm nhật ký |
| `/dashboard/area-manager` | Trưởng ban | Dashboard theo vùng |
| `/region-manager/farmers` | Trưởng ban | Hồ sơ nông dân |
| `/region-manager/gardens` | Trưởng ban | Danh sách vườn |
| `/dashboard/admin` | Admin | Dashboard quản trị |
| `/dashboard/admin/accounts` | Admin | Quản lý tài khoản |
| `/dashboard/admin/farming` | Admin | Quản lý canh tác |
| `/dashboard/admin/master-data` | Admin | Quản lý danh mục |
| `/dashboard/admin/news` | Admin | Quản lý tin tức |
| `/dashboard/admin/reminders` | Admin | Cảnh báo và nhắc nhở |
| `/documents` | Công khai | Tài liệu đã xuất bản |
| `/news` | Công khai | Tin tức đã xuất bản |

## Nhóm API chính

| Nhóm | Endpoint tiêu biểu |
|---|---|
| Xác thực | `/api/auth/[...nextauth]`, `/api/auth/login`, `/api/auth/me` |
| Đăng ký | `POST /api/auth/register`, `POST /api/auth/register/area-manager` |
| Nông dân | `/api/dashboard/farmer`, `/api/farming-logs` |
| Trưởng ban | `/api/region-manager/farmers`, `/api/region-manager/gardens/[gardenId]/remind` |
| Admin | `/api/admin/accounts`, `/api/admin/farming`, `/api/admin/master-data/*` |
| Nội dung | `/api/documents/*`, `/api/admin/documents/*`, `/api/admin/news/*` |
| Nhắc nhở | `/api/admin/reminders`, `/api/admin/reminders/send`, `/api/cron/check-missing-logs` |
| Tra vùng | `POST /api/growing-regions/match` |

## Mô hình dữ liệu

- Tài khoản và duyệt hồ sơ: `User`, `AreaManagerApplication`, `ApprovalHistory`, `Notification`.
- Vùng và canh tác: `GrowingRegion`, `Farm`, `FarmingLog`.
- Danh mục: `DurianVariety`, `Fertilizer`, `Pesticide`, `ProhibitedChemical`.
- Nội dung: `Document`, `NewsArticle`.

## Lưu ý vận hành

- File hồ sơ Trưởng ban nằm tại `.storage/area-manager-applications`.
- File tài liệu nằm tại `.storage/documents`; cần persistent volume khi triển khai container.
- Endpoint `/api/cron/check-missing-logs` cần scheduler bên ngoài gọi nếu muốn chạy định kỳ.
- Scheduler phải gửi header `Authorization: Bearer <CRON_SECRET>`; Admin đã đăng nhập vẫn có thể chạy thủ công.
- Endpoint `/api/health` kiểm tra trạng thái ứng dụng và kết nối database.
- `middleware.ts` bảo vệ `/dashboard/*`; các trang `/region-manager/*` tự kiểm tra session ở server/API.
- Phải đổi secret và mật khẩu seed trước khi triển khai thực tế.
- Xem checklist triển khai tại [`docs/production-readiness.md`](docs/production-readiness.md).
