# Spec: Hoàn thiện module Products (end-to-end)

**Ngày:** 2026-08-17
**Trạng thái:** Draft — chờ duyệt trước khi execute plan
**Plan tương ứng:** `docs/superpowers/plans/2026-08-17-products-module.md`

---

## 1. Bối cảnh

Repo `CMS-ECommerse` gồm 2 phần:

- `be/` — Express 5 + Prisma 6 + PostgreSQL (CommonJS, không TypeScript)
- `fe/` — React 18 + Vite 7 + TypeScript + Ant Design 5 + Tailwind 4

Module **Categories** đã hoàn chỉnh end-to-end (CRUD + phân trang + search + filter).
Module **Products** mới có: schema DB đầy đủ, `createProduct`, `getProducts`, `updateProduct` ở BE
và một khung UI rỗng ở FE. Toàn bộ lỗi logic trong `updateProduct` đã được sửa ở commit trước spec này,
nhưng **chưa có test nào bảo vệ** — đây là rủi ro lớn nhất vì đó là hàm phức tạp nhất codebase.

Repo hiện **không có bất kỳ test framework nào**.

## 2. Mục tiêu

Đưa module Products lên ngang mức hoàn thiện của Categories, và dựng nền tảng test tối thiểu
để logic đồng bộ color/variant không hồi quy.

### 2.1 In scope

1. Hạ tầng test cho BE (`node --test` + `supertest`, chạy trên một database test riêng).
2. Ràng buộc toàn vẹn DB mà logic đồng bộ đang **ngầm giả định** nhưng DB chưa enforce.
3. Bổ sung endpoint còn thiếu: `GET /api/products/:id`, `DELETE /api/products/:id`.
4. Validation payload sản phẩm ở BE.
5. Thống nhất response envelope giữa Categories và Products.
6. Soft delete cho Product và Category (schema đã có `isDeleted` nhưng code đang hard delete).
7. FE: `ProductService`, trang Products nối API đầy đủ, modal tạo/sửa sản phẩm nhiều màu – nhiều size.

### 2.2 Out of scope (phase sau)

| Hạng mục | Lý do hoãn |
|---|---|
| Upload ảnh (multer / Cloudinary) | Phase 1 nhập `imageUrl` thủ công; upload là subsystem riêng |
| Auth / JWT / phân quyền | Subsystem riêng, cần plan riêng |
| Module Orders, Users, Dashboard | Subsystem riêng |
| Code-splitting bundle FE (đang 1MB) | Tối ưu, không chặn tính năng |

## 3. Quyết định thiết kế (và đánh đổi)

### QĐ-1. Envelope phân trang: dùng `meta`, bỏ `pagination`

`getCategories` trả `{data, meta:{total,page,limit,pageCount}}`, `getProducts` trả
`{data, pagination:{totalItems,totalPages,currentPage,limit}}`. Hai kiểu khác nhau buộc FE viết 2 lối xử lý.

**Chọn:** đổi `getProducts` sang `meta`. FE Products chưa nối API nên không có breaking change thực tế.

### QĐ-2. Soft delete thay hard delete

Schema đã có `isDeleted` ở `Category` và `Product` nhưng `deleteCategory` đang `prisma.category.delete()`.
Kết hợp `onDelete: Cascade` trên quan hệ Product→Category, xóa 1 danh mục sẽ **xóa vĩnh viễn toàn bộ sản phẩm** của nó.

**Chọn:** `DELETE` = set `isDeleted = true`; mọi truy vấn list/detail lọc `isDeleted: false`.
**Đánh đổi:** dữ liệu tồn đọng trong DB; chấp nhận vì đây là CMS, cần audit và tránh mất dữ liệu đơn hàng.

### QĐ-3. Ràng buộc unique ở tầng DB

Logic `updateProduct` đồng bộ màu bằng `Map` khóa theo **tên màu**, và đồng bộ variant bằng `Map`
khóa theo **size**. Nếu DB cho phép 2 màu trùng tên trong cùng product, `Map` sẽ nuốt mất một bản ghi
và dữ liệu hỏng âm thầm.

**Chọn:** thêm `@@unique([productId, color])` và `@@unique([colorId, size])`.
**Đánh đổi:** cần một migration; nếu DB hiện tại đã có bản ghi trùng thì migration sẽ fail và phải dọn tay
(plan có bước kiểm tra trước).

### QĐ-4. Validation viết tay, không thêm `zod`/`joi`

Payload sản phẩm lồng 3 tầng (product → colors → variants/images). Cần validate nhưng
codebase chưa có lib validation nào.

**Chọn:** một module `be/validators/products.js` thuần JS trả về mảng lỗi. ~60 dòng, không thêm dependency.
**Đánh đổi:** kém biểu cảm hơn zod. Nếu sau này có >3 resource cần validate lồng nhau, hãy chuyển sang zod.

### QĐ-5. Test BE là integration test trên DB thật

Toàn bộ giá trị của module nằm ở các truy vấn Prisma lồng nhau. Mock Prisma sẽ test cái mock, không test logic.

**Chọn:** `node --test` (có sẵn từ Node 18, không thêm test runner) + `supertest` (devDependency duy nhất),
chạy trên database riêng qua biến môi trường `DATABASE_URL_TEST`.
**Đánh đổi:** người chạy test phải tạo sẵn 1 database Postgres rỗng. Chậm hơn unit test.
Bù lại: bắt được đúng loại bug đã xảy ra ở `updateProduct`.

### QĐ-6. Test FE chỉ cho hàm thuần

Không dựng jsdom + Testing Library trong phase này. Chỉ tách logic tính giá/tồn kho ra
`productUtils.ts` và test bằng Vitest. UI kiểm bằng tay theo checklist.
**Đánh đổi:** không có regression test cho component. Chấp nhận ở giai đoạn này.

### QĐ-7. Một envelope lỗi duy nhất cho mọi resource

Ban đầu `products.js` và `categories.js` trả lỗi khác nhau: 404 dùng `error` ở file này và `message`
ở file kia, lỗi không lường trước trả `500` ở đây và `400` ở đó, chuỗi thì `"Internal server errors"`
số nhiều vs số ít. FE phải biết đang gọi endpoint nào mới đọc được lỗi, và resource thứ ba sẽ copy
theo file mà tác giả mở trước.

**Chọn:** mọi response lỗi ở mọi resource đều là `{ error: string }`, kèm `details` khi có nhiều
thông báo (validation). Quy ước status: `400` dữ liệu client sai · `404` không tìm thấy ·
`409` xung đột nghiệp vụ · `500` server lỗi, và `500` **luôn** trả chuỗi cố định
`"Internal server error"` chứ không bao giờ trả `error.message` của Prisma ra ngoài.
Trường `error` là mã lỗi máy đọc và giữ tiếng Anh; nội dung cho người dùng đọc nằm trong `details`
(tiếng Việt) hoặc do FE tự dựng.

**Đánh đổi:** một lần đổi `message` → `error` ở 3 nhánh 404 của Categories. Không client nào đang
đọc `message` nên không có breaking change thực tế.

## 4. Hợp đồng API (sau khi hoàn thành)

Kiểu dữ liệu `Product` trả về:

```jsonc
{
  "id": 1,
  "name": "Áo thun basic",
  "description": "Cotton 100%",
  "isActive": true,
  "isDeleted": false,
  "createdAt": "2026-08-17T02:00:00.000Z",
  "updatedAt": "2026-08-17T02:00:00.000Z",
  "categoryId": 3,
  "category": { "id": 3, "name": "Áo", "slug": "ao" },
  "colors": [
    {
      "id": 10,
      "color": "Đen",
      "colorCode": "#000000",
      "images":   [{ "id": 21, "imageUrl": "https://...", "order": 0 }],
      "variants": [{ "id": 31, "size": "M", "price": 199000, "stock": 12 }]
    }
  ]
}
```

Trường `category` lồng trong `Product` luôn được chiếu (project) còn `{ id, name, slug }`, kể cả khi danh mục cha đã bị xóa mềm.

| Method | Path | Query / Body | Thành công | Lỗi |
|---|---|---|---|---|
| GET | `/api/products` | `page`, `limit`, `search`, `categoryId`, `isActive` | `200 {data, meta}` | `500` |
| GET | `/api/products/:id` | – | `200 Product` | `400` id không hợp lệ · `404` |
| POST | `/api/products` | `ProductPayload` | `201 Product` | `400 {error, details[]}` |
| PUT | `/api/products/:id` | `ProductPayload` | `200 Product` | `400` · `404` · `409` |
| DELETE | `/api/products/:id` | – | `200 {msg}` | `400` · `404` |

`meta` = `{ total, page, limit, pageCount }` — giống hệt Categories.

`409` chỉ phát sinh ở `PUT` khi client cố xóa một màu, hoặc một size trong một màu vẫn còn giữ lại, mà variant tương ứng đã nằm trong `OrderItem`:

```json
{
  "error": "Không thể xóa màu/size đã tồn tại trong đơn hàng",
  "details": [{ "color": "Đen", "variants": ["M", "L"] }]
}
```

### `ProductPayload`

```jsonc
{
  "name": "string, bắt buộc, 1-255 ký tự",
  "description": "string, optional",
  "categoryId": "int, bắt buộc, phải tồn tại và isDeleted=false",
  "isActive": "boolean, optional, mặc định true",
  "colors": [
    {
      "color": "string, bắt buộc, không trùng nhau trong mảng",
      "colorCode": "string, optional, mặc định '#000000'",
      "images":   [{ "imageUrl": "string, bắt buộc" }],
      "variants": [{ "size": "string bắt buộc, không trùng trong 1 màu",
                     "price": "number >= 0", "stock": "int >= 0" }]
    }
  ]
}
```

## 5. Quy tắc validation

| Trường | Quy tắc | Thông báo |
|---|---|---|
| `name` | có, là string, sau `trim()` độ dài 1–255 | `"name là bắt buộc"` / `"name tối đa 255 ký tự"` |
| `categoryId` | có, ép được sang integer | `"categoryId là bắt buộc và phải là số nguyên"` |
| `categoryId` | tồn tại trong DB, `isDeleted=false` | `"categoryId không tồn tại"` (kiểm ở controller, không ở validator) |
| `colors` | nếu có thì phải là mảng | `"colors phải là mảng"` |
| `colors[].color` | string không rỗng | `"colors[i].color là bắt buộc"` |
| `colors[].color` | không trùng (so sánh sau `trim()`, phân biệt hoa thường) | `"Màu 'X' bị lặp lại"` |
| `variants[].size` | string không rỗng, không trùng trong cùng màu | `"colors[i].variants[j].size là bắt buộc"` / `"Size 'S' bị lặp trong màu 'X'"` |
| `variants[].price` | ép được sang số hữu hạn, `>= 0` | `"colors[i].variants[j].price phải là số >= 0"` |
| `variants[].stock` | ép được sang số nguyên, `>= 0` | `"colors[i].variants[j].stock phải là số nguyên >= 0"` |
| `images[].imageUrl` | string không rỗng | `"colors[i].images[j].imageUrl là bắt buộc"` |

Validator trả về `string[]`. Rỗng = hợp lệ. Controller trả `400 { error: "Dữ liệu không hợp lệ", details }`.

## 6. Thay đổi schema

```prisma
model User {
  isActive Boolean   // đổi tên từ isActice (typo)
}

model Category {
  slug String @unique   // thêm
}

model ProductColor {
  @@unique([productId, color])   // thêm
}

model ProductColorVariants {
  @@unique([colorId, size])      // thêm
}

model Product {
  @@index([categoryId])          // thêm
}
```

Không đổi `onDelete: Cascade` trên `Product.category` — sau khi chuyển sang soft delete thì
cascade không còn được kích hoạt trong luồng thường.

## 7. Yêu cầu FE

### 7.1 Trang `/products`

- Bảng: Ảnh (ảnh đầu của màu đầu) · Tên · Giá (khoảng min–max theo variant) · Tổng kho (tổng `stock`) · Hành động.
- Filter: ô tìm kiếm theo tên, select danh mục (nạp từ `getCategories({isActive:true, limit:100})`).
- Phân trang server-side, mặc định `limit=10`.
- Nút `+ Tạo sản phẩm mới` mở modal ở chế độ tạo.
- Icon sửa mở modal chế độ sửa; icon xóa hiện `Popconfirm` rồi gọi `DELETE`.
- Sau mọi thao tác thành công: `message.success` + refetch danh sách.

### 7.2 Modal sản phẩm

- Trường phẳng: `name` (bắt buộc), `categoryId` (Select, bắt buộc), `description` (TextArea), `isActive` (Switch).
- `Form.List` cấp 1 — **Màu**: `color` (bắt buộc), `colorCode` (ColorPicker hoặc Input), nút xóa màu.
- Trong mỗi màu, hai `Form.List` lồng:
  - **Ảnh**: `imageUrl` (Input) — thứ tự trong mảng chính là `order`, không nhập tay.
  - **Size**: `size`, `price` (InputNumber min 0), `stock` (InputNumber min 0, step 1).
- Chế độ sửa: `GET /api/products/:id` rồi `form.setFieldsValue`.
- Khi BE trả `409`, hiện `message.error` kèm danh sách màu/size bị chặn, **không đóng modal**.

## 8. Tiêu chí nghiệm thu

Module coi là xong khi tất cả các mục dưới đây đúng:

1. `cd be && npm test` — toàn bộ test pass, không skip.
2. `cd fe && npm run build` — exit 0, không lỗi TypeScript.
3. `cd fe && npx vitest run` — pass.
4. Chạy tay:
   - Tạo sản phẩm 2 màu × 2 size, mỗi màu 1 ảnh → xuất hiện trong bảng, giá hiển thị dạng khoảng.
   - Sửa: đổi tên, xóa 1 size, thêm 1 màu → reload thấy đúng, không sinh bản ghi trùng.
   - Xóa sản phẩm → biến mất khỏi bảng, nhưng bản ghi vẫn còn trong DB với `isDeleted = true`.
   - Filter theo danh mục và search theo tên trả đúng kết quả, phân trang đúng.
5. Không endpoint nào trả về sản phẩm/danh mục top-level có `isDeleted = true`; `category` lồng trong `Product` tuân theo phép chiếu ở §4 nên không mang trường `isDeleted`.

## 9. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Migration unique fail do dữ liệu trùng sẵn có | Task 2 có bước SQL kiểm tra trùng trước khi migrate |
| Không có sẵn DB test | Task 1 nêu rõ lệnh `createdb`; test skip có kiểm soát nếu thiếu `DATABASE_URL_TEST` là **không** chấp nhận — phải fail rõ ràng |
| `Form.List` lồng 2 cấp của antd dễ sai `name` path | Task 10 ghi rõ dạng `[field.name, "variants"]` |
| Đổi envelope `pagination`→`meta` làm hỏng client khác | Không có client nào khác đang dùng; đã kiểm tra toàn repo |
