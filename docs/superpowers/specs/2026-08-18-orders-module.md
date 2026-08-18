# Spec: Module Orders

Ngày: 2026-08-18
Trạng thái: đã xong — 19 test ở `be/tests/orders.test.js`, đã kiểm tra trên trình duyệt

## Bối cảnh

Schema đã có `Order`, `OrderItem`, `Address` từ đầu nhưng chưa có controller,
route hay UI nào chạm tới. Module này làm phần quản trị đơn hàng trong CMS.

Phụ thuộc [module Auth](./2026-08-18-auth-module.md): các route quản trị đơn
đều đòi token.

## Phạm vi

Trong phạm vi:

- Danh sách đơn có phân trang, lọc theo trạng thái, tìm theo tên/số điện thoại
- Xem chi tiết một đơn: mặt hàng, địa chỉ giao, khách đặt
- Đổi trạng thái đơn
- Đặt hàng (`POST /api/orders`) — xem QĐ-1

Ngoài phạm vi:

- Thanh toán, vận chuyển, mã giảm giá
- Sửa mặt hàng trong đơn đã tạo
- Gắn đơn vào tài khoản đang đăng nhập ở phía khách (chưa có phần đăng nhập
  cho người mua)

## Quyết định thiết kế

### QĐ-1: Có `POST /api/orders` và nó công khai

Nếu chỉ làm phần quản trị thì không có đường nào tạo ra đơn để mà quản lý.

Endpoint này là phần dành cho trang bán hàng, nên không đòi token — khớp với
`Order.userId Int?` trong schema, tức đơn được phép không gắn với tài khoản
nào (khách vãng lai). Nếu body có `userId` thì phải là user đang tồn tại.

Đây là ngoại lệ có chủ ý với QĐ-3 của spec auth ("mọi route ghi đều cần token"):
người mua không có tài khoản CMS nên không thể có token.

### QĐ-2: Server tự tính `totalAmount`, không nhận từ client

Client chỉ gửi `variantId` và `quantity`. Giá lấy từ `ProductColorVariants.price`
trong DB tại thời điểm đặt, `totalAmount` là tổng do server cộng.

Nhận giá từ client nghĩa là ai cũng đặt được đơn 1 đồng.

`OrderItem.price` lưu lại giá tại thời điểm đặt chứ không tham chiếu động, để
sau này đổi giá sản phẩm thì đơn cũ vẫn giữ đúng số tiền đã chốt.

### QĐ-3: Trừ tồn kho trong cùng transaction với việc tạo đơn

Tạo đơn và trừ `stock` phải nằm trong một `prisma.$transaction`. Tách ra thì
lỗi giữa chừng sẽ để lại đơn không trừ kho hoặc kho bị trừ mà không có đơn.

Không đủ tồn kho → `400` và không tạo gì cả.

### QĐ-4: Huỷ đơn thì hoàn lại tồn kho

Đổi trạng thái sang `CANCELED` sẽ cộng trả `quantity` về `stock`, cũng trong
một transaction. Không làm thì mỗi đơn huỷ là một lần kho bị hụt vĩnh viễn.

Chỉ hoàn đúng một lần: đơn đã `CANCELED` rồi thì không đổi trạng thái được nữa
(xem QĐ-5), nên không có đường hoàn hai lần.

### QĐ-5: `DELIVERED` và `CANCELED` là trạng thái cuối

| Từ | Được chuyển sang |
|---|---|
| `PENDING` | `CONFIRMED`, `CANCELED` |
| `CONFIRMED` | `SHIPPING`, `CANCELED` |
| `SHIPPING` | `DELIVERED`, `CANCELED` |
| `DELIVERED` | (không) |
| `CANCELED` | (không) |

Chuyển sai luồng → `400` kèm câu nói rõ đang ở trạng thái nào.

Lý do chặn: cho phép quay ngược từ `DELIVERED` về `PENDING` sẽ làm số liệu
doanh thu ở Dashboard vô nghĩa, và mở đường hoàn kho nhiều lần.

### QĐ-6: Xoá đơn thì không có

Không có `DELETE /api/orders/:id`. Đơn là chứng từ, sai thì huỷ chứ không xoá.
Cũng vì thế `Order` không có cột `isDeleted`.

### QĐ-7: Kế thừa envelope lỗi

Mọi lỗi trả `{ error: string }`, kèm `details` khi là lỗi kiểm tra đầu vào.
`500` luôn trả đúng chuỗi `"Internal server error"`.

## Hợp đồng API

### POST /api/orders — công khai

```json
{
  "userId": 1,
  "address": { "fullname": "...", "phone": "...", "street": "...", "city": "..." },
  "items": [{ "variantId": 3, "quantity": 2 }]
}
```

- `201` → đơn vừa tạo, đầy đủ `items` và `address`
- `400` → payload sai, variant không tồn tại, không đủ tồn kho, `userId` không có thật

### GET /api/orders — cần token

Query: `page`, `limit`, `status`, `search` (khớp `Address.fullname` hoặc `Address.phone`).

- `200` → `{ data: [...], meta: { total, page, limit, pageCount } }`

### GET /api/orders/:id — cần token

- `200` → đơn kèm `items` (mỗi item có variant, màu, tên sản phẩm), `address`, `user`
- `400` → id không phải số
- `404` → không tồn tại

### PUT /api/orders/:id/status — cần token

Body: `{ "status": "CONFIRMED" }`

- `200` → đơn sau khi đổi
- `400` → status không hợp lệ hoặc chuyển sai luồng
- `404` → không tồn tại

## Quy tắc kiểm tra đầu vào

| Trường | Quy tắc |
|---|---|
| `items` | mảng, tối thiểu 1 phần tử |
| `items[].variantId` | bắt buộc, số nguyên |
| `items[].quantity` | bắt buộc, số nguyên `>= 1` |
| `address.fullname` | bắt buộc, không rỗng |
| `address.phone` | bắt buộc, không rỗng |
| `address.street` | bắt buộc, không rỗng |
| `address.city` | bắt buộc, không rỗng |
| `userId` | không bắt buộc; có thì phải là số nguyên |
| `status` | thuộc 5 giá trị đã liệt kê |

`variantId` trùng nhau trong cùng một đơn bị từ chối — gộp số lượng ở phía
client, nếu không việc trừ kho sẽ chạy hai lần trên cùng một dòng.

## Tiêu chí nghiệm thu

1. `POST /api/orders` tính `totalAmount` từ giá trong DB, bỏ qua giá client gửi
2. Đặt hàng thành công thì `stock` của variant giảm đúng số lượng
3. Đặt quá tồn kho → `400`, và **không** tạo đơn, **không** đổi `stock`
4. `variantId` không tồn tại → `400`, không tạo gì
5. `GET /api/orders` không token → `401`; `POST /api/orders` không token → `201`
6. Lọc theo `status` và tìm theo tên/số điện thoại trả đúng tập kết quả
7. `PUT .../status` từ `PENDING` sang `SHIPPING` → `400` (sai luồng)
8. Đổi sang `CANCELED` hoàn lại đúng số lượng vào `stock`
9. Đơn đã `DELIVERED` hoặc `CANCELED` thì mọi lần đổi tiếp theo → `400`
10. Trên trình duyệt: trang `/orders` liệt kê được đơn, mở chi tiết, đổi trạng
    thái và thấy bảng cập nhật
