# Rà soát danh mục phân quyền và route — 08/09/2026

## Kết quả

- Đối chiếu 16 phân hệ với các trang, component giao diện và handler API trong mã nguồn.
- Danh mục sau cập nhật: 43 chức năng, 119 mã quyền riêng biệt theo đúng cấu trúc chuẩn hóa.
- Tách riêng phân hệ TÀI LIỆU và TIN TỨC & CẢNH BÁO thành 2 phân hệ độc lập.
- Gom các chức năng xuất hàng, QR truy xuất, China Port và xuất bán thương mại vào phân hệ XUẤT HÀNG & TRUY XUẤT.
- Gom phân hệ VÙNG TRỒNG & NÔNG HỘ (Vùng trồng, Vườn thuộc vùng, Nông hộ toàn hệ thống).
- Phân tách độc lập các quyền: Chỉnh sửa tài khoản & Khóa/Mở khóa; Cập nhật hồ sơ & Đổi mật khẩu; Chỉnh sửa Role & Cập nhật quyền Role.
- Bỏ quyền ADMIN_FARM_APPROVE để đồng bộ danh mục chuẩn hóa.
- Mỗi quyền có danh sách route, phân loại trang/API/thao tác tại trình duyệt,
  phương thức HTTP, thông tin phân biệt thao tác và đường dẫn source để đối chiếu.
  Hộp thoại dùng API hiện có; in/CSV dùng xử lý phía trình duyệt, không có endpoint giả.
- Trang phân quyền hiển thị chi tiết này và hỗ trợ tìm theo route/phương thức/thao tác.

## Trang đã bỏ

Không tìm thấy liên kết giao diện còn sử dụng bốn trang này sau khi cập nhật danh mục:

| Trang đã bỏ | Trang đang dùng |
|---|---|
| `/dashboard/farmer/finance` | `/dashboard/farmer/statistics/pesticides` và hai tab thống kê còn lại |
| `/statistics` | `/dashboard/farmer/statistics/pesticides` và hai tab thống kê còn lại |
| `/weather` | `/dashboard/farmer/journal/weather` |
| `/dashboard/store/profile` | `/account` |

Các URL đã bỏ sẽ không còn phục vụ trang sau triển khai. Giữ route gốc nhật ký,
thống kê và các chuyển tiếp còn được navbar hoặc luồng tạo nhật ký sử dụng.
Chưa xóa API nền, cron, health check, đường dẫn tải tài liệu, QR công khai hoặc
các trang nghiệp vụ khác chỉ vì không xuất hiện trên menu.

## Cấu hình vai trò

Mã quyền không còn trong danh mục được lọc khi đọc cấu hình vai trò và khi lưu/khôi phục.
Không tự ghi dữ liệu vào cơ sở dữ liệu trong lần cập nhật này. Vai trò đã lưu không tự
được cấp các quyền mới; Admin chọn và lưu nếu cần. Các cấu hình mặc định được cập nhật
theo vai trò và chỉ chứa mã đang dùng. Không dùng route mới để tự nâng quyền tài khoản.

## Kiểm chứng và giới hạn

`scripts/check-permission-routes.cjs` kiểm tra mã trùng, nguồn giao diện, file route,
phương thức API, quyền mặc định, lọc cấu hình cũ và trang đã gỡ. Kiểm tra được đưa vào CI.

Kết quả: 5/5 kiểm tra danh mục đạt, TypeScript đạt, build production đạt
(114 trang được tạo ở bước static generation), `git diff --check` đạt.

Đây là rà soát tĩnh và chuẩn hóa danh mục; không phải xác nhận mọi API đã thực thi
đầy đủ từng mã quyền. Không thử thao tác tạo/sửa/xóa dữ liệu trên production.
Chưa kiểm tra trực tiếp bố cục và tương tác trong trình duyệt có phiên đăng nhập.
Không commit, push hoặc triển khai trong lần cập nhật này.


## Active route mapping

| Feature | Permission | Route / operation | UI source |
|---|---|---|---|
| Tổng quan hệ thống | DASHBOARD_VIEW | page GET /dashboard/admin<br>page GET /dashboard/farmer<br>page GET /dashboard/area-manager<br>page GET /dashboard/partner<br>page GET /dashboard/processing<br>page GET /dashboard/store | src/app/dashboard/admin/page.tsx<br>src/app/dashboard/farmer/page.tsx<br>src/app/dashboard/area-manager/page.tsx<br>src/app/dashboard/partner/page.tsx<br>src/app/dashboard/processing/page.tsx<br>src/app/dashboard/store/page.tsx |
| Nông hộ & Vườn trồng | FARM_PROFILE_VIEW | page GET /dashboard/farmer | src/app/dashboard/farmer/page.tsx |
| Nhật ký canh tác | FARMING_LOG_VIEW | page GET /dashboard/farmer/journal/cultivation<br>api GET /api/farming-logs | src/components/farmer/cultivation-logs-tab.tsx |
| Nhật ký canh tác | FARMING_LOG_CREATE | page GET /dashboard/farmer/logs/new<br>api POST /api/farming-logs | src/components/farmer/cultivation-logs-tab.tsx<br>src/app/dashboard/farmer/logs/new/page.tsx |
| Nhật ký thời tiết | WEATHER_LOG_VIEW | page GET /dashboard/farmer/journal/weather<br>api GET /api/weather-observations | src/components/weather/weather-journal.tsx |
| Nhật ký thời tiết | WEATHER_LOG_CREATE | api POST /api/weather-observations | src/components/weather/weather-journal.tsx |
| Nhật ký thời tiết | WEATHER_LOG_EDIT | api PUT /api/weather-observations/[id] | src/components/weather/weather-journal.tsx |
| Nhật ký thời tiết | WEATHER_LOG_DELETE | api DELETE /api/weather-observations/[id] | src/components/weather/weather-journal.tsx |
| Kế hoạch canh tác | FARMING_PLAN_VIEW | page GET /dashboard/farmer/plans<br>api GET /api/farming-plans | src/components/farming-plan-calendar.tsx |
| Kế hoạch canh tác | FARMING_PLAN_CREATE | api POST /api/farming-plans | src/components/farming-plan-calendar.tsx |
| Kế hoạch canh tác | FARMING_PLAN_EDIT | api PATCH /api/farming-plans/[id] | src/components/farming-plan-calendar.tsx |
| Kế hoạch canh tác | FARMING_PLAN_DELETE | api DELETE /api/farming-plans/[id] | src/components/farming-plan-calendar.tsx |
| Nhật ký sinh vật gây hại | PEST_MONITORING_VIEW | page GET /dashboard/farmer/journal/pests<br>api GET /api/farmer/pest-monitoring<br>api GET /api/farmer/pest-monitoring/[id] | src/components/farmer/pest-monitoring-tab.tsx |
| Nhật ký sinh vật gây hại | PEST_MONITORING_CREATE | api POST /api/farmer/pest-monitoring | src/components/farmer/pest-monitoring-tab.tsx |
| Nhật ký sinh vật gây hại | PEST_MONITORING_EDIT | api POST /api/farmer/pest-monitoring/[id]/traps<br>api POST /api/farmer/pest-monitoring/[id]/inspections<br>api POST /api/farmer/pest-monitoring/[id]/treatments | src/components/farmer/pest-monitoring-tab.tsx |
| Nhật ký sinh vật gây hại | PEST_MONITORING_EXPORT | client  /dashboard/farmer/journal/pests (In sổ theo dõi bằng window.print()) | src/components/farmer/pest-monitoring-tab.tsx |
| Thống kê Thuốc BVTV | FARMER_PESTICIDE_STATISTICS_VIEW | page GET /dashboard/farmer/statistics/pesticides<br>api GET /api/farmer/statistics | src/components/farmer/farmer-statistics-view.tsx |
| Thống kê Phân bón | FARMER_FERTILIZER_STATISTICS_VIEW | page GET /dashboard/farmer/statistics/fertilizers<br>api GET /api/farmer/statistics | src/components/farmer/farmer-statistics-view.tsx |
| Thống kê Chi phí | FARMER_EXPENSE_STATISTICS_VIEW | page GET /dashboard/farmer/statistics/expenses<br>api GET /api/farmer/statistics | src/components/farmer/farmer-statistics-view.tsx |
| Thống kê Chi phí | FARMER_EXPENSE_STATISTICS_CREATE | api POST /api/farmer/expenses | src/components/farmer/farmer-statistics-view.tsx |
| Phiếu thu hoạch | HARVEST_REQUEST_VIEW | page GET /dashboard/farmer/harvests<br>page GET /dashboard/farmer/harvests/[id] | src/components/farmer-harvests.tsx |
| Phiếu thu hoạch | HARVEST_REQUEST_CREATE | page GET /harvests/new<br>api POST /api/harvests | src/app/harvests/new/page.tsx |
| Phiếu thu hoạch | HARVEST_REQUEST_EDIT | api PATCH /api/harvests/[id] (action=START)<br>api PATCH /api/harvests/[id] (action=FINISH) | src/components/farmer-harvests.tsx |
| Bàn giao / Cân nhận tại vườn | HARVEST_DELIVERY_VIEW | page GET /dashboard/farmer/harvests/[id] | src/components/harvest-detail-view.tsx |
| Bàn giao / Cân nhận tại vườn | HARVEST_DELIVERY_EDIT | api PATCH /api/harvests/[id] (action=DELIVER) | src/components/farmer-harvests.tsx |
| Tiếp nhận phiếu thu hoạch | PROCUREMENT_INBOX_VIEW | page GET /dashboard/partner/harvests | src/components/partner-harvests.tsx |
| Tiếp nhận phiếu thu hoạch | PROCUREMENT_INBOX_APPROVE | api PATCH /api/harvests/[id] (action=CONFIRM)<br>api PATCH /api/harvests/[id] (action=REJECT)<br>api PATCH /api/harvests/[id] (action=RECEIVE) | src/components/partner-harvests.tsx |
| Đơn thu mua | PROCUREMENT_ORDER_VIEW | page GET /dashboard/partner/orders | src/app/dashboard/partner/orders/page.tsx |
| Lô thu gom | COLLECTION_LOT_VIEW | page GET /dashboard/partner/lots | src/app/dashboard/partner/lots/page.tsx |
| Tiếp nhận nguyên liệu | RAW_MATERIAL_VIEW | page GET /dashboard/processing/raw-materials | src/components/processing/processing-raw-materials-view.tsx |
| Tiếp nhận nguyên liệu | RAW_MATERIAL_CREATE | api PATCH /api/harvests/[id] (action=CONFIRM  /  REJECT) | src/components/processing/processing-raw-materials-view.tsx |
| Tiếp nhận nguyên liệu | RAW_MATERIAL_RECEIVE | api PATCH /api/harvests/[id] (action=RECEIVE) | src/components/processing/processing-raw-materials-view.tsx |
| Phân loại & Kiểm định QC | RAW_MATERIAL_CLASSIFY | api POST /api/processing/raw-materials/[id]/classify | src/components/processing/processing-raw-materials-view.tsx |
| Lô chế biến | PROCESSING_BATCH_VIEW | page GET /dashboard/processing/processing | src/components/processing/processing-production-view.tsx |
| Lô chế biến | PROCESSING_BATCH_CREATE | api POST /api/processing/production | src/components/processing/processing-production-view.tsx |
| Đóng gói thành phẩm tươi | FINISHED_LOT_VIEW | page GET /dashboard/processing/processing | src/components/processing/processing-production-view.tsx |
| Đóng gói thành phẩm tươi | FINISHED_LOT_CREATE | api POST /api/processing/fresh-packaging | src/components/processing/processing-production-view.tsx |
| Lô xuất hàng | SHIPMENT_VIEW | page GET /dashboard/processing/shipments | src/components/processing/processing-shipments-view.tsx |
| Lô xuất hàng | SHIPMENT_CREATE | api POST /api/processing/shipments | src/components/processing/processing-shipments-view.tsx |
| Lô xuất hàng | SHIPMENT_EXPORT | client  /dashboard/processing/shipments (In phiếu xuất hàng bằng window.print()) | src/components/processing/processing-shipments-view.tsx |
| QR truy xuất nguồn gốc | QR_MANAGE_VIEW | page GET /dashboard/farmer/traceability<br>page GET /dashboard/partner/traceability<br>page GET /dashboard/processing/traceability<br>page GET /dashboard/admin/traceability<br>page GET /dashboard/area-manager/traceability | src/app/dashboard/farmer/traceability/page.tsx<br>src/app/dashboard/partner/traceability/page.tsx<br>src/app/dashboard/processing/traceability/page.tsx<br>src/app/dashboard/admin/traceability/page.tsx<br>src/app/dashboard/area-manager/traceability/page.tsx |
| QR truy xuất nguồn gốc | QR_MANAGE_CREATE | api POST /api/traceability/codes | src/components/traceability/traceability-manager.tsx |
| QR truy xuất nguồn gốc | QR_MANAGE_EXPORT | client  /dashboard/processing/traceability (In hoặc tải ảnh QR) | src/components/processing/processing-qr-generator-view.tsx |
| China Port (Cổng hải quan GACC) | CHINA_PORT_VIEW | page GET /china-port<br>api POST /api/china-port/search | src/components/china-port/china-port-view.tsx |
| China Port (Cổng hải quan GACC) | CHINA_PORT_EXPORT | client  /china-port (Tải CSV tại trình duyệt) | src/components/china-port/china-port-view.tsx |
| Nhập / Xuất / Chuyển kho | WAREHOUSE_MOVE_VIEW | page GET /dashboard/store/inventory<br>page GET /dashboard/store/inventory/[code] | src/components/store/inventory-manager.tsx<br>src/components/store/inventory-document-view.tsx |
| Nhập / Xuất / Chuyển kho | WAREHOUSE_MOVE_CREATE | api POST /api/store/inventory | src/components/store/inventory-manager.tsx |
| Nhập / Xuất / Chuyển kho | WAREHOUSE_MOVE_EXPORT | client  /dashboard/store/inventory/[code] (In phiếu nhập/xuất kho) | src/components/store/inventory-document-view.tsx |
| Xuất bán thương mại | COMMERCIAL_DISPATCH_VIEW | page GET /dashboard/partner/traceability | src/components/traceability/traceability-manager.tsx |
| Xuất bán thương mại | COMMERCIAL_DISPATCH_CREATE | api POST /api/traceability/commercial-lots | src/components/traceability/traceability-manager.tsx |
| Xuất bán thương mại | COMMERCIAL_DISPATCH_EDIT | api PATCH /api/traceability/commercial-lots | src/components/traceability/traceability-manager.tsx |
| Xuất bán thương mại | COMMERCIAL_DISPATCH_EXPORT | client  /dashboard/partner/traceability (In phiếu xuất bán) | src/components/partner/sales-dispatch-slip.tsx |
| Sản phẩm vật tư | STORE_PRODUCT_VIEW | page GET /dashboard/store/products | src/components/store/store-products-manager.tsx |
| Sản phẩm vật tư | STORE_PRODUCT_CREATE | api POST /api/store/products | src/components/store/store-products-manager.tsx |
| Sản phẩm vật tư | STORE_PRODUCT_EDIT | api PATCH /api/store/products/[id] (Cập nhật sản phẩm hoặc status) | src/components/store/store-products-manager.tsx |
| Đơn đặt hàng từ nông dân | STORE_ORDER_VIEW | page GET /dashboard/store/orders | src/components/store/store-orders-manager.tsx |
| Đơn đặt hàng từ nông dân | STORE_ORDER_EDIT | api PATCH /api/store/orders/[id] (status=SHIPPING  /  COMPLETED) | src/components/store/store-orders-manager.tsx |
| Đơn đặt hàng từ nông dân | STORE_ORDER_APPROVE | api PATCH /api/store/orders/[id] (status=PREPARING  /  REJECTED) | src/components/store/store-orders-manager.tsx |
| Hồ sơ cửa hàng | STORE_PROFILE_VIEW | page GET /account | src/components/account/user-profile.tsx |
| Hồ sơ cửa hàng | STORE_PROFILE_EDIT | api PATCH /api/account (action=profile  /  facility) | src/components/account/user-profile.tsx |
| Tra cứu & Mua vật tư | MATERIAL_SHOPPING_VIEW | page GET /materials<br>page GET /materials/pesticides<br>page GET /materials/fertilizers<br>page GET /materials/stores<br>page GET /materials/products/[id] | src/app/materials/page.tsx<br>src/app/materials/pesticides/page.tsx<br>src/app/materials/fertilizers/page.tsx<br>src/app/materials/stores/page.tsx<br>src/app/materials/products/[id]/page.tsx |
| Giỏ hàng vật tư | SHOPPING_CART_VIEW | page GET /cart | src/app/cart/page.tsx |
| Giỏ hàng vật tư | SHOPPING_CART_CREATE | api POST /api/cart | src/components/store/product-purchase-actions.tsx |
| Giỏ hàng vật tư | SHOPPING_CART_EDIT | api PATCH /api/cart | src/app/cart/page.tsx |
| Giỏ hàng vật tư | SHOPPING_CART_DELETE | api DELETE /api/cart (query: id=[id]) | src/app/cart/page.tsx |
| Đơn mua của nông dân | SUPPLIES_ORDER_VIEW | page GET /orders<br>page GET /orders/[id] | src/app/orders/page.tsx<br>src/app/orders/[id]/page.tsx |
| Đơn mua của nông dân | SUPPLIES_ORDER_CREATE | page GET /checkout<br>api POST /api/orders | src/app/checkout/page.tsx |
| Đơn mua của nông dân | SUPPLIES_ORDER_DELETE | api PATCH /api/orders/[id] | src/components/orders/order-detail-actions.tsx |
| Tổng quan tài chính | FINANCE_DASHBOARD_VIEW | page GET /dashboard/partner/finance<br>page GET /dashboard/processing/finance<br>page GET /dashboard/store/finance | src/components/partner/partner-finance-manager.tsx<br>src/components/store/store-finance-dashboard.tsx |
| Chi phí & Thanh toán | EXPENSE_BOOK_VIEW | page GET /dashboard/partner/finance<br>page GET /dashboard/processing/finance<br>page GET /dashboard/store/finance | src/components/partner/partner-finance-manager.tsx<br>src/components/store/store-finance-dashboard.tsx |
| Chi phí & Thanh toán | EXPENSE_BOOK_CREATE | api POST /api/partner/finance<br>api POST /api/store/finance/expenses | src/components/partner/partner-finance-manager.tsx<br>src/components/store/store-finance-dashboard.tsx |
| Chi phí & Thanh toán | EXPENSE_BOOK_DELETE | api DELETE /api/store/finance/expenses (query: id=[id]) | src/components/store/store-finance-dashboard.tsx |
| Công nợ | DEBT_VIEW | page GET /dashboard/partner/finance<br>page GET /dashboard/processing/finance<br>page GET /dashboard/store/finance | src/components/partner/partner-finance-manager.tsx<br>src/components/store/store-finance-dashboard.tsx |
| Công nợ | DEBT_EDIT | api POST /api/partner/finance/payments<br>api PATCH /api/store/finance/orders/[id]/payment | src/components/partner/partner-finance-manager.tsx<br>src/components/store/store-finance-dashboard.tsx |
| Vùng trồng | GROWING_REGION_VIEW | page GET /dashboard/admin/regions | src/components/admin/growing-regions-manager.tsx |
| Vùng trồng | GROWING_REGION_CREATE | api POST /api/admin/growing-regions | src/components/admin/growing-regions-manager.tsx |
| Vùng trồng | GROWING_REGION_EDIT | api POST /api/admin/region-assignments (Thay đổi Trưởng ban) | src/components/admin/growing-regions-manager.tsx |
| Vùng trồng | GROWING_REGION_APPROVE | api PATCH /api/admin/growing-regions (status=ACTIVE  /  SUSPENDED) | src/components/admin/growing-regions-manager.tsx |
| Vườn trồng trong vùng | REGIONAL_GARDEN_VIEW | page GET /region-manager/gardens<br>page GET /region-manager/gardens/[gardenId]<br>page GET /region-manager/gardens/[gardenId]/logs | src/components/region-manager/gardens-manager.tsx<br>src/app/region-manager/gardens/[gardenId]/page.tsx<br>src/app/region-manager/gardens/[gardenId]/logs/page.tsx |
| Vườn trồng trong vùng | REGIONAL_GARDEN_APPROVE | api PATCH /api/region-manager/gardens/[gardenId]/status (action và reason) | src/components/region-manager/garden-actions.tsx |
| Quản lý nông hộ hệ thống | ADMIN_FARM_VIEW | page GET /dashboard/admin/farming<br>api GET /api/admin/farming/[farmId] | src/app/dashboard/admin/farming/page.tsx |
| Tài khoản người dùng | USER_ACCOUNT_VIEW | page GET /dashboard/admin/accounts | src/app/dashboard/admin/accounts/page.tsx |
| Tài khoản người dùng | USER_ACCOUNT_EDIT | api PATCH /api/admin/accounts (action=update) | src/app/dashboard/admin/accounts/page.tsx |
| Tài khoản người dùng | USER_ACCOUNT_LOCK | api PATCH /api/admin/accounts (action=lock  /  unlock) | src/app/dashboard/admin/accounts/page.tsx |
| Tài khoản người dùng | USER_ACCOUNT_DELETE | api DELETE /api/admin/accounts | src/app/dashboard/admin/accounts/page.tsx |
| Tài khoản người dùng | USER_ACCOUNT_APPROVE | api PATCH /api/admin/accounts (action=approve  /  reject  /  supplement) | src/app/dashboard/admin/accounts/page.tsx |
| Tài khoản nông dân | REGIONAL_FARMER_VIEW | page GET /region-manager/farmers | src/components/region-manager/farmer-accounts-manager.tsx |
| Tài khoản nông dân | REGIONAL_FARMER_CREATE | api POST /api/region-manager/farmers | src/components/region-manager/farmer-accounts-manager.tsx |
| Tài khoản nông dân | REGIONAL_FARMER_EDIT | api PATCH /api/region-manager/farmers (action=update) | src/components/region-manager/farmer-accounts-manager.tsx |
| Tài khoản nông dân | REGIONAL_FARMER_LOCK | api PATCH /api/region-manager/farmers (action=lock  /  unlock) | src/components/region-manager/farmer-accounts-manager.tsx |
| Tài khoản nông dân | REGIONAL_FARMER_APPROVE | api PATCH /api/region-manager/farmers (action=approve  /  reject  /  supplement) | src/components/region-manager/farmer-accounts-manager.tsx |
| Tài khoản nông dân | REGIONAL_FARMER_DELETE | api DELETE /api/region-manager/farmers | src/components/region-manager/farmer-accounts-manager.tsx |
| Tài khoản cá nhân | ACCOUNT_SECURITY_VIEW | page GET /account | src/components/account/user-profile.tsx |
| Tài khoản cá nhân | ACCOUNT_SECURITY_EDIT | api PATCH /api/account (action=profile) | src/components/account/user-profile.tsx |
| Tài khoản cá nhân | ACCOUNT_PASSWORD_EDIT | api PATCH /api/account (action=password) | src/components/account/user-profile.tsx |
| Vai trò & Quyền | ROLE_PERMISSION_VIEW | page GET /dashboard/admin/permissions | src/components/admin/admin-permission-manager.tsx |
| Vai trò & Quyền | ROLE_PERMISSION_CREATE | api POST /api/admin/permissions/roles | src/components/admin/admin-permission-manager.tsx |
| Vai trò & Quyền | ROLE_PERMISSION_EDIT | api PUT /api/admin/permissions (action=update_role_info) | src/components/admin/admin-permission-manager.tsx |
| Vai trò & Quyền | ROLE_PERMISSION_DELETE | api DELETE /api/admin/permissions (query: roleKey=[roleKey]) | src/components/admin/admin-permission-manager.tsx |
| Vai trò & Quyền | ROLE_PERMISSION_UPDATE | api PUT /api/admin/permissions (Lưu permissions)<br>api POST /api/admin/permissions/reset | src/components/admin/admin-permission-manager.tsx |
| Vai trò & Quyền | ROLE_PERMISSION_ASSIGN | api PUT /api/admin/permissions (action=assign_users  /  remove_user) | src/components/admin/admin-permission-manager.tsx |
| Danh mục hệ thống | MASTER_CATALOG_VIEW | page GET /dashboard/admin/catalog | src/components/admin/catalog-manager.tsx |
| Danh mục hệ thống | MASTER_CATALOG_CREATE | api POST /api/admin/catalog/varieties<br>api POST /api/admin/catalog/cultivation | src/components/admin/catalog-manager.tsx |
| Danh mục hệ thống | MASTER_CATALOG_EDIT | api PATCH /api/admin/catalog/varieties/[id] (Cập nhật tên, thứ tự hoặc isActive)<br>api PATCH /api/admin/catalog/cultivation/[id] (Cập nhật tên, thứ tự hoặc isActive) | src/components/admin/catalog-manager.tsx |
| Danh mục thuốc BVTV & Chất cấm | PESTICIDE_CATALOG_VIEW | page GET /dashboard/admin/master-data/pesticides | src/app/dashboard/admin/master-data/pesticides/page.tsx |
| Danh mục thuốc BVTV & Chất cấm | PESTICIDE_CATALOG_CREATE | api POST /api/admin/master-data/pesticides | src/components/admin/master-data/pesticide-form.tsx |
| Danh mục thuốc BVTV & Chất cấm | PESTICIDE_CATALOG_EDIT | api PATCH /api/admin/master-data/pesticides/[id] | src/components/admin/master-data/pesticide-form.tsx |
| Danh mục thuốc BVTV & Chất cấm | PESTICIDE_CATALOG_DELETE | api DELETE /api/admin/master-data/pesticides/[id] | src/app/dashboard/admin/master-data/pesticides/page.tsx |
| Tài liệu kỹ thuật | DOCUMENT_VIEW | page GET /documents<br>page GET /documents/[slug] | src/components/documents/documents-library.tsx<br>src/app/documents/[slug]/page.tsx |
| Tài liệu kỹ thuật | DOCUMENT_CREATE | api POST /api/admin/documents | src/components/documents/documents-library.tsx |
| Tài liệu kỹ thuật | DOCUMENT_EDIT | api PATCH /api/admin/documents/[id] (action=restore  /  publish  /  unpublish) | src/components/documents/documents-library.tsx |
| Tài liệu kỹ thuật | DOCUMENT_DELETE | api PATCH /api/admin/documents/[id] (action=delete)<br>api DELETE /api/admin/documents/[id] (Xóa vĩnh viễn) | src/components/documents/documents-library.tsx |
| Tài liệu kỹ thuật | DOCUMENT_EXPORT | api GET /api/documents/[slug]/download | src/components/documents/documents-library.tsx |
| Tin tức & Cảnh báo | NEWS_VIEW | page GET /news<br>page GET /dashboard/admin/news | src/app/news/page.tsx<br>src/components/admin/news-manager.tsx |
| Tin tức & Cảnh báo | NEWS_CREATE | api POST /api/admin/news | src/components/admin/news-manager.tsx |
| Tin tức & Cảnh báo | NEWS_EDIT | api PATCH /api/admin/news/[id] | src/components/admin/news-manager.tsx |
| Tin tức & Cảnh báo | NEWS_DELETE | api DELETE /api/admin/news/[id] | src/components/admin/news-manager.tsx |

## Retired catalog entries

| Previous feature | Retired key | Previous path |
|---|---|---|
| Nông hộ & Vườn trồng | FARM_PROFILE_CREATE | /dashboard/farmer |
| Nông hộ & Vườn trồng | FARM_PROFILE_EDIT | /dashboard/farmer |
| Nông hộ & Vườn trồng | FARM_PROFILE_DELETE | /dashboard/farmer |
| Nông hộ & Vườn trồng | FARM_PROFILE_APPROVE | /dashboard/farmer |
| Nông hộ & Vườn trồng | FARM_PROFILE_EXPORT | /dashboard/farmer |
| Nhật ký canh tác | FARMING_LOG_EDIT | /dashboard/farmer/journal/cultivation |
| Nhật ký canh tác | FARMING_LOG_DELETE | /dashboard/farmer/journal/cultivation |
| Nhật ký canh tác | FARMING_LOG_APPROVE | /dashboard/farmer/journal/cultivation |
| Nhật ký canh tác | FARMING_LOG_EXPORT | /dashboard/farmer/journal/cultivation |
| Kế hoạch canh tác | FARMING_PLAN_EXPORT | /dashboard/farmer/plans |
| Nhật ký sinh vật gây hại | PEST_MONITORING_APPROVE | /dashboard/farmer/journal/pests |
| Phiếu thu hoạch | HARVEST_REQUEST_DELETE | /dashboard/farmer/harvests |
| Phiếu thu hoạch | HARVEST_REQUEST_EXPORT | /dashboard/farmer/harvests |
| Bàn giao / Cân nhận tại vườn | HARVEST_DELIVERY_APPROVE | /dashboard/farmer/harvests |
| Bàn giao / Cân nhận tại vườn | HARVEST_DELIVERY_EXPORT | /dashboard/farmer/harvests |
| Tiếp nhận phiếu thu hoạch | PROCUREMENT_INBOX_EXPORT | /dashboard/partner/harvests |
| Đơn thu mua | PROCUREMENT_ORDER_CREATE | /dashboard/partner/orders |
| Đơn thu mua | PROCUREMENT_ORDER_EDIT | /dashboard/partner/orders |
| Đơn thu mua | PROCUREMENT_ORDER_DELETE | /dashboard/partner/orders |
| Đơn thu mua | PROCUREMENT_ORDER_APPROVE | /dashboard/partner/orders |
| Đơn thu mua | PROCUREMENT_ORDER_EXPORT | /dashboard/partner/orders |
| Kiểm tra chất lượng (QC thu mua) | PROCUREMENT_QC_VIEW | /dashboard/partner/orders |
| Kiểm tra chất lượng (QC thu mua) | PROCUREMENT_QC_CREATE | /dashboard/partner/orders |
| Kiểm tra chất lượng (QC thu mua) | PROCUREMENT_QC_EDIT | /dashboard/partner/orders |
| Kiểm tra chất lượng (QC thu mua) | PROCUREMENT_QC_APPROVE | /dashboard/partner/orders |
| Kiểm tra chất lượng (QC thu mua) | PROCUREMENT_QC_EXPORT | /dashboard/partner/orders |
| Lô thu gom | COLLECTION_LOT_CREATE | /dashboard/partner/lots |
| Lô thu gom | COLLECTION_LOT_EDIT | /dashboard/partner/lots |
| Lô thu gom | COLLECTION_LOT_DELETE | /dashboard/partner/lots |
| Lô thu gom | COLLECTION_LOT_APPROVE | /dashboard/partner/lots |
| Lô thu gom | COLLECTION_LOT_EXPORT | /dashboard/partner/lots |
| Tiếp nhận nguyên liệu | RAW_MATERIAL_EDIT | /dashboard/processing/raw-materials |
| Tiếp nhận nguyên liệu | RAW_MATERIAL_EXPORT | /dashboard/processing/raw-materials |
| Phân loại & Kiểm định QC | RAW_MATERIAL_EDIT | /dashboard/processing/raw-materials |
| Phân loại & Kiểm định QC | RAW_MATERIAL_APPROVE | /dashboard/processing/raw-materials |
| Phân loại & Kiểm định QC | RAW_MATERIAL_EXPORT | /dashboard/processing/raw-materials |
| Lô chế biến | PROCESSING_BATCH_EDIT | /dashboard/processing/processing |
| Lô chế biến | PROCESSING_BATCH_DELETE | /dashboard/processing/processing |
| Lô chế biến | PROCESSING_BATCH_APPROVE | /dashboard/processing/processing |
| Lô chế biến | PROCESSING_BATCH_EXPORT | /dashboard/processing/processing |
| Kiểm tra chất lượng thành phẩm (QC) | PROCESSING_QC_VIEW | /dashboard/processing/processing |
| Kiểm tra chất lượng thành phẩm (QC) | PROCESSING_QC_CREATE | /dashboard/processing/processing |
| Kiểm tra chất lượng thành phẩm (QC) | PROCESSING_QC_EDIT | /dashboard/processing/processing |
| Kiểm tra chất lượng thành phẩm (QC) | PROCESSING_QC_APPROVE | /dashboard/processing/processing |
| Kiểm tra chất lượng thành phẩm (QC) | PROCESSING_QC_EXPORT | /dashboard/processing/processing |
| Đóng gói lô thành phẩm | FINISHED_LOT_EDIT | /dashboard/processing/finished-products |
| Đóng gói lô thành phẩm | FINISHED_LOT_COMPLETE | /dashboard/processing/finished-products |
| Đóng gói lô thành phẩm | FINISHED_LOT_EXPORT | /dashboard/processing/finished-products |
| Lô xuất hàng | SHIPMENT_EDIT | /dashboard/processing/shipments |
| Lô xuất hàng | SHIPMENT_DELETE | /dashboard/processing/shipments |
| Lô xuất hàng | SHIPMENT_APPROVE | /dashboard/processing/shipments |
| QR truy xuất nguồn gốc | QR_MANAGE_EDIT | /dashboard/farmer/traceability |
| QR truy xuất nguồn gốc | QR_MANAGE_APPROVE | /dashboard/farmer/traceability |
| China Port (Cổng hải quan GACC) | CHINA_PORT_SYNC | /china-port |
| Nhập / Xuất / Chuyển kho | WAREHOUSE_MOVE_EDIT | /dashboard/store/inventory |
| Nhập / Xuất / Chuyển kho | WAREHOUSE_MOVE_APPROVE | /dashboard/store/inventory |
| Xuất bán thương mại | COMMERCIAL_DISPATCH_DELETE | /dashboard/partner/lots |
| Xuất bán thương mại | COMMERCIAL_DISPATCH_APPROVE | /dashboard/partner/lots |
| Sản phẩm vật tư | STORE_PRODUCT_DELETE | /dashboard/store/products |
| Sản phẩm vật tư | STORE_PRODUCT_EXPORT | /dashboard/store/products |
| Đơn đặt hàng từ nông dân | STORE_ORDER_EXPORT | /dashboard/store/orders |
| Tổng quan tài chính | FINANCE_DASHBOARD_EXPORT | /dashboard/partner/finance |
| Chi phí & Thanh toán | EXPENSE_BOOK_EDIT | /dashboard/partner/finance |
| Chi phí & Thanh toán | EXPENSE_BOOK_APPROVE | /dashboard/partner/finance |
| Chi phí & Thanh toán | EXPENSE_BOOK_EXPORT | /dashboard/partner/finance |
| Công nợ | DEBT_CREATE | /dashboard/partner/finance |
| Công nợ | DEBT_APPROVE | /dashboard/partner/finance |
| Công nợ | DEBT_EXPORT | /dashboard/partner/finance |
| Vùng trồng | GROWING_REGION_DELETE | /dashboard/admin/regions |
| Vùng trồng | GROWING_REGION_EXPORT | /dashboard/admin/regions |
| Quản lý nông hộ hệ thống | ADMIN_FARM_CREATE | /dashboard/admin/farming |
| Quản lý nông hộ hệ thống | ADMIN_FARM_EDIT | /dashboard/admin/farming |
| Quản lý nông hộ hệ thống | ADMIN_FARM_DELETE | /dashboard/admin/farming |
| Quản lý nông hộ hệ thống | ADMIN_FARM_EXPORT | /dashboard/admin/farming |
| Tài khoản người dùng | USER_ACCOUNT_CREATE | /dashboard/admin/accounts |
| Tài khoản người dùng | USER_ACCOUNT_EXPORT | /dashboard/admin/accounts |
| Phân quyền hệ thống | ROLE_PERMISSION_EXPORT | /dashboard/admin/permissions |
| Danh mục hệ thống | MASTER_CATALOG_DELETE | /dashboard/admin/catalog |
| Danh mục hệ thống | MASTER_CATALOG_APPROVE | /dashboard/admin/catalog |
| Danh mục hệ thống | MASTER_CATALOG_EXPORT | /dashboard/admin/catalog |
| Tin tức & Cảnh báo | NEWS_APPROVE | /news |
