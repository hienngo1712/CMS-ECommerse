# Spec: Module Auth

Ngày: 2026-08-18
Trạng thái: đã xong — 16 test ở `be/tests/auth.test.js`, đã kiểm tra trên trình duyệt

## Bối cảnh

API hiện không có xác thực. Bất kỳ ai gọi được `localhost:3002` đều tạo/sửa/xoá
được sản phẩm và danh mục. Schema đã có bảng `User` từ đầu nhưng chưa có
controller, route hay UI nào dùng tới.

Auth phải làm trước Orders, vì `Order.userId` trỏ vào `User` — không có cơ chế
đăng nhập thì không biết đơn hàng thuộc về ai.

## Phạm vi

Trong phạm vi:

- Đăng nhập, lấy thông tin người đang đăng nhập, đăng xuất
- Middleware chặn các route ghi của products/categories
- Trang đăng nhập ở FE, chặn truy cập khi chưa đăng nhập
- Script tạo tài khoản admin đầu tiên

Ngoài phạm vi (ghi ra để khỏi hiểu nhầm là bỏ sót):

- Đổi mật khẩu, quên mật khẩu, refresh token

Đã được làm ở module sau, ghi lại để khỏi tìm nhầm chỗ:

- CRUD người dùng và phân quyền theo `role` → [module Users](./2026-08-18-users-module.md).
  Ở thời điểm viết spec này `role` mới chỉ được lưu và trả về, chưa route nào
  chặn theo nó; middleware `requireRole` được thêm cùng module Users

## Quyết định thiết kế

### QĐ-1: Không có đăng ký công khai

Đây là CMS quản trị nội bộ. Không có `POST /api/auth/register`.

Tài khoản đầu tiên tạo bằng `node prisma/seed-admin.js`, đọc thông tin từ biến
môi trường `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Script này chạy
tay, không nằm trong luồng khởi động server.

Đánh đổi: muốn thêm người dùng thứ hai thì phải chạy lại script cho tới khi có
module quản lý người dùng.

### QĐ-2: JWT ký bằng HS256, có tra lại DB mỗi request

Token mang `{ id, username, role }`, ký bằng `JWT_SECRET`, hạn `1d`.

Middleware `requireAuth` không chỉ verify chữ ký mà còn tra
`user.findFirst({ id, isDeleted: false, isActive: true })`. Tốn một query mỗi
request, đổi lại khoá được tài khoản ngay lập tức thay vì phải chờ token hết hạn.

Server **từ chối khởi động** nếu thiếu `JWT_SECRET`. Không có giá trị mặc định
dự phòng — một secret mặc định lọt lên production còn tệ hơn là server không
chạy.

### QĐ-3: Chỉ gác route ghi

| Route | Cần token |
|---|---|
| `GET /api/products`, `GET /api/products/:id` | Không |
| `GET /api/categories`, `GET /api/categories/:id` | Không |
| `POST` / `PUT` / `DELETE` của cả hai | Có |

Lý do giữ GET mở: đây là CMS cho một cửa hàng. Trang bán hàng cho khách phải
đọc được danh sách sản phẩm mà không cần đăng nhập. Gác cả GET sẽ chặn luôn
người mua.

### QĐ-4: bcryptjs, cost 10

Dùng `bcryptjs` (thuần JS) chứ không phải `bcrypt` (native, cần node-gyp) vì
môi trường phát triển là Windows.

Trường `password` **không bao giờ** xuất hiện trong response. Mọi truy vấn user
trả ra ngoài đều đi qua `select` liệt kê tường minh các cột, không dùng
`omit` hay xoá thuộc tính sau khi query — quên một chỗ là lộ hash.

### QĐ-5: Token lưu ở localStorage

`localStorage` chứ không phải cookie httpOnly.

Đánh đổi, ghi rõ vì đây là điểm yếu thật: bất kỳ lỗ hổng XSS nào cũng đọc được
token. Cookie httpOnly an toàn hơn nhưng kéo theo CSRF token và cấu hình CORS
`credentials`, phức tạp hơn mức cần thiết cho dự án học. Nếu sau này đưa lên
môi trường thật thì đây là thứ phải đổi đầu tiên.

Axios interceptor gắn `Authorization: Bearer <token>` vào mọi request. Một
interceptor phía response bắt 401, xoá token và đẩy về `/login`.

### QĐ-6: Thông báo đăng nhập sai phải chung chung

Sai username và sai mật khẩu đều trả cùng một câu: `"Sai tài khoản hoặc mật khẩu"`,
cùng mã 401. Phân biệt hai trường hợp sẽ cho phép người ngoài dò xem username
nào có thật.

Cũng vì lý do đó, khi không tìm thấy user vẫn phải chạy `bcrypt.compare` với một
hash giả trước khi trả lỗi, để thời gian phản hồi hai trường hợp không lệch nhau.

### QĐ-7: Kế thừa envelope lỗi của spec products

Mọi lỗi trả `{ error: string }`. 500 luôn trả đúng chuỗi `"Internal server error"`,
không bao giờ đưa `error.message` của Prisma ra ngoài.

## Thay đổi schema

`User` hiện chưa có giá trị mặc định nào:

```prisma
role      String
isActive  Boolean
isDeleted Boolean
```

Đổi thành:

```prisma
role      String  @default("staff")
isActive  Boolean @default(true)
isDeleted Boolean @default(false)
```

Không đổi kiểu, không đổi tên cột, nên migration chỉ là `SET DEFAULT` — dữ liệu
cũ không bị ảnh hưởng.

## Hợp đồng API

### POST /api/auth/login

Body: `{ "username": string, "password": string }`

`username` nhận cả username lẫn email, tra bằng `OR`.

- `200` → `{ token, user: { id, username, email, role } }`
- `400` → thiếu username hoặc password
- `401` → `{ error: "Sai tài khoản hoặc mật khẩu" }` — sai mật khẩu, sai username,
  hoặc tài khoản đã xoá mềm
- `403` → `{ error: "Tài khoản đã bị khoá" }` — chỉ trả sau khi mật khẩu đã đúng.
  Báo sớm hơn là tiết lộ username có thật cho người chưa biết mật khẩu

### GET /api/auth/me

Cần `Authorization: Bearer <token>`.

- `200` → `{ id, username, email, role, isActive }`
- `401` → thiếu token, token hỏng, token hết hạn, hoặc user đã bị khoá/xoá

Không có `POST /api/auth/logout`: token là stateless, đăng xuất chỉ là việc FE
xoá token khỏi localStorage.

## Quy tắc kiểm tra đầu vào

| Trường | Quy tắc |
|---|---|
| `username` | bắt buộc, chuỗi, sau khi trim không rỗng |
| `password` | bắt buộc, chuỗi, không rỗng |

Không đặt yêu cầu độ dài mật khẩu ở bước đăng nhập — đó là việc của bước tạo
tài khoản.

## Tiêu chí nghiệm thu

1. `POST /api/auth/login` đúng mật khẩu trả 200 kèm token verify được bằng `JWT_SECRET`
2. Sai mật khẩu và sai username trả **cùng** status 401 và **cùng** một câu lỗi
3. Response đăng nhập không chứa trường `password`
4. `GET /api/auth/me` không token → 401; có token hợp lệ → đúng user
5. Token của user đã bị `isActive: false` → 401 dù chữ ký còn hợp lệ
6. `POST /api/products` không token → 401, và **không có** bản ghi nào được tạo
7. `GET /api/products` không token vẫn → 200
8. Thiếu `JWT_SECRET` thì nạp `utils/jwt` ném lỗi ngay.

   Không kiểm qua `require("./app")` được: Prisma Client tự nạp `be/.env` lúc
   khởi tạo, nên trên máy đã có sẵn `JWT_SECRET` trong file thì app vẫn chạy
   bình thường dù đã xoá biến khỏi env của tiến trình. Test nhắm thẳng vào
   `utils/jwt` — đúng chỗ đặt chốt chặn và không kéo theo Prisma.
9. Trên trình duyệt: vào `/products` khi chưa đăng nhập bị đẩy về `/login`;
   đăng nhập xong quay lại được và tạo sản phẩm thành công
