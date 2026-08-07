# Hệ thống Quản lý Canh tác Sầu riêng

Ứng dụng web quản lý tài khoản, vùng trồng, vườn, nhật ký canh tác và marketplace vật tư nông nghiệp. Hệ thống sử dụng Next.js App Router, PostgreSQL và Prisma; hỗ trợ phân quyền, đăng nhập bằng số điện thoại hoặc email, giao diện responsive và PWA.

## Chức năng chính

### Nông dân (`FARMER`)

- Đăng ký tài khoản, khai báo một hoặc nhiều vườn và giống sầu riêng.
- Theo dõi trạng thái hồ sơ và ghi nhật ký canh tác.
- Lưu tạm nhật ký trên IndexedDB khi mất kết nối.
- Xem cửa hàng, tìm vật tư, quản lý giỏ hàng và đặt hàng.
- Theo dõi trạng thái các đơn mua.

### Trưởng ban quản lý vùng trồng (`AREA_MANAGER`)

- Đăng ký hồ sơ tổ chức và vùng phụ trách.
- Xem dashboard, vườn và nông dân trong phạm vi được phân công.
- Duyệt, yêu cầu bổ sung, từ chối, cập nhật, khóa hoặc xóa mềm hồ sơ nông dân.
- Theo dõi thông tin và nhật ký của từng vườn.

### Chủ cửa hàng vật tư (`STORE_OWNER`)

- Đăng ký hồ sơ cửa hàng và tải giấy tờ chứng minh.
- Quản lý hồ sơ, sản phẩm, tồn kho và đơn hàng của cửa hàng.
- Thêm, chỉnh sửa hoặc ẩn sản phẩm.
- Sản phẩm mới được đăng bán ngay sau khi thêm, **không cần Admin duyệt sản phẩm**.
- Chỉ cửa hàng đã được duyệt mới có thể đăng sản phẩm và kinh doanh.

### Quản trị viên (`ADMIN`)

- Quản lý và duyệt tài khoản, bao gồm hồ sơ chủ cửa hàng.
- Quản lý cửa hàng, hồ sơ và giấy tờ liên quan.
- Quản lý tình trạng canh tác và nhật ký của các vườn.
- Quản lý danh mục thuốc bảo vệ thực vật và hóa chất cấm.
- Quản lý tài liệu và tin tức.
- Admin không tham gia quy trình duyệt từng sản phẩm của cửa hàng.

### Nội dung công khai

- Trang chủ, tin tức và tài liệu.
- Danh mục phân bón, thuốc bảo vệ thực vật và cửa hàng được duyệt.
- Chi tiết sản phẩm và thông tin phục vụ mua hàng.
- Service Worker, manifest, trang offline và banner cài đặt PWA.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Framework | Next.js 14.2 App Router, React 18 |
| Ngôn ngữ | TypeScript |
| UI | Tailwind CSS, Lucide React, component nội bộ |
| Xác thực | NextAuth Credentials, JWT session, bcryptjs |
| Database | PostgreSQL 16, Prisma 5 |
| Validation | Zod, react-hook-form |
| Offline | Service Worker, IndexedDB (`idb`) |

## Cấu trúc thư mục

```text
.github/workflows/     # GitHub Actions CI
docs/                  # Tài liệu vận hành
prisma/
  migrations/          # Lịch sử migration database
  schema.prisma        # Mô hình dữ liệu Prisma
  seed.ts              # Tài khoản và dữ liệu mẫu
public/                # Tài nguyên tĩnh và PWA
scripts/               # Script import/seed dữ liệu
src/
  app/                 # Page và Route Handler
  components/          # UI và component nghiệp vụ
  lib/                 # Auth, Prisma, validation và tiện ích
  types/               # Khai báo TypeScript
.storage/              # File upload cục bộ, không commit
middleware.ts          # Bảo vệ và phân quyền route
```

## Cài đặt

### Yêu cầu

- Node.js 20 khuyến nghị (tối thiểu Node.js 18).
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

Docker Compose ánh xạ PostgreSQL sang cổng `5433` trên máy host.

### 3. Cấu hình môi trường

Sao chép `.env.example` thành `.env.local` và thay các secret:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/triviet"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
AUTH_JWT_SECRET="replace-with-a-different-long-random-secret"
STORE_DOCUMENT_SIGNING_SECRET="replace-with-a-long-random-document-signing-secret"
```

### 4. Khởi tạo database

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

### 5. Chạy ứng dụng

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Tài khoản mẫu

| Vai trò | Tài khoản | Mật khẩu |
|---|---|---|
| Admin | `0348110676` hoặc `admin@triviet.vn` | `Admin@123` |
| Trưởng ban | `0909123456` hoặc `truongban.trian@triviet.vn` | `Truongban@123` |
| Chủ cửa hàng | `0909000001` hoặc `store.owner@triviet.vn` | `123456` |

Không sử dụng các mật khẩu mẫu trong môi trường production.

## Lệnh npm

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Chạy development server |
| `npm run build` | Tạo production build |
| `npm run start` | Chạy production server sau khi build |
| `npm run lint` | Kiểm tra ESLint |
| `npm run typecheck` | Kiểm tra TypeScript |
| `npm run prisma:generate` | Sinh Prisma Client |
| `npm run prisma:migrate` | Tạo/chạy migration development |
| `npm run prisma:migrate:deploy` | Chạy migration đã commit trên staging/production |
| `npm run db:start` | Khởi động PostgreSQL bằng Docker Compose |
| `npm run db:stop` | Dừng PostgreSQL container |
| `npm run seed` | Nạp tài khoản và dữ liệu mẫu |
| `npm run seed:materials` | Nạp danh mục vật tư mẫu |
| `npm run seed:prohibited-chemicals` | Nạp danh mục hóa chất cấm |
| `npm run import:prohibited-chemicals` | Nhập hóa chất cấm từ Excel |
| `npm run seed:store-marketplace` | Nạp cửa hàng, sản phẩm và tài khoản chủ cửa hàng mẫu |
| `npm run migrate:legacy-news` | Nhập dữ liệu tin tức cũ |

## Route giao diện chính

| Route | Quyền | Nội dung |
|---|---|---|
| `/`, `/documents`, `/news` | Công khai | Trang chủ và nội dung công khai |
| `/register/farmer` | Công khai | Đăng ký nông dân |
| `/register/area-manager` | Công khai | Đăng ký Trưởng ban |
| `/register/store-owner` | Công khai | Đăng ký chủ cửa hàng |
| `/materials/*` | Người dùng phù hợp | Danh mục vật tư, cửa hàng và sản phẩm |
| `/cart`, `/checkout`, `/orders` | Nông dân | Giỏ hàng, đặt hàng và lịch sử mua |
| `/dashboard/farmer/*` | Nông dân | Dashboard và nhật ký canh tác |
| `/dashboard/area-manager` | Trưởng ban | Dashboard theo vùng |
| `/region-manager/farmers` | Trưởng ban | Quản lý hồ sơ nông dân |
| `/region-manager/gardens` | Trưởng ban | Quản lý vườn trong vùng |
| `/dashboard/store` | Chủ cửa hàng | Tổng quan cửa hàng |
| `/dashboard/store/profile` | Chủ cửa hàng | Hồ sơ cửa hàng |
| `/dashboard/store/products` | Chủ cửa hàng | Thêm, sửa và ẩn sản phẩm |
| `/dashboard/store/orders` | Chủ cửa hàng | Quản lý đơn hàng |
| `/dashboard/admin/accounts` | Admin | Quản lý tài khoản và duyệt hồ sơ |
| `/dashboard/admin/stores` | Admin | Quản lý cửa hàng |
| `/dashboard/admin/farming` | Admin | Quản lý canh tác |
| `/dashboard/admin/master-data/pesticides` | Admin | Danh mục thuốc và hóa chất cấm |
| `/dashboard/admin/news` | Admin | Quản lý tin tức |

## Nhóm API chính

| Nhóm | Endpoint tiêu biểu |
|---|---|
| Xác thực | `/api/auth/[...nextauth]`, `/api/auth/login`, `/api/auth/me` |
| Đăng ký | `/api/auth/register`, `/api/auth/register/area-manager`, `/api/auth/register/store-owner` |
| Nông dân | `/api/farming-logs`, `/api/cart`, `/api/orders/*` |
| Trưởng ban | `/api/region-manager/farmers` |
| Cửa hàng | `/api/store/profile`, `/api/store/products/*`, `/api/store/orders/*` |
| Marketplace | `/api/marketplace/products` |
| Admin | `/api/admin/accounts`, `/api/admin/stores/*`, `/api/admin/farming/*`, `/api/admin/master-data/*` |
| Nội dung | `/api/documents/*`, `/api/admin/documents/*`, `/api/admin/news/*` |
| Hệ thống | `/api/health`, `/api/growing-regions/match` |

## Mô hình dữ liệu

- Tài khoản và duyệt hồ sơ: `User`, `AreaManagerApplication`, `ApprovalHistory`, `Notification`.
- Vùng và canh tác: `GrowingRegion`, `Farm`, `FarmingLog`.
- Cửa hàng: `Store`, `StoreDocument`, `StoreAuditLog`.
- Marketplace: `StoreProduct`, `CartItem`, `Order`, `OrderItem`, `OrderStatusHistory`.
- Danh mục: `Pesticide`, `ProhibitedChemical`.
- Nội dung: `Document`, `NewsArticle`.

## Quy trình sản phẩm cửa hàng

1. Admin duyệt tài khoản và hồ sơ cửa hàng.
2. Chủ cửa hàng đã được duyệt thêm sản phẩm tại `/dashboard/store/products`.
3. API tạo sản phẩm với trạng thái `APPROVED`; sản phẩm xuất hiện ngay trên marketplace.
4. Chủ cửa hàng có thể chỉnh sửa hoặc ẩn sản phẩm mà không cần Admin duyệt lại.

Migration `202608070002_publish_pending_store_products` chuyển các sản phẩm cũ đang `PENDING_REVIEW` sang `APPROVED`.

## Kiểm tra chất lượng

GitHub Actions chạy khi push lên `main` hoặc tạo pull request:

1. Cài dependency bằng `npm ci`.
2. Kiểm tra và sinh Prisma Client.
3. Chạy TypeScript typecheck.
4. Tạo Next.js production build.

Có thể kiểm tra tại máy bằng:

```bash
npm run typecheck
npm run lint
npm run build
```

## Lưu ý vận hành

- Chạy `npm run prisma:migrate:deploy` trước khi khởi động phiên bản mới trên staging/production.
- File tài liệu và hồ sơ cửa hàng trong `.storage` cần persistent volume khi triển khai container.
- Đổi toàn bộ secret và mật khẩu mẫu trước khi triển khai thực tế.
- Endpoint `/api/health` kiểm tra ứng dụng và kết nối database.
- Xem checklist tại [`docs/production-readiness.md`](docs/production-readiness.md).
