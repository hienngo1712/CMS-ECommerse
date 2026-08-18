-- Đặt giá trị mặc định cho User để tạo tài khoản không phải truyền đủ 3 cột này.
-- Chỉ SET DEFAULT, không đổi kiểu và không đổi tên cột, nên dữ liệu cũ giữ nguyên.
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'staff';
ALTER TABLE "User" ALTER COLUMN "isActive" SET DEFAULT true;
ALTER TABLE "User" ALTER COLUMN "isDeleted" SET DEFAULT false;
