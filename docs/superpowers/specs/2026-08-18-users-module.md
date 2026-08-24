# Spec: Module Users

Ngày: 2026-08-18
Trạng thái: đã xong — 20 test ở `be/tests/users.test.js`, đã kiểm tra trên trình
duyệt bằng cả tài khoản admin lẫn staff

## Bối cảnh

Menu "Users" ở sidebar trỏ vào `/users` — một route không tồn tại, bấm vào ra
trang trắng. Sau [module Auth](./2026-08-18-auth-module.md), cách duy nhất để
thêm người dùng là chạy `node prisma/seed-admin.js` ở máy chủ.

## Phạm vi

Trong phạm vi: danh sách, tạo, sửa, đổi mật khẩu, khoá, xoá mềm người dùng.

Ngoài phạm vi: người dùng tự đổi mật khẩu của mình, quên mật khẩu, lịch sử đăng
nhập.

## Quyết định thiết kế

### QĐ-1: Chỉ `role = "admin"` mới vào được module này

Đây là lần đầu dự án phân quyền theo role — spec Auth đã ghi `role` mới chỉ
được lưu chứ chưa chặn ở đâu. Thêm middleware `requireRole("admin")` dùng sau
`requireAuth`.

Bắt buộc phải có: không chặn thì một tài khoản `staff` tự nâng mình lên `admin`
được, và toàn bộ phân quyền sau này thành vô nghĩa.

`requireRole` trả `403` (đã biết bạn là ai, nhưng không đủ quyền), khác với
`401` của `requireAuth` (chưa biết bạn là ai).

### QĐ-2: Không tự khoá và không tự xoá chính mình

`PUT /api/users/:id` với `id` là chính mình mà đổi `isActive` thành `false`
hoặc đổi `role` khỏi `admin` → `400`. `DELETE` chính mình → `400`.

Lý do rất cụ thể: admin duy nhất tự khoá mình là mất quyền vào CMS vĩnh viễn,
chỉ chữa được bằng cách chạy lại seed script ở máy chủ.

Đây không phải hàng rào chống mọi trường hợp — hai admin vẫn có thể khoá lẫn
nhau. Nó chỉ chặn cái bẫy hay sập nhất.

### QĐ-3: Mật khẩu tối thiểu 8 ký tự, sửa thì để trống là giữ nguyên

`POST` bắt buộc có `password`. `PUT` thì `password` không bắt buộc: thiếu hoặc
chuỗi rỗng nghĩa là giữ mật khẩu cũ, có thì băm lại bằng bcrypt cost 10.

Không dùng cách "gửi lại hash cũ" — như vậy hash sẽ phải đi ra khỏi server một
lần, mà QĐ-4 spec Auth nói hash không bao giờ được rời khỏi server.

### QĐ-4: `password` không bao giờ có trong response

Mọi truy vấn user trả ra ngoài đều đi qua `select` liệt kê tường minh, không
dùng cách query hết rồi `delete user.password`.

### QĐ-5: Xoá mềm, và username/email vẫn bị giữ chỗ

`isDeleted = true`, không xoá bản ghi, vì `Order.userId` trỏ vào `User`.

**Cập nhật 2026-08-19 — đã chữa.** Lúc viết spec này `username` và `email` là
`@unique` trên toàn bảng, nên người đã xoá giữ chỗ hai giá trị đó mãi mãi.

Migration `20260819000000_partial_unique_soft_delete` thay ba ràng buộc
(`Category.slug`, `User.username`, `User.email`) bằng **unique một phần** chỉ
áp dụng cho `isDeleted = false`. Xoá mềm giờ giải phóng giá trị.

Trùng với một bản ghi **đang hoạt động** vẫn đụng `P2002` và vẫn trả `400` với
câu nói rõ cột nào, chứ không rơi xuống `500`.

Đánh đổi: Prisma không diễn tả được unique một phần, nên ba index đó không có
mặt trong `schema.prisma` và `prisma migrate dev` sẽ coi chúng là drift rồi sinh
migration xoá đi. Chỉ dùng `prisma migrate deploy`, hoặc đọc kỹ migration mà
`migrate dev` sinh ra trước khi áp dụng.

Kéo theo: `username` không còn là khoá unique nên `findUnique`/`upsert`/`update`
theo `username` không dùng được nữa — `seed-admin.js` đã đổi sang
`findFirst` rồi `create`/`update` theo `id`.

### QĐ-6: Kế thừa envelope lỗi

`{ error: string }` kèm `details` khi là lỗi kiểm tra đầu vào. `500` luôn trả
đúng chuỗi `"Internal server error"`.

## Hợp đồng API

Mọi route đều cần token **và** `role = "admin"`.

### GET /api/users

Query: `page`, `limit`, `search` (khớp `username` hoặc `email`), `role`, `isActive`.

- `200` → `{ data: [...], meta: { total, page, limit, pageCount } }`

### GET /api/users/:id

- `200` → `{ id, username, email, role, isActive }`
- `400` id không phải số · `404` không tồn tại

### POST /api/users

Body: `{ username, email, password, role?, isActive? }`

- `201` → user vừa tạo
- `400` → payload sai, hoặc username/email đã tồn tại

### PUT /api/users/:id

Body: `{ username, email, role, isActive, password? }`

- `200` → user sau khi sửa
- `400` → payload sai, trùng username/email, hoặc tự khoá/tự hạ quyền chính mình
- `404` → không tồn tại

### DELETE /api/users/:id

- `200` → `{ msg: "User deleted" }`
- `400` → id không hợp lệ, hoặc tự xoá chính mình
- `404` → không tồn tại

## Quy tắc kiểm tra đầu vào

| Trường | Quy tắc |
|---|---|
| `username` | bắt buộc, trim không rỗng, tối đa 50 ký tự |
| `email` | bắt buộc, có `@` và có dấu chấm sau `@` |
| `password` | POST bắt buộc, tối thiểu 8 ký tự. PUT không bắt buộc |
| `role` | nếu có thì thuộc `admin`, `staff` |
| `isActive` | nếu có thì là boolean |

## Tiêu chí nghiệm thu

1. Mọi route trả `401` khi không token
2. Tài khoản `staff` gọi bất kỳ route nào → `403`
3. Response của `POST`, `PUT`, `GET` đều không chứa `password`
4. Mật khẩu được lưu dưới dạng hash, và đăng nhập bằng user vừa tạo chạy được
5. `PUT` không gửi `password` thì mật khẩu cũ vẫn dùng đăng nhập được
6. `PUT` có `password` mới thì mật khẩu cũ hết tác dụng, mật khẩu mới dùng được
7. Tự khoá mình (`isActive: false`) → `400`; tự hạ role khỏi `admin` → `400`
8. Tự xoá mình → `400`
9. Tạo trùng `username` hoặc `email` của người **đang hoạt động** → `400` với
   câu rõ ràng, không phải `500`
10. Tạo lại username của người **đã xoá mềm** → `201`, và bản ghi cũ vẫn nằm
    nguyên đó với `isDeleted = true` (không hồi sinh bản cũ).
    Tiêu chí này ngược lại với bản đầu, xem QĐ-5
11. `DELETE` là xoá mềm: bản ghi còn, `isDeleted = true`, và không còn trong `GET`
12. Người đã xoá mềm không đăng nhập được nữa
13. Trên trình duyệt: tạo, sửa, khoá, xoá người dùng chạy thông
