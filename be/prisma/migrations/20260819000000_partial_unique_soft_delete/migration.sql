-- Unique CHỈ áp dụng cho bản ghi chưa xoá mềm.
--
-- Trước đây slug/username/email là unique trên toàn bảng, nên xoá mềm một bản
-- ghi là giá trị đó bị giữ chỗ vĩnh viễn: xoá danh mục "ao-nam" xong không bao
-- giờ tạo lại được danh mục cùng slug.
--
-- CẢNH BÁO: Prisma không diễn tả được unique một phần trong schema.prisma, nên
-- ba index dưới đây KHÔNG có mặt trong file schema. Chạy `prisma migrate dev`
-- sẽ coi chúng là drift và sinh migration xoá đi. Chỉ dùng `prisma migrate
-- deploy`, hoặc kiểm lại migration mà `migrate dev` sinh ra trước khi áp dụng.

DROP INDEX IF EXISTS "Category_slug_key";
CREATE UNIQUE INDEX "Category_slug_active_key"
  ON "Category" ("slug")
  WHERE "isDeleted" = false;

DROP INDEX IF EXISTS "User_username_key";
CREATE UNIQUE INDEX "User_username_active_key"
  ON "User" ("username")
  WHERE "isDeleted" = false;

DROP INDEX IF EXISTS "User_email_key";
CREATE UNIQUE INDEX "User_email_active_key"
  ON "User" ("email")
  WHERE "isDeleted" = false;
