# Master Data & Account Approval Implementation

## Phase 1: Prisma Schema & Migration
- [x] Add models: DurianVariety, Pesticide (with GaccChemicalStatus enum), Fertilizer
- [x] Run: prisma format, generate, db push
- [x] Update seed.ts — seeded successfully

## Phase 2: Zod Validation Schemas
- [x] Create src/lib/validations/master-data.ts

## Phase 3: Admin API Routes
- [x] Create /api/admin/master-data/durian-varieties/ (route.ts + [id]/route.ts)
- [x] Create /api/admin/master-data/pesticides/ (route.ts + [id]/route.ts)
- [x] Create /api/admin/master-data/fertilizers/ (route.ts + [id]/route.ts)
- [x] Create /api/admin/accounts/route.ts (list pending, approve, reject)

## Phase 4: Public API Routes (Dropdowns)
- [x] Create /api/master-data/durian-varieties/route.ts
- [x] Create /api/master-data/pesticides/route.ts
- [x] Create /api/master-data/fertilizers/route.ts

## Phase 5: Reusable Components
- [x] Create status-badge.tsx, gacc-status-badge.tsx
- [x] Create confirm-action-dialog.tsx
- [x] Create master-data-card.tsx, master-data-table.tsx
- [x] Create durian-variety-form.tsx, pesticide-form.tsx, fertilizer-form.tsx

## Phase 6: Admin Pages
- [x] Create /dashboard/admin/master-data/page.tsx (overview)
- [x] Create /dashboard/admin/master-data/durian-varieties/page.tsx
- [x] Create /dashboard/admin/master-data/pesticides/page.tsx
- [x] Create /dashboard/admin/master-data/fertilizers/page.tsx
- [x] Create /dashboard/admin/accounts/page.tsx (approve/reject accounts)

## Phase 7: Account Approval Flow
- [x] Update register route → auto-create notification for all Admins
- [x] Update navbar → add "Duyệt tài khoản" link with pending count badge
- [x] Auto-refresh pending count every 30 seconds
- [x] Approve/Reject with confirmation dialog and reason input
- [x] Notify user when approved/rejected

## Phase 8: Integration
- [x] Update navbar.tsx → add Master Data link ("Danh mục")
- [ ] Update register page → fetch durian varieties from API (future)
- [ ] Update farming-log form → use pesticide/fertilizer dropdowns (future)
- [ ] Update farming-logs API → check GACC status against Pesticide model (future)

## Phase 9: Build & Fix
- [ ] Run TypeScript check / build
- [ ] Fix any errors

