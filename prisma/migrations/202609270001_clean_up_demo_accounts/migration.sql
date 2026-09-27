BEGIN;

-- Retain foreign-key history while removing the explicitly retired demo Admin.
UPDATE "User"
SET "deletedAt" = COALESCE("deletedAt", CURRENT_TIMESTAMP),
    "isLocked" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "role" = 'ADMIN' AND "email" = 'admin@triviet.local' AND "phone" = '0909100001'
  AND ("deletedAt" IS NULL OR "isLocked" = false);

-- Replace only the exact placeholder names; keep IDs, passwords and relationships.
UPDATE "User" AS account
SET "fullName" = names.new_name, "updatedAt" = CURRENT_TIMESTAMP
FROM (VALUES
    ('Nông dân Demo 1', 'Nguyễn Văn Hải'),
    ('Nông dân Demo 2', 'Trần Hữu Phúc'),
    ('Nông dân Demo 3', 'Lê Thị Hồng'),
    ('Nông dân Demo 4', 'Phạm Văn Hòa'),
    ('Nông dân Demo 5', 'Đặng Thị Thu'),
    ('Nông dân Demo 6', 'Hoàng Minh Đức')
) AS names(old_name, new_name)
WHERE account."role" = 'FARMER' AND account."fullName" = names.old_name;

COMMIT;
