# Spec: Dashboard số liệu thật

Ngày: 2026-08-18
Trạng thái: đã xong — 9 test ở `be/tests/dashboard.test.js`, số trên trang đã đối
chiếu khớp với truy vấn DB trực tiếp

## Bối cảnh

`fe/src/pages/Dashboard/Dashboard.tsx` hiện là stub 20 dòng hiện chữ "Hello mn"
trong một modal. Sau khi có [Orders](./2026-08-18-orders-module.md) thì đã đủ
dữ liệu để dựng một trang tổng quan thật.

## Phạm vi

Trong phạm vi: một endpoint tổng hợp số liệu, một trang hiển thị.

Ngoài phạm vi: biểu đồ (chưa có thư viện vẽ nào trong dự án), chọn khoảng thời
gian, xuất báo cáo.

## Quyết định thiết kế

### QĐ-1: Một endpoint duy nhất `GET /api/dashboard/stats`

Trang này cần 5 con số từ 4 bảng. Tách thành 5 endpoint thì trang phải bắn 5
request song song và tự ghép, mà không endpoint nào trong số đó dùng lại được ở
chỗ khác. Gộp một lần cho gọn.

Cần token: đây là số liệu kinh doanh, không phải thứ để trang bán hàng đọc.

### QĐ-2: Doanh thu chỉ tính đơn `DELIVERED`

Tách làm hai con số:

| Con số | Gồm những đơn |
|---|---|
| `revenue.delivered` | chỉ `DELIVERED` |
| `revenue.pending` | `PENDING`, `CONFIRMED`, `SHIPPING` |

`CANCELED` không vào con số nào.

Lý do: tiền chỉ thật sự về khi hàng đã giao. Gộp đơn chưa giao vào doanh thu sẽ
thổi phồng con số, mà đơn đang ở `PENDING` thì hoàn toàn có thể bị huỷ.

### QĐ-3: Ngưỡng sắp hết hàng là `stock <= 5`, cố định

Không cho truyền qua query. Một ngưỡng cố định, ghi rõ ở đây, dễ hiểu hơn là
một tham số mà không ai chỉnh. Khi nào cần mới thêm.

Chỉ lấy variant của sản phẩm chưa xoá mềm — cảnh báo tồn kho của sản phẩm đã
gỡ bán là nhiễu.

### QĐ-4: Kế thừa envelope lỗi

`{ error: string }`, `500` trả đúng chuỗi `"Internal server error"`.

## Hợp đồng API

### GET /api/dashboard/stats — cần token

```json
{
  "revenue": { "delivered": 0, "pending": 2830000 },
  "orders": {
    "total": 3,
    "byStatus": { "PENDING": 1, "CONFIRMED": 1, "SHIPPING": 0, "DELIVERED": 0, "CANCELED": 1 }
  },
  "catalog": { "products": 3, "categories": 2 },
  "lowStock": [
    { "variantId": 1, "product": "Áo khoác dù", "color": "Đen", "size": "M", "stock": 4 }
  ],
  "recentOrders": [
    { "id": 3, "customer": "Phạm Minh Đức", "status": "CANCELED", "totalAmount": 1050000, "createdAt": "..." }
  ]
}
```

`byStatus` luôn có đủ 5 khoá, kể cả khi số đơn bằng 0 — nếu chỉ trả những trạng
thái có đơn thì phía FE phải tự vá `undefined` thành 0 ở mọi chỗ hiển thị.

`lowStock` tối đa 10 dòng, `recentOrders` tối đa 5 dòng, sắp xếp mới nhất trước.

## Tiêu chí nghiệm thu

1. `GET /api/dashboard/stats` không token → `401`
2. `revenue.delivered` chỉ cộng đơn `DELIVERED`
3. `revenue.pending` cộng `PENDING` + `CONFIRMED` + `SHIPPING`, không gồm `CANCELED`
4. `byStatus` có đủ 5 khoá kể cả khi DB rỗng, giá trị 0
5. `catalog.products` và `catalog.categories` bỏ qua bản ghi đã xoá mềm
6. `lowStock` chỉ chứa variant `stock <= 5` và bỏ qua sản phẩm đã xoá mềm
7. `recentOrders` trả tối đa 5 đơn, mới nhất trước
8. Trên trình duyệt: trang `/dashboard` hiện đúng các con số vừa dựng
