# Products Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa module Products lên ngang mức hoàn thiện của Categories (CRUD đầy đủ FE↔BE, phân trang, filter, soft delete), có test bảo vệ logic đồng bộ color/variant.

**Architecture:** BE giữ nguyên kiến trúc `routes → controllers → Prisma` của Categories, thêm 2 module dùng chung (`prisma/client.js`, `validators/products.js`) và tách `app.js` khỏi `server.js` để test được bằng supertest. FE giữ nguyên pattern `pages/<Resource>/{index,Table,Modal,Type}` + `services/<Resource>Service.ts` của Categories.

**Tech Stack:** Node 22, Express 5, Prisma 6 + PostgreSQL, `node --test` + supertest (BE) · React 18, Vite 7, TypeScript 5.9, Ant Design 5, Vitest (FE)

**Spec:** `docs/superpowers/specs/2026-08-17-products-module.md`

## Global Constraints

- BE là **CommonJS** (`require`/`module.exports`). Không đổi sang ESM.
- BE **không dùng TypeScript**. Không thêm build step cho BE.
- Không thêm dependency runtime mới. DevDependency mới được phép: `supertest` (BE), `vitest` (FE).
- FE bật `strict`, `noUnusedLocals`, `noUnusedParameters` — mọi biến/tham số thừa đều làm `npm run build` fail.
- Prisma Client được generate vào `be/generated/prisma` (đã gitignore). Sau mỗi lần đổi `schema.prisma` phải chạy `npx prisma generate`.
- Toàn bộ text hiển thị cho người dùng viết bằng **tiếng Việt**.
- Envelope phân trang chuẩn: `{ data, meta: { total, page, limit, pageCount } }`.
- Mọi truy vấn list/detail phải lọc `isDeleted: false`.
- Commit sau mỗi task, prefix `feat:` / `fix:` / `test:` / `chore:`.

---

### Task 1: Hạ tầng test cho backend

Tách `app` khỏi `listen` để supertest gắn được vào app, gom `PrismaClient` về một chỗ, và dựng helper reset database test.

**Files:**
- Create: `be/app.js`
- Create: `be/prisma/client.js`
- Create: `be/tests/helpers/db.js`
- Create: `be/tests/helpers/migrate-test-db.js`
- Create: `be/tests/smoke.test.js`
- Modify: `be/server.js`
- Modify: `be/controllers/products.js:1-2`
- Modify: `be/controllers/categories.js:1-2`
- Modify: `be/package.json`
- Modify: `be/.gitignore`

**Interfaces:**
- Consumes: không có (task đầu tiên)
- Produces:
  - `require("../app")` → Express app instance (chưa `listen`)
  - `require("../prisma/client")` → singleton `PrismaClient`
  - `require("./helpers/db")` → `{ prisma, resetDb(): Promise<void> }`

- [ ] **Step 1: Tạo database test và khai báo biến môi trường**

Tạo một database Postgres rỗng (tên gợi ý `cms_ecommerce_test`):

```bash
psql -U postgres -c "CREATE DATABASE cms_ecommerce_test;"
```

Thêm dòng sau vào `be/.env` (file này đã được gitignore):

```
DATABASE_URL_TEST=postgresql://postgres:<password>@localhost:5432/cms_ecommerce_test?schema=public
```

Kiểm tra `be/.env` — key `PORT ` hiện có **dấu cách thừa** ở cuối tên biến, khiến `process.env.PORT` luôn `undefined`. Sửa thành `PORT=5000`.

- [ ] **Step 2: Tách `app.js` khỏi `server.js`**

Tạo `be/app.js`:

```js
const express = require("express");
require("dotenv").config();
const routes = require("./routes");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors({
  origin: "*",
}));
app.get("/", (req, res) => {
  res.send("API is running 123");
});

app.use(routes);

module.exports = app;
```

Thay toàn bộ nội dung `be/server.js` bằng:

```js
const app = require("./app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("SERVER running on PORT", PORT);
});
```

- [ ] **Step 3: Gom PrismaClient về một module**

Tạo `be/prisma/client.js`:

```js
const { PrismaClient } = require("../generated/prisma");

// Một instance duy nhất cho toàn app. Mỗi `new PrismaClient()` mở một pool
// kết nối riêng, tạo nhiều instance sẽ làm cạn connection pool của Postgres.
const prisma = new PrismaClient();

module.exports = prisma;
```

Trong `be/controllers/products.js`, thay 2 dòng đầu:

```js
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
```

bằng:

```js
const prisma = require("../prisma/client");
```

Làm y hệt cho `be/controllers/categories.js` (2 dòng đầu của file đó là `const {PrismaClient} = require("../generated/prisma")` và `const prisma = new PrismaClient();`).

- [ ] **Step 4: Viết helper migrate database test**

Tạo `be/tests/helpers/migrate-test-db.js`:

```js
// Chạy `prisma migrate deploy` lên DATABASE_URL_TEST, không đụng DB dev.
const { spawnSync } = require("node:child_process");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) {
  console.error("Thiếu DATABASE_URL_TEST trong be/.env — xem Task 1 Step 1 của plan.");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  cwd: path.join(__dirname, "..", ".."),
  env: { ...process.env, DATABASE_URL: testUrl },
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
```

- [ ] **Step 5: Viết helper reset database**

Tạo `be/tests/helpers/db.js`:

```js
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

if (!process.env.DATABASE_URL_TEST) {
  throw new Error("Thiếu DATABASE_URL_TEST trong be/.env — xem Task 1 Step 1 của plan.");
}

// PHẢI gán trước khi require prisma client, vì PrismaClient đọc DATABASE_URL
// ngay lúc khởi tạo. Đây là lý do mọi test file require helper này ĐẦU TIÊN.
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

const prisma = require("../../prisma/client");

// TRUNCATE ... CASCADE dọn sạch mọi bảng và reset lại chuỗi id về 1,
// nên mỗi test bắt đầu từ trạng thái giống hệt nhau.
async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Address","OrderItem","Order","ProductColorImage","ProductColorVariants","ProductColor","Product","Category","User" RESTART IDENTITY CASCADE'
  );
}

module.exports = { prisma, resetDb };
```

- [ ] **Step 6: Viết smoke test (test đầu tiên, phải fail trước)**

Tạo `be/tests/smoke.test.js`:

```js
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, resetDb } = require("./helpers/db");
const request = require("supertest");
const app = require("../app");

before(async () => {
  await resetDb();
});

after(async () => {
  await prisma.$disconnect();
});

test("GET / trả về 200", async () => {
  const res = await request(app).get("/");
  assert.equal(res.status, 200);
});

test("resetDb dọn sạch bảng Category", async () => {
  await prisma.category.create({ data: { name: "Tạm", slug: "tam" } });
  await resetDb();
  assert.equal(await prisma.category.count(), 0);
});
```

- [ ] **Step 7: Cài supertest và thêm script test**

```bash
cd be
npm install --save-dev supertest
```

Trong `be/package.json`, thay dòng `"test": "echo \"Error: no test specified\" && exit 1",` bằng:

```json
    "test": "node tests/helpers/migrate-test-db.js && node --test --test-concurrency=1 tests/",
```

`--test-concurrency=1` bắt buộc: các test file dùng chung một database, chạy song song sẽ giẫm lên nhau.

- [ ] **Step 8: Chạy test, xác nhận PASS**

```bash
cd be && npm test
```

Kỳ vọng: `pass 2`, `fail 0`. Nếu lỗi `P1001 Can't reach database server` → kiểm tra Postgres đang chạy và `DATABASE_URL_TEST` đúng. Nếu lỗi `relation "Category" does not exist` → `migrate deploy` chưa chạy, kiểm tra Step 4.

- [ ] **Step 9: Xác nhận server dev vẫn chạy**

```bash
cd be && npm run dev
```

Kỳ vọng: log `SERVER running on PORT 5000`. Mở `http://localhost:5000/` thấy `API is running 123`. Dừng bằng `Ctrl+C`.

- [ ] **Step 10: Commit**

```bash
git add be/app.js be/server.js be/prisma/client.js be/tests be/package.json be/package-lock.json be/controllers/products.js be/controllers/categories.js
git commit -m "test: dung ha tang test cho backend voi node:test va supertest"
```

---

### Task 2: Migration ràng buộc toàn vẹn dữ liệu

Thêm các unique constraint mà logic đồng bộ color/variant đang ngầm giả định, và sửa typo `isActice`.

**Files:**
- Modify: `be/prisma/schema.prisma`
- Create: `be/prisma/migrations/<timestamp>_add_integrity_constraints/migration.sql` (Prisma tự sinh)
- Create: `be/tests/schema.test.js`

**Interfaces:**
- Consumes: `be/tests/helpers/db.js` từ Task 1
- Produces: cột `User.isActive` (thay `User.isActice`); ràng buộc `ProductColor(productId,color)` unique, `ProductColorVariants(colorId,size)` unique, `Category.slug` unique

- [ ] **Step 1: Kiểm tra dữ liệu trùng trước khi migrate**

Migration sẽ **fail** nếu DB dev đang có bản ghi vi phạm. Chạy trước:

```bash
cd be
npx prisma db execute --stdin <<'SQL'
SELECT "productId", "color", COUNT(*) FROM "ProductColor" GROUP BY 1,2 HAVING COUNT(*) > 1;
SELECT "colorId", "size", COUNT(*) FROM "ProductColorVariants" GROUP BY 1,2 HAVING COUNT(*) > 1;
SELECT "slug", COUNT(*) FROM "Category" GROUP BY 1 HAVING COUNT(*) > 1;
SQL
```

Nếu có dòng trả về, phải xóa/gộp thủ công các bản ghi trùng trước khi sang Step 2.

- [ ] **Step 2: Viết test cho ràng buộc (phải fail trước)**

Tạo `be/tests/schema.test.js`:

```js
const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, resetDb } = require("./helpers/db");

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await prisma.$disconnect();
});

test("không cho 2 màu trùng tên trong cùng một sản phẩm", async () => {
  const category = await prisma.category.create({ data: { name: "Áo", slug: "ao" } });
  const product = await prisma.product.create({
    data: { name: "Áo thun", description: "", categoryId: category.id },
  });

  await prisma.productColor.create({ data: { productId: product.id, color: "Đen" } });

  await assert.rejects(
    () => prisma.productColor.create({ data: { productId: product.id, color: "Đen" } }),
    (err) => err.code === "P2002"
  );
});

test("không cho 2 size trùng nhau trong cùng một màu", async () => {
  const category = await prisma.category.create({ data: { name: "Áo", slug: "ao-2" } });
  const product = await prisma.product.create({
    data: { name: "Áo thun", description: "", categoryId: category.id },
  });
  const color = await prisma.productColor.create({
    data: { productId: product.id, color: "Đen" },
  });

  await prisma.productColorVariants.create({
    data: { colorId: color.id, size: "M", price: 100, stock: 1 },
  });

  await assert.rejects(
    () => prisma.productColorVariants.create({
      data: { colorId: color.id, size: "M", price: 200, stock: 2 },
    }),
    (err) => err.code === "P2002"
  );
});

test("không cho 2 danh mục trùng slug", async () => {
  await prisma.category.create({ data: { name: "Áo", slug: "ao" } });

  await assert.rejects(
    () => prisma.category.create({ data: { name: "Áo khoác", slug: "ao" } }),
    (err) => err.code === "P2002"
  );
});

test("User có cột isActive", async () => {
  const user = await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@example.com",
      password: "x",
      role: "ADMIN",
      isActive: true,
      isDeleted: false,
    },
  });
  assert.equal(user.isActive, true);
});
```

- [ ] **Step 3: Chạy test để xác nhận FAIL**

```bash
cd be && npm test
```

Kỳ vọng: 4 test trong `schema.test.js` FAIL. Ba test đầu fail vì `assert.rejects` không thấy lỗi (DB vẫn cho tạo trùng); test cuối fail với `Unknown argument 'isActive'`.

- [ ] **Step 4: Sửa schema**

Trong `be/prisma/schema.prisma`:

Ở `model User`, đổi `isActice  Boolean` thành:

```prisma
  isActive  Boolean
```

Ở `model Category`, đổi `slug      String` thành:

```prisma
  slug      String   @unique
```

Ở `model Product`, thêm ngay trước dấu `}` đóng model:

```prisma
  @@index([categoryId])
```

Ở `model ProductColor`, thêm ngay trước dấu `}` đóng model:

```prisma
  @@unique([productId, color])
```

Ở `model ProductColorVariants`, thêm ngay trước dấu `}` đóng model:

```prisma
  @@unique([colorId, size])
```

- [ ] **Step 5: Sinh migration**

```bash
cd be
npx prisma migrate dev --name add_integrity_constraints
```

Mở file `migration.sql` vừa sinh trong `be/prisma/migrations/` và xác nhận có `ALTER TABLE "User" RENAME COLUMN "isActice" TO "isActive"` (Prisma sẽ hỏi khi phát hiện đổi tên). Nếu Prisma sinh ra `DROP COLUMN "isActice"` + `ADD COLUMN "isActive"` thay vì `RENAME`, sửa tay file `.sql` thành `RENAME COLUMN` để không mất dữ liệu.

```bash
npx prisma generate
```

- [ ] **Step 6: Chạy test để xác nhận PASS**

```bash
cd be && npm test
```

Kỳ vọng: tất cả PASS (6 test: 2 smoke + 4 schema).

- [ ] **Step 7: Commit**

```bash
git add be/prisma be/tests/schema.test.js
git commit -m "feat: them rang buoc unique cho color/variant/slug va sua typo isActice"
```

---

### Task 3: Module validate payload sản phẩm

**Files:**
- Create: `be/validators/products.js`
- Create: `be/tests/validators.test.js`

**Interfaces:**
- Consumes: không có
- Produces: `require("../validators/products")` → `{ validateProductPayload(payload: object): string[] }` — mảng rỗng nghĩa là hợp lệ

- [ ] **Step 1: Viết test (phải fail trước)**

Tạo `be/tests/validators.test.js`:

```js
const { test } = require("node:test");
const assert = require("node:assert/strict");

const { validateProductPayload } = require("../validators/products");

const validPayload = () => ({
  name: "Áo thun",
  categoryId: 1,
  colors: [
    {
      color: "Đen",
      colorCode: "#000000",
      images: [{ imageUrl: "https://example.com/a.jpg" }],
      variants: [{ size: "M", price: 199000, stock: 10 }],
    },
  ],
});

test("payload hợp lệ không có lỗi", () => {
  assert.deepEqual(validateProductPayload(validPayload()), []);
});

test("thiếu name", () => {
  const p = validPayload();
  delete p.name;
  assert.deepEqual(validateProductPayload(p), ["name là bắt buộc"]);
});

test("name chỉ có khoảng trắng cũng bị coi là thiếu", () => {
  const p = { ...validPayload(), name: "   " };
  assert.deepEqual(validateProductPayload(p), ["name là bắt buộc"]);
});

test("name quá 255 ký tự", () => {
  const p = { ...validPayload(), name: "a".repeat(256) };
  assert.deepEqual(validateProductPayload(p), ["name tối đa 255 ký tự"]);
});

test("categoryId rỗng không được coi là 0", () => {
  const p = { ...validPayload(), categoryId: "" };
  assert.deepEqual(validateProductPayload(p), [
    "categoryId là bắt buộc và phải là số nguyên",
  ]);
});

test("categoryId dạng chuỗi số vẫn hợp lệ", () => {
  const p = { ...validPayload(), categoryId: "3" };
  assert.deepEqual(validateProductPayload(p), []);
});

test("colors không phải mảng", () => {
  const p = { ...validPayload(), colors: "Đen" };
  assert.deepEqual(validateProductPayload(p), ["colors phải là mảng"]);
});

test("không có colors vẫn hợp lệ", () => {
  const p = validPayload();
  delete p.colors;
  assert.deepEqual(validateProductPayload(p), []);
});

test("màu trùng tên", () => {
  const p = validPayload();
  p.colors.push({ color: "Đen", variants: [], images: [] });
  assert.deepEqual(validateProductPayload(p), ["Màu 'Đen' bị lặp lại"]);
});

test("size trùng trong cùng một màu", () => {
  const p = validPayload();
  p.colors[0].variants.push({ size: "M", price: 1, stock: 1 });
  assert.deepEqual(validateProductPayload(p), ["Size 'M' bị lặp trong màu 'Đen'"]);
});

test("price âm và stock không nguyên", () => {
  const p = validPayload();
  p.colors[0].variants = [{ size: "M", price: -1, stock: 1.5 }];
  assert.deepEqual(validateProductPayload(p), [
    "colors[0].variants[0].price phải là số >= 0",
    "colors[0].variants[0].stock phải là số nguyên >= 0",
  ]);
});

test("price null không được coi là 0", () => {
  const p = validPayload();
  p.colors[0].variants = [{ size: "M", price: null, stock: 0 }];
  assert.deepEqual(validateProductPayload(p), [
    "colors[0].variants[0].price phải là số >= 0",
  ]);
});

test("imageUrl rỗng", () => {
  const p = validPayload();
  p.colors[0].images = [{ imageUrl: "" }];
  assert.deepEqual(validateProductPayload(p), [
    "colors[0].images[0].imageUrl là bắt buộc",
  ]);
});

test("payload undefined trả về lỗi thay vì ném exception", () => {
  assert.deepEqual(validateProductPayload(undefined), [
    "name là bắt buộc",
    "categoryId là bắt buộc và phải là số nguyên",
  ]);
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
cd be && node --test tests/validators.test.js
```

Kỳ vọng: FAIL với `Cannot find module '../validators/products'`.

- [ ] **Step 3: Viết validator**

Tạo `be/validators/products.js`:

```js
const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

// null, undefined và chuỗi rỗng đều KHÔNG được ngầm hiểu là 0.
const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return NaN;
  return Number(value);
};

const validateProductPayload = (payload) => {
  const errors = [];
  const { name, categoryId, colors } = payload || {};

  if (!isNonEmptyString(name)) {
    errors.push("name là bắt buộc");
  } else if (name.trim().length > 255) {
    errors.push("name tối đa 255 ký tự");
  }

  if (!Number.isInteger(toNumber(categoryId))) {
    errors.push("categoryId là bắt buộc và phải là số nguyên");
  }

  if (colors === undefined) return errors;

  if (!Array.isArray(colors)) {
    errors.push("colors phải là mảng");
    return errors;
  }

  const seenColors = new Set();

  colors.forEach((color, i) => {
    if (!isNonEmptyString(color?.color)) {
      errors.push(`colors[${i}].color là bắt buộc`);
    } else {
      const key = color.color.trim();
      if (seenColors.has(key)) errors.push(`Màu '${key}' bị lặp lại`);
      seenColors.add(key);
    }

    (color?.images || []).forEach((image, j) => {
      if (!isNonEmptyString(image?.imageUrl)) {
        errors.push(`colors[${i}].images[${j}].imageUrl là bắt buộc`);
      }
    });

    const seenSizes = new Set();

    (color?.variants || []).forEach((variant, j) => {
      if (!isNonEmptyString(variant?.size)) {
        errors.push(`colors[${i}].variants[${j}].size là bắt buộc`);
      } else {
        const key = variant.size.trim();
        if (seenSizes.has(key)) {
          errors.push(`Size '${key}' bị lặp trong màu '${color.color}'`);
        }
        seenSizes.add(key);
      }

      const price = toNumber(variant?.price);
      if (!Number.isFinite(price) || price < 0) {
        errors.push(`colors[${i}].variants[${j}].price phải là số >= 0`);
      }

      const stock = toNumber(variant?.stock);
      if (!Number.isInteger(stock) || stock < 0) {
        errors.push(`colors[${i}].variants[${j}].stock phải là số nguyên >= 0`);
      }
    });
  });

  return errors;
};

module.exports = { validateProductPayload };
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
cd be && node --test tests/validators.test.js
```

Kỳ vọng: `pass 14`, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add be/validators be/tests/validators.test.js
git commit -m "feat: them validator cho payload san pham"
```

---

### Task 4: `GET /api/products` và `GET /api/products/:id`

Đổi envelope sang `meta`, lọc `isDeleted`, thêm filter `isActive`, thêm endpoint chi tiết.

**Files:**
- Modify: `be/controllers/products.js` (hàm `getProducts`, thêm `getProductById`)
- Modify: `be/routes/products.js`
- Create: `be/tests/products.get.test.js`
- Create: `be/tests/helpers/factory.js`

**Interfaces:**
- Consumes: `require("./helpers/db")`, `require("../app")`
- Produces:
  - `productsControllers.getProductById(req, res)`
  - `require("./helpers/factory")` → `{ createCategory(overrides?), createProduct(overrides?) }`
  - `GET /api/products` → `{ data, meta: { total, page, limit, pageCount } }`
  - `GET /api/products/:id` → `Product` hoặc `404 { error: "Product not found" }`

- [ ] **Step 1: Viết factory tạo dữ liệu mẫu**

Tạo `be/tests/helpers/factory.js`:

```js
const { prisma } = require("./db");

let counter = 0;

const createCategory = async (overrides = {}) => {
  counter += 1;
  return prisma.category.create({
    data: {
      name: `Danh mục ${counter}`,
      slug: `danh-muc-${counter}`,
      ...overrides,
    },
  });
};

// Tạo product kèm 1 màu, 1 ảnh, 1 variant để test các cột tính toán.
const createProduct = async (overrides = {}) => {
  counter += 1;
  const { categoryId, colors, ...rest } = overrides;
  const category = categoryId
    ? { id: categoryId }
    : await createCategory();

  return prisma.product.create({
    data: {
      name: `Sản phẩm ${counter}`,
      description: "mô tả",
      categoryId: category.id,
      colors: colors ?? {
        create: [
          {
            color: "Đen",
            colorCode: "#000000",
            images: { create: [{ imageUrl: "https://example.com/a.jpg", order: 0 }] },
            variants: { create: [{ size: "M", price: 199000, stock: 10 }] },
          },
        ],
      },
      ...rest,
    },
    include: { colors: { include: { images: true, variants: true } } },
  });
};

module.exports = { createCategory, createProduct };
```

- [ ] **Step 2: Viết test (phải fail trước)**

Tạo `be/tests/products.get.test.js`:

```js
const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, resetDb } = require("./helpers/db");
const { createCategory, createProduct } = require("./helpers/factory");
const request = require("supertest");
const app = require("../app");

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await prisma.$disconnect();
});

test("GET /api/products trả envelope meta", async () => {
  await createProduct();

  const res = await request(app).get("/api/products");

  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.deepEqual(res.body.meta, { total: 1, page: 1, limit: 10, pageCount: 1 });
});

test("GET /api/products trả kèm category, images và variants", async () => {
  await createProduct();

  const res = await request(app).get("/api/products");
  const product = res.body.data[0];

  assert.ok(product.category.name);
  assert.equal(product.colors[0].images[0].order, 0);
  assert.equal(product.colors[0].variants[0].size, "M");
});

test("GET /api/products bỏ qua sản phẩm đã xóa mềm", async () => {
  const product = await createProduct();
  await prisma.product.update({
    where: { id: product.id },
    data: { isDeleted: true },
  });

  const res = await request(app).get("/api/products");

  assert.equal(res.body.data.length, 0);
  assert.equal(res.body.meta.total, 0);
});

test("GET /api/products lọc theo categoryId dạng chuỗi từ query string", async () => {
  const categoryA = await createCategory();
  const categoryB = await createCategory();
  await createProduct({ categoryId: categoryA.id });
  await createProduct({ categoryId: categoryB.id });

  const res = await request(app).get(`/api/products?categoryId=${categoryA.id}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].categoryId, categoryA.id);
});

test("GET /api/products search không phân biệt hoa thường", async () => {
  await createProduct({ name: "Áo Thun Trắng" });
  await createProduct({ name: "Quần jean" });

  const res = await request(app).get("/api/products?search=thun");

  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].name, "Áo Thun Trắng");
});

test("GET /api/products lọc isActive", async () => {
  await createProduct({ isActive: true });
  await createProduct({ isActive: false });

  const res = await request(app).get("/api/products?isActive=false");

  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].isActive, false);
});

test("GET /api/products phân trang", async () => {
  await createProduct();
  await createProduct();
  await createProduct();

  const res = await request(app).get("/api/products?page=2&limit=2");

  assert.equal(res.body.data.length, 1);
  assert.deepEqual(res.body.meta, { total: 3, page: 2, limit: 2, pageCount: 2 });
});

test("GET /api/products chặn limit vượt 100", async () => {
  await createProduct();

  const res = await request(app).get("/api/products?limit=9999");

  assert.equal(res.body.meta.limit, 100);
});

test("GET /api/products/:id trả chi tiết", async () => {
  const product = await createProduct();

  const res = await request(app).get(`/api/products/${product.id}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.id, product.id);
  assert.equal(res.body.colors[0].variants[0].size, "M");
});

test("GET /api/products/:id trả 404 khi không tồn tại", async () => {
  const res = await request(app).get("/api/products/999999");

  assert.equal(res.status, 404);
  assert.equal(res.body.error, "Product not found");
});

test("GET /api/products/:id trả 404 với sản phẩm đã xóa mềm", async () => {
  const product = await createProduct();
  await prisma.product.update({
    where: { id: product.id },
    data: { isDeleted: true },
  });

  const res = await request(app).get(`/api/products/${product.id}`);

  assert.equal(res.status, 404);
});

test("GET /api/products/:id trả 400 khi id không phải số", async () => {
  const res = await request(app).get("/api/products/abc");

  assert.equal(res.status, 400);
});
```

- [ ] **Step 3: Chạy test để xác nhận FAIL**

```bash
cd be && node --test tests/products.get.test.js
```

Kỳ vọng: nhiều test FAIL — `res.body.meta` là `undefined` (controller đang trả `pagination`), `/api/products/:id` trả 404 của Express vì chưa có route.

- [ ] **Step 4: Viết lại `getProducts` và thêm `getProductById`**

Trong `be/controllers/products.js`, thay toàn bộ hàm `getProducts` bằng:

```js
  getProducts: async (req, res) => {
    try {
      let page = parseInt(req.query.page, 10) || 1;
      let limit = parseInt(req.query.limit, 10) || 10;
      const { search, categoryId, isActive } = req.query;

      if (page < 1) page = 1;
      if (limit < 1) limit = 10;
      if (limit > 100) limit = 100;

      const where = {
        isDeleted: false,
        ...(search && {
          name: { contains: search, mode: "insensitive" },
        }),
        ...(categoryId && { categoryId: parseInt(categoryId, 10) }),
        ...(isActive !== undefined &&
          isActive !== "" && { isActive: isActive === "true" }),
      };

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            category: true,
            colors: {
              include: {
                images: { orderBy: { order: "asc" } },
                variants: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.product.count({ where }),
      ]);

      res.json({
        data: products,
        meta: {
          total,
          page,
          limit,
          pageCount: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Get products error", error);
      res.status(500).json({ error: "Internal server errors" });
    }
  },

  getProductById: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "id không hợp lệ" });
      }

      const product = await prisma.product.findFirst({
        where: { id, isDeleted: false },
        include: {
          category: true,
          colors: {
            include: {
              images: { orderBy: { order: "asc" } },
              variants: true,
            },
          },
        },
      });

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      console.error("Get product by id error", error);
      res.status(500).json({ error: "Internal server errors" });
    }
  },
```

- [ ] **Step 5: Đăng ký route chi tiết**

Trong `be/routes/products.js`, thêm dòng sau ngay dưới `router.get("/", productsControllers.getProducts);`:

```js
router.get("/:id", productsControllers.getProductById);
```

- [ ] **Step 6: Chạy test để xác nhận PASS**

```bash
cd be && npm test
```

Kỳ vọng: toàn bộ PASS.

- [ ] **Step 7: Commit**

```bash
git add be/controllers/products.js be/routes/products.js be/tests
git commit -m "feat: chuan hoa GET /api/products va them GET /api/products/:id"
```

---

### Task 5: `POST /api/products` có validation

**Files:**
- Modify: `be/controllers/products.js` (hàm `createProduct`)
- Create: `be/tests/products.create.test.js`

**Interfaces:**
- Consumes: `validateProductPayload` từ Task 3, `factory` từ Task 4
- Produces: `POST /api/products` → `201 Product` (kèm `category`, `images`, `variants`) hoặc `400 { error: "Dữ liệu không hợp lệ", details: string[] }`

- [ ] **Step 1: Viết test (phải fail trước)**

Tạo `be/tests/products.create.test.js`:

```js
const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, resetDb } = require("./helpers/db");
const { createCategory } = require("./helpers/factory");
const request = require("supertest");
const app = require("../app");

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await prisma.$disconnect();
});

const payload = (categoryId) => ({
  name: "Áo thun basic",
  description: "Cotton 100%",
  categoryId,
  colors: [
    {
      color: "Đen",
      colorCode: "#111111",
      images: [
        { imageUrl: "https://example.com/1.jpg" },
        { imageUrl: "https://example.com/2.jpg" },
      ],
      variants: [
        { size: "M", price: "199000", stock: "10" },
        { size: "L", price: 219000, stock: 5 },
      ],
    },
  ],
});

test("POST tạo sản phẩm kèm màu, ảnh, size", async () => {
  const category = await createCategory();

  const res = await request(app).post("/api/products").send(payload(category.id));

  assert.equal(res.status, 201);
  assert.equal(res.body.name, "Áo thun basic");
  assert.equal(res.body.colors.length, 1);
  assert.equal(res.body.colors[0].variants.length, 2);
  assert.equal(res.body.colors[0].images.length, 2);
});

test("POST đánh số order cho ảnh theo thứ tự mảng", async () => {
  const category = await createCategory();

  const res = await request(app).post("/api/products").send(payload(category.id));

  const orders = res.body.colors[0].images.map((img) => img.order);
  assert.deepEqual(orders, [0, 1]);
});

test("POST ép kiểu price/stock từ chuỗi", async () => {
  const category = await createCategory();

  const res = await request(app).post("/api/products").send(payload(category.id));

  const variantM = res.body.colors[0].variants.find((v) => v.size === "M");
  assert.equal(variantM.price, 199000);
  assert.equal(variantM.stock, 10);
});

test("POST trả 400 kèm details khi thiếu name", async () => {
  const category = await createCategory();
  const body = payload(category.id);
  delete body.name;

  const res = await request(app).post("/api/products").send(body);

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Dữ liệu không hợp lệ");
  assert.deepEqual(res.body.details, ["name là bắt buộc"]);
});

test("POST trả 400 khi categoryId không tồn tại", async () => {
  const res = await request(app).post("/api/products").send(payload(999999));

  assert.equal(res.status, 400);
  assert.deepEqual(res.body.details, ["categoryId không tồn tại"]);
});

test("POST trả 400 khi categoryId trỏ tới danh mục đã xóa mềm", async () => {
  const category = await createCategory({ isDeleted: true });

  const res = await request(app).post("/api/products").send(payload(category.id));

  assert.equal(res.status, 400);
  assert.deepEqual(res.body.details, ["categoryId không tồn tại"]);
});

test("POST không tạo bản ghi nào khi payload sai", async () => {
  const category = await createCategory();
  const body = payload(category.id);
  body.colors[0].variants.push({ size: "M", price: 1, stock: 1 });

  const res = await request(app).post("/api/products").send(body);

  assert.equal(res.status, 400);
  assert.equal(await prisma.product.count(), 0);
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
cd be && node --test tests/products.create.test.js
```

Kỳ vọng: FAIL — `res.body.details` là `undefined`, và test `categoryId không tồn tại` trả 500 thay vì 400.

- [ ] **Step 3: Viết lại `createProduct`**

Thêm dòng import ở đầu `be/controllers/products.js`, ngay dưới dòng `const prisma = require("../prisma/client");`:

```js
const { validateProductPayload } = require("../validators/products");
```

Thay toàn bộ hàm `createProduct` bằng:

```js
  createProduct: async (req, res) => {
    try {
      const { name, description, categoryId, isActive, colors } = req.body;

      const details = validateProductPayload(req.body);
      if (details.length > 0) {
        return res.status(400).json({ error: "Dữ liệu không hợp lệ", details });
      }

      const category = await prisma.category.findFirst({
        where: { id: parseInt(categoryId, 10), isDeleted: false },
      });
      if (!category) {
        return res.status(400).json({
          error: "Dữ liệu không hợp lệ",
          details: ["categoryId không tồn tại"],
        });
      }

      const product = await prisma.product.create({
        data: {
          name: name.trim(),
          description: description ?? "",
          categoryId: category.id,
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          colors: {
            create: (colors || []).map((c) => ({
              color: c.color.trim(),
              colorCode: c.colorCode || "#000000",
              images: {
                create: (c.images || []).map((img, index) => ({
                  imageUrl: img.imageUrl,
                  order: index,
                })),
              },
              variants: {
                create: (c.variants || []).map((v) => ({
                  size: v.size.trim(),
                  price: parseFloat(v.price),
                  stock: parseInt(v.stock, 10),
                })),
              },
            })),
          },
        },
        include: {
          category: true,
          colors: {
            include: {
              images: { orderBy: { order: "asc" } },
              variants: true,
            },
          },
        },
      });

      res.status(201).json(product);
    } catch (error) {
      console.error("Create product error", error);
      res.status(500).json({ error: "Internal server errors" });
    }
  },
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

```bash
cd be && npm test
```

Kỳ vọng: toàn bộ PASS.

- [ ] **Step 5: Commit**

```bash
git add be/controllers/products.js be/tests/products.create.test.js
git commit -m "feat: validate payload cho POST /api/products"
```

---

### Task 6: Test hồi quy cho `PUT /api/products/:id`

`updateProduct` đã được sửa nhưng chưa có test. Task này khóa hành vi lại, đồng thời bổ sung validation + 404.

**Files:**
- Modify: `be/controllers/products.js` (hàm `updateProduct`)
- Create: `be/tests/products.update.test.js`

**Interfaces:**
- Consumes: `validateProductPayload`, `factory`
- Produces: `PUT /api/products/:id` → `200 Product` · `400 {error, details}` · `404 {error}` · `409 {error, details}`

- [ ] **Step 1: Viết test (phải fail trước)**

Tạo `be/tests/products.update.test.js`:

```js
const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, resetDb } = require("./helpers/db");
const { createCategory, createProduct } = require("./helpers/factory");
const request = require("supertest");
const app = require("../app");

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await prisma.$disconnect();
});

// Tạo sản phẩm 1 màu "Đen" với 2 size M, L.
const seedProduct = async () => {
  const category = await createCategory();
  return createProduct({
    categoryId: category.id,
    colors: {
      create: [
        {
          color: "Đen",
          colorCode: "#000000",
          images: { create: [{ imageUrl: "https://example.com/1.jpg", order: 0 }] },
          variants: {
            create: [
              { size: "M", price: 100, stock: 1 },
              { size: "L", price: 200, stock: 2 },
            ],
          },
        },
      ],
    },
  });
};

test("PUT cập nhật trường phẳng và trả về sản phẩm mới", async () => {
  const product = await seedProduct();

  const res = await request(app)
    .put(`/api/products/${product.id}`)
    .send({ name: "Tên mới", description: "mô tả mới", categoryId: product.categoryId });

  assert.equal(res.status, 200);
  assert.equal(res.body.name, "Tên mới");
  assert.equal(res.body.description, "mô tả mới");
});

test("PUT không gửi colors thì giữ nguyên màu và size", async () => {
  const product = await seedProduct();

  await request(app)
    .put(`/api/products/${product.id}`)
    .send({ name: "Tên mới", categoryId: product.categoryId });

  assert.equal(await prisma.productColor.count(), 1);
  assert.equal(await prisma.productColorVariants.count(), 2);
});

test("PUT cập nhật giá của size đã có, không tạo bản ghi mới", async () => {
  const product = await seedProduct();

  await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: product.name,
      categoryId: product.categoryId,
      colors: [
        {
          color: "Đen",
          colorCode: "#000000",
          images: [{ imageUrl: "https://example.com/1.jpg" }],
          variants: [
            { size: "M", price: 150, stock: 9 },
            { size: "L", price: 200, stock: 2 },
          ],
        },
      ],
    });

  const variants = await prisma.productColorVariants.findMany({ orderBy: { size: "asc" } });
  assert.equal(variants.length, 2);
  const variantM = variants.find((v) => v.size === "M");
  assert.equal(variantM.price, 150);
  assert.equal(variantM.stock, 9);
});

test("PUT xóa size không còn trong payload", async () => {
  const product = await seedProduct();

  await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: product.name,
      categoryId: product.categoryId,
      colors: [
        {
          color: "Đen",
          colorCode: "#000000",
          images: [],
          variants: [{ size: "M", price: 100, stock: 1 }],
        },
      ],
    });

  const variants = await prisma.productColorVariants.findMany();
  assert.deepEqual(variants.map((v) => v.size), ["M"]);
});

test("PUT thêm màu mới", async () => {
  const product = await seedProduct();

  await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: product.name,
      categoryId: product.categoryId,
      colors: [
        {
          color: "Đen",
          colorCode: "#000000",
          images: [],
          variants: [{ size: "M", price: 100, stock: 1 }, { size: "L", price: 200, stock: 2 }],
        },
        {
          color: "Trắng",
          colorCode: "#ffffff",
          images: [{ imageUrl: "https://example.com/w.jpg" }],
          variants: [{ size: "S", price: 90, stock: 3 }],
        },
      ],
    });

  const colors = await prisma.productColor.findMany({ orderBy: { id: "asc" } });
  assert.deepEqual(colors.map((c) => c.color), ["Đen", "Trắng"]);
});

test("PUT xóa màu không còn trong payload, kể cả màu không có variant", async () => {
  const product = await seedProduct();
  const color = await prisma.productColor.findFirst();
  await prisma.productColorVariants.deleteMany({ where: { colorId: color.id } });

  await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: product.name,
      categoryId: product.categoryId,
      colors: [
        {
          color: "Trắng",
          colorCode: "#ffffff",
          images: [],
          variants: [{ size: "S", price: 90, stock: 3 }],
        },
      ],
    });

  const colors = await prisma.productColor.findMany();
  assert.deepEqual(colors.map((c) => c.color), ["Trắng"]);
});

test("PUT ghi lại ảnh theo đúng thứ tự mới", async () => {
  const product = await seedProduct();

  await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: product.name,
      categoryId: product.categoryId,
      colors: [
        {
          color: "Đen",
          colorCode: "#000000",
          images: [
            { imageUrl: "https://example.com/b.jpg" },
            { imageUrl: "https://example.com/a.jpg" },
          ],
          variants: [{ size: "M", price: 100, stock: 1 }],
        },
      ],
    });

  const images = await prisma.productColorImage.findMany({ orderBy: { order: "asc" } });
  assert.deepEqual(images.map((i) => i.imageUrl), [
    "https://example.com/b.jpg",
    "https://example.com/a.jpg",
  ]);
});

test("PUT cập nhật colorCode của màu đã có", async () => {
  const product = await seedProduct();

  await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: product.name,
      categoryId: product.categoryId,
      colors: [
        {
          color: "Đen",
          colorCode: "#123456",
          images: [],
          variants: [{ size: "M", price: 100, stock: 1 }],
        },
      ],
    });

  const color = await prisma.productColor.findFirst();
  assert.equal(color.colorCode, "#123456");
});

test("PUT trả 409 khi xóa màu có variant đã nằm trong đơn hàng", async () => {
  const product = await seedProduct();
  const variant = await prisma.productColorVariants.findFirst({ where: { size: "M" } });
  const order = await prisma.order.create({ data: { totalAmount: 100 } });
  await prisma.orderItem.create({
    data: { orderId: order.id, productVariantId: variant.id, quantity: 1, price: 100 },
  });

  const res = await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: product.name,
      categoryId: product.categoryId,
      colors: [
        {
          color: "Trắng",
          colorCode: "#ffffff",
          images: [],
          variants: [{ size: "S", price: 90, stock: 3 }],
        },
      ],
    });

  assert.equal(res.status, 409);
  assert.deepEqual(res.body.details, [{ color: "Đen", variants: ["M"] }]);
});

test("PUT trả 409 thì rollback toàn bộ, không đổi tên sản phẩm", async () => {
  const product = await seedProduct();
  const variant = await prisma.productColorVariants.findFirst({ where: { size: "M" } });
  const order = await prisma.order.create({ data: { totalAmount: 100 } });
  await prisma.orderItem.create({
    data: { orderId: order.id, productVariantId: variant.id, quantity: 1, price: 100 },
  });

  await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: "Tên đáng lẽ không được lưu",
      categoryId: product.categoryId,
      colors: [
        { color: "Trắng", colorCode: "#ffffff", images: [], variants: [{ size: "S", price: 90, stock: 3 }] },
      ],
    });

  const fresh = await prisma.product.findUnique({ where: { id: product.id } });
  assert.equal(fresh.name, product.name);
});

test("PUT trả 404 khi sản phẩm không tồn tại", async () => {
  const category = await createCategory();

  const res = await request(app)
    .put("/api/products/999999")
    .send({ name: "X", categoryId: category.id });

  assert.equal(res.status, 404);
  assert.equal(res.body.error, "Product not found");
});

test("PUT trả 400 khi payload sai", async () => {
  const product = await seedProduct();

  const res = await request(app)
    .put(`/api/products/${product.id}`)
    .send({ name: "", categoryId: product.categoryId });

  assert.equal(res.status, 400);
  assert.deepEqual(res.body.details, ["name là bắt buộc"]);
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
cd be && node --test tests/products.update.test.js
```

Kỳ vọng: các test về `400`/`404` FAIL (controller chưa có validation, và `prisma.product.update` với id không tồn tại ném `P2025` → 500). Các test đồng bộ color/variant nên PASS — chúng khóa lại hành vi vừa sửa.

- [ ] **Step 3: Thêm validation và 404 vào `updateProduct`**

Trong `be/controllers/products.js`, trong hàm `updateProduct`, thay đoạn:

```js
      const productId = parseInt(req.params.id, 10);
      const { name, description, categoryId, colors } = req.body;

      const product = await prisma.$transaction(async (tx) => {
```

bằng:

```js
      const productId = parseInt(req.params.id, 10);
      if (Number.isNaN(productId)) {
        return res.status(400).json({ error: "id không hợp lệ" });
      }

      const { name, description, categoryId, colors } = req.body;

      const details = validateProductPayload(req.body);
      if (details.length > 0) {
        return res.status(400).json({ error: "Dữ liệu không hợp lệ", details });
      }

      const existing = await prisma.product.findFirst({
        where: { id: productId, isDeleted: false },
      });
      if (!existing) {
        return res.status(404).json({ error: "Product not found" });
      }

      const product = await prisma.$transaction(async (tx) => {
```

- [ ] **Step 4: Bổ sung `category` vào dữ liệu trả về**

Vẫn trong `updateProduct`, ở lệnh `return tx.product.findUnique(...)` cuối transaction, thêm `category: true` vào `include` để `PUT` trả cùng shape với `GET`:

```js
          include: {
            category: true,
            colors: {
              include: {
                variants: true,
                images: { orderBy: { order: "asc" } },
              }
            }
          }
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

```bash
cd be && npm test
```

Kỳ vọng: toàn bộ PASS. Nếu test 409 fail với `details` rỗng, kiểm tra `.filter((v) => { return variantIdsInOrders.has(v.id); })` có `return` — thiếu `return` là đúng bug đã từng xảy ra.

- [ ] **Step 6: Commit**

```bash
git add be/controllers/products.js be/tests/products.update.test.js
git commit -m "test: khoa hanh vi dong bo color/variant cua PUT /api/products/:id"
```

---

### Task 7: Soft delete cho Product và Category

**Files:**
- Modify: `be/controllers/products.js` (thêm `deleteProduct`)
- Modify: `be/routes/products.js`
- Modify: `be/controllers/categories.js` (`getCategories`, `getCategoryById`, `deleteCategory`)
- Create: `be/tests/products.delete.test.js`
- Create: `be/tests/categories.test.js`

**Interfaces:**
- Consumes: `factory`
- Produces:
  - `DELETE /api/products/:id` → `200 { msg: "Product deleted" }` · `400` · `404`
  - `DELETE /api/categories/:id` → `200 { msg: "Category deleted" }` · `404`, đặt `isDeleted = true`

- [ ] **Step 1: Viết test (phải fail trước)**

Tạo `be/tests/products.delete.test.js`:

```js
const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, resetDb } = require("./helpers/db");
const { createProduct } = require("./helpers/factory");
const request = require("supertest");
const app = require("../app");

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await prisma.$disconnect();
});

test("DELETE đánh dấu isDeleted thay vì xóa hẳn", async () => {
  const product = await createProduct();

  const res = await request(app).delete(`/api/products/${product.id}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.msg, "Product deleted");

  const row = await prisma.product.findUnique({ where: { id: product.id } });
  assert.equal(row.isDeleted, true);
});

test("DELETE giữ nguyên màu và size của sản phẩm", async () => {
  const product = await createProduct();

  await request(app).delete(`/api/products/${product.id}`);

  assert.equal(await prisma.productColor.count(), 1);
  assert.equal(await prisma.productColorVariants.count(), 1);
});

test("DELETE trả 404 khi sản phẩm không tồn tại", async () => {
  const res = await request(app).delete("/api/products/999999");
  assert.equal(res.status, 404);
});

test("DELETE hai lần thì lần thứ hai trả 404", async () => {
  const product = await createProduct();

  await request(app).delete(`/api/products/${product.id}`);
  const res = await request(app).delete(`/api/products/${product.id}`);

  assert.equal(res.status, 404);
});

test("DELETE trả 400 khi id không phải số", async () => {
  const res = await request(app).delete("/api/products/abc");
  assert.equal(res.status, 400);
});
```

Tạo `be/tests/categories.test.js`:

```js
const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, resetDb } = require("./helpers/db");
const { createCategory } = require("./helpers/factory");
const request = require("supertest");
const app = require("../app");

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await prisma.$disconnect();
});

test("DELETE /api/categories/:id là soft delete", async () => {
  const category = await createCategory();

  const res = await request(app).delete(`/api/categories/${category.id}`);

  assert.equal(res.status, 200);
  const row = await prisma.category.findUnique({ where: { id: category.id } });
  assert.equal(row.isDeleted, true);
});

test("DELETE danh mục không xóa sản phẩm thuộc danh mục đó", async () => {
  const category = await createCategory();
  await prisma.product.create({
    data: { name: "SP", description: "", categoryId: category.id },
  });

  await request(app).delete(`/api/categories/${category.id}`);

  assert.equal(await prisma.product.count(), 1);
});

test("GET /api/categories bỏ qua danh mục đã xóa mềm", async () => {
  const category = await createCategory();
  await request(app).delete(`/api/categories/${category.id}`);

  const res = await request(app).get("/api/categories");

  assert.equal(res.body.data.length, 0);
  assert.equal(res.body.meta.total, 0);
});

test("GET /api/categories/:id trả 404 với danh mục đã xóa mềm", async () => {
  const category = await createCategory();
  await request(app).delete(`/api/categories/${category.id}`);

  const res = await request(app).get(`/api/categories/${category.id}`);

  assert.equal(res.status, 404);
});

test("DELETE /api/categories/:id trả 404 khi không tồn tại", async () => {
  const res = await request(app).delete("/api/categories/999999");
  assert.equal(res.status, 404);
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

```bash
cd be && node --test tests/products.delete.test.js tests/categories.test.js
```

Kỳ vọng: FAIL — chưa có route DELETE products; `deleteCategory` đang hard delete.

- [ ] **Step 3: Thêm `deleteProduct`**

Trong `be/controllers/products.js`, thêm hàm sau ngay trước dấu `};` đóng object `productsControllers` (nhớ dấu phẩy sau hàm `updateProduct`):

```js
  deleteProduct: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "id không hợp lệ" });
      }

      const existing = await prisma.product.findFirst({
        where: { id, isDeleted: false },
      });
      if (!existing) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Soft delete: giữ lại bản ghi để không phá vỡ lịch sử đơn hàng.
      await prisma.product.update({
        where: { id },
        data: { isDeleted: true },
      });

      res.json({ msg: "Product deleted" });
    } catch (error) {
      console.error("Delete product error", error);
      res.status(500).json({ error: "Internal server errors" });
    }
  },
```

Trong `be/routes/products.js`, thêm dòng cuối trước `module.exports`:

```js
router.delete("/:id", productsControllers.deleteProduct);
```

- [ ] **Step 4: Chuyển Categories sang soft delete**

Trong `be/controllers/categories.js`:

Trong `getCategories`, thêm `isDeleted: false,` làm dòng đầu tiên bên trong object `where`:

```js
      const where = {
        isDeleted: false,
        ...(search && {
```

Trong `getCategoryById`, thay `prisma.category.findUnique({ where: { id: Number(id) } })` bằng:

```js
      const category = await prisma.category.findFirst({
        where: {
          id: Number(id),
          isDeleted: false,
        },
      });
```

Thay toàn bộ hàm `deleteCategory` bằng:

```js
  deleteCategory: async (req,res) =>{
    try{
      const {id} = req.params;
      const existing = await prisma.category.findFirst({
        where: {
          id: Number(id),
          isDeleted: false,
        },
      });
      if(!existing){
        return res.status(404).json({
          message: "Category not found"
        });
      }
      // Soft delete: sản phẩm thuộc danh mục này vẫn được giữ lại.
      await prisma.category.update({
        where: {
          id: Number(id),
        },
        data: {
          isDeleted: true,
        },
      });
      res.json({
        msg: "Category deleted"
      })
    }catch(error){
      console.error(error);
      res.status(400).json({
        error,
      });
    }
  }
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

```bash
cd be && npm test
```

Kỳ vọng: toàn bộ PASS.

- [ ] **Step 6: Commit**

```bash
git add be/controllers be/routes/products.js be/tests
git commit -m "feat: soft delete cho product va category"
```

---

### Task 8: Tách logic tính giá/tồn kho ở FE và test bằng Vitest

**Files:**
- Create: `fe/src/pages/Products/productUtils.ts`
- Create: `fe/src/pages/Products/productUtils.test.ts`
- Modify: `fe/src/pages/Products/ProductsTable.tsx`
- Modify: `fe/src/pages/Products/Type.ts`
- Modify: `fe/package.json`
- Modify: `fe/vite.config.ts`

**Interfaces:**
- Consumes: không có
- Produces:
  - `formatPriceRange(product: Product): string`
  - `getTotalStock(product: Product): number`
  - `getFirstImageUrl(product: Product): string | undefined`
  - Type `Product` bổ sung `isActive`, `isDeleted`, `createdAt`, `updatedAt`; `Color` bổ sung `id?`; `Image` có `id?`

- [ ] **Step 1: Cài Vitest**

```bash
cd fe
npm install --save-dev vitest
```

Thêm vào `fe/package.json`, trong `scripts`:

```json
    "test": "vitest run",
```

Thay `fe/vite.config.ts` bằng:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
```

Không cần sửa `tsconfig.app.json`: file test import `describe`/`it`/`expect` tường minh từ `"vitest"`,
nên `tsc -b` vẫn typecheck được và việc để nó kiểm luôn file test là có lợi.

- [ ] **Step 2: Cập nhật type `Product`**

Thay toàn bộ `fe/src/pages/Products/Type.ts` bằng:

```ts
export interface Variant {
  id?: number;
  size: string;
  price: number;
  stock: number;
}

export interface ProductImage {
  id?: number;
  imageUrl: string;
  order?: number;
}

export interface Color {
  id?: number;
  color: string;
  colorCode: string;
  images: ProductImage[];
  variants: Variant[];
}

export interface Product {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  categoryId: number;
  category: {
    id: number;
    name: string;
  };
  colors: Color[];
}

export interface ProductPayload {
  name: string;
  description?: string;
  categoryId: number;
  isActive?: boolean;
  colors: Color[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export interface ProductQuery {
  page: number;
  limit: number;
  search?: string;
  categoryId?: number | string;
  isActive?: string | boolean;
}

export interface ProductListResponse {
  data: Product[];
  meta: PaginationMeta;
}
```

- [ ] **Step 3: Viết test (phải fail trước)**

Tạo `fe/src/pages/Products/productUtils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Product } from "./Type";
import { formatPriceRange, getFirstImageUrl, getTotalStock } from "./productUtils";

const makeProduct = (colors: Product["colors"]): Product => ({
  id: 1,
  name: "SP",
  description: "",
  isActive: true,
  isDeleted: false,
  createdAt: "",
  updatedAt: "",
  categoryId: 1,
  category: { id: 1, name: "Áo" },
  colors,
});

describe("formatPriceRange", () => {
  it("trả '-' khi không có variant nào", () => {
    expect(formatPriceRange(makeProduct([]))).toBe("-");
  });

  it("trả một giá khi mọi variant cùng giá", () => {
    const product = makeProduct([
      { color: "Đen", colorCode: "#000", images: [], variants: [
        { size: "M", price: 199000, stock: 1 },
        { size: "L", price: 199000, stock: 1 },
      ] },
    ]);
    expect(formatPriceRange(product)).toBe("199.000");
  });

  it("trả khoảng giá min-max gộp qua nhiều màu", () => {
    const product = makeProduct([
      { color: "Đen", colorCode: "#000", images: [], variants: [{ size: "M", price: 199000, stock: 1 }] },
      { color: "Trắng", colorCode: "#fff", images: [], variants: [{ size: "M", price: 99000, stock: 1 }] },
    ]);
    expect(formatPriceRange(product)).toBe("99.000 - 199.000");
  });
});

describe("getTotalStock", () => {
  it("cộng stock qua mọi màu và size", () => {
    const product = makeProduct([
      { color: "Đen", colorCode: "#000", images: [], variants: [
        { size: "M", price: 1, stock: 3 },
        { size: "L", price: 1, stock: 4 },
      ] },
      { color: "Trắng", colorCode: "#fff", images: [], variants: [{ size: "M", price: 1, stock: 5 }] },
    ]);
    expect(getTotalStock(product)).toBe(12);
  });

  it("trả 0 khi không có màu", () => {
    expect(getTotalStock(makeProduct([]))).toBe(0);
  });
});

describe("getFirstImageUrl", () => {
  it("trả ảnh đầu tiên của màu đầu tiên", () => {
    const product = makeProduct([
      { color: "Đen", colorCode: "#000", images: [{ imageUrl: "a.jpg" }, { imageUrl: "b.jpg" }], variants: [] },
    ]);
    expect(getFirstImageUrl(product)).toBe("a.jpg");
  });

  it("trả undefined khi màu chưa có ảnh", () => {
    const product = makeProduct([
      { color: "Đen", colorCode: "#000", images: [], variants: [] },
    ]);
    expect(getFirstImageUrl(product)).toBeUndefined();
  });
});
```

- [ ] **Step 4: Chạy test để xác nhận FAIL**

```bash
cd fe && npx vitest run
```

Kỳ vọng: FAIL với `Failed to resolve import "./productUtils"`.

- [ ] **Step 5: Viết `productUtils.ts`**

Tạo `fe/src/pages/Products/productUtils.ts`:

```ts
import type { Product, Variant } from "./Type";

const formatVnd = (value: number) => value.toLocaleString("vi-VN");

const getVariants = (product: Product): Variant[] =>
  (product.colors || []).flatMap((color) => color.variants || []);

export const getTotalStock = (product: Product): number =>
  getVariants(product).reduce((sum, variant) => sum + (variant.stock || 0), 0);

export const formatPriceRange = (product: Product): string => {
  const prices = getVariants(product)
    .map((variant) => variant.price)
    .filter((price) => Number.isFinite(price));

  if (prices.length === 0) return "-";

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return min === max ? formatVnd(min) : `${formatVnd(min)} - ${formatVnd(max)}`;
};

export const getFirstImageUrl = (product: Product): string | undefined =>
  product.colors?.[0]?.images?.[0]?.imageUrl;
```

- [ ] **Step 6: Chạy test để xác nhận PASS**

```bash
cd fe && npx vitest run
```

Kỳ vọng: `7 passed`.

- [ ] **Step 7: Dùng lại các hàm này trong `ProductsTable`**

Thay toàn bộ `fe/src/pages/Products/ProductsTable.tsx` bằng:

```tsx
import { Table } from "antd";
import type { Product } from "./Type";
import TableActions from "../../components/common/TableAction";
import { formatPriceRange, getFirstImageUrl, getTotalStock } from "./productUtils";

type Props = {
  products: Product[];
  loading?: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
};

export default function ProductsTable({
  products,
  loading,
  total,
  page,
  pageSize,
  onPageChange,
  onEdit,
  onDelete,
}: Props) {
  const columns = [
    {
      title: "Ảnh",
      key: "image",
      width: 80,
      render: (_: unknown, record: Product) => {
        const imageUrl = getFirstImageUrl(record);
        return imageUrl ? (
          <img
            src={imageUrl}
            alt={record.name}
            style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4 }}
          />
        ) : (
          "-"
        );
      },
    },
    {
      title: "Tên sản phẩm",
      key: "name",
      dataIndex: "name",
      render: (text: string) => <b>{text}</b>,
    },
    {
      title: "Danh mục",
      key: "category",
      render: (_: unknown, record: Product) => record.category?.name ?? "-",
    },
    {
      title: "Giá",
      key: "price",
      render: (_: unknown, record: Product) => formatPriceRange(record),
    },
    {
      title: "Tổng kho",
      key: "stock",
      render: (_: unknown, record: Product) => getTotalStock(record),
    },
    {
      title: "Hành động",
      key: "action",
      render: (_: unknown, record: Product) => (
        <TableActions
          showEdit
          showDelete
          onEdit={() => onEdit(record)}
          onDelete={() => onDelete(record.id)}
        />
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={products}
      loading={loading}
      rowKey="id"
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        onChange: onPageChange,
      }}
    />
  );
}
```

- [ ] **Step 8: Xác nhận build sạch**

```bash
cd fe && npm run build
```

Kỳ vọng: exit 0. Sẽ có lỗi ở `Products.tsx` vì props của `ProductsTable` đã đổi — **đó là bình thường**, Task 9 sửa. Nếu muốn build xanh ngay tại đây, tạm truyền đủ props ở `Products.tsx` rồi Task 9 viết lại.

- [ ] **Step 9: Commit**

```bash
git add fe/src/pages/Products fe/package.json fe/package-lock.json fe/vite.config.ts
git commit -m "feat: tach logic gia/ton kho ra productUtils va them vitest"
```

---

### Task 9: `ProductService` và nối trang Products với API

**Files:**
- Create: `fe/src/services/ProductService.ts`
- Modify: `fe/src/pages/Products/Products.tsx`

**Interfaces:**
- Consumes: `Product`, `ProductPayload`, `ProductQuery`, `ProductListResponse` từ Task 8; `ProductsTable` props từ Task 8
- Produces: `productService` với `getProducts`, `getProductById`, `createProduct`, `updateProduct`, `deleteProduct`

- [ ] **Step 1: Viết `ProductService`**

Tạo `fe/src/services/ProductService.ts`:

```ts
import type {
  Product,
  ProductListResponse,
  ProductPayload,
  ProductQuery,
} from "../pages/Products/Type";
import axiosInstance from "../utils/axiosInstance";

const productService = {
  getProducts: async (params: ProductQuery) => {
    const res = await axiosInstance.get<ProductListResponse>("/products", {
      params,
    });
    return res.data;
  },

  getProductById: async (id: number) => {
    const res = await axiosInstance.get<Product>(`/products/${id}`);
    return res.data;
  },

  createProduct: async (data: ProductPayload) => {
    const res = await axiosInstance.post<Product>("/products", data);
    return res.data;
  },

  updateProduct: async (id: number, data: ProductPayload) => {
    const res = await axiosInstance.put<Product>(`/products/${id}`, data);
    return res.data;
  },

  deleteProduct: async (id: number) => {
    const res = await axiosInstance.delete(`/products/${id}`);
    return res.data;
  },
};

export default productService;
```

- [ ] **Step 2: Viết lại trang Products**

Thay toàn bộ `fe/src/pages/Products/Products.tsx` bằng:

```tsx
import { useContext, useEffect, useState } from "react";
import { Button, message } from "antd";

import AppFilters, { type FilterConfig } from "../../components/common/AppFilters";
import categoryService from "../../services/CategoryService";
import productService from "../../services/ProductService";
import type { CategoriesResponse } from "../Categories/Types";
import type { PaginationMeta, Product, ProductQuery } from "./Type";
import { ThemeContext } from "../../contexts/ThemeContext";
import ProductsTable from "./ProductsTable";
import ModalProducts from "./Modal";

const Products = () => {
  const { isDark } = useContext(ThemeContext);
  const [categories, setCategories] = useState<CategoriesResponse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    pageCount: 0,
  });
  const [query, setQuery] = useState<ProductQuery>({
    page: 1,
    limit: 10,
    search: "",
    categoryId: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);

  const fetchCategories = async () => {
    try {
      const res = await categoryService.getCategories({
        isActive: true,
        page: 1,
        limit: 100,
      });
      setCategories(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await productService.getProducts(query);
      setProducts(res.data);
      setMeta(res.meta);
    } catch (error) {
      console.error(error);
      message.error("Không tải được danh sách sản phẩm");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (values: Record<string, any>) => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      search: values?.search ?? "",
      categoryId: values?.categoryId ?? "",
    }));
  };

  const handlePageChange = (page: number, limit: number) => {
    setQuery((prev) => ({ ...prev, page, limit }));
  };

  const handleCreate = () => {
    setEditingId(undefined);
    setIsOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setIsOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await productService.deleteProduct(id);
      message.success("Xóa sản phẩm thành công");
      fetchProducts();
    } catch (error) {
      console.error(error);
      message.error("Xóa sản phẩm thất bại");
    }
  };

  const productsFilter: FilterConfig[] = [
    {
      type: "input",
      name: "search",
      placeholder: "Tìm kiếm sản phẩm",
      label: "Tìm kiếm",
    },
    {
      type: "select",
      name: "categoryId",
      placeholder: "Chọn danh mục",
      options: [
        { label: "Tất cả", value: "" },
        ...categories.map((c) => ({ label: c.name, value: c.id })),
      ],
      label: "Danh mục",
    },
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [query.page, query.limit, query.search, query.categoryId]);

  return (
    <div
      style={{
        padding: 24,
        borderRadius: 8,
        background: isDark ? "#262626" : "#fff",
        boxShadow: isDark
          ? "0 2px 8px rgba(0, 0, 0, 0.6)"
          : "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div className="flex items-end justify-between mb-10">
        <AppFilters filters={productsFilter} onChange={handleFilterChange} />
        <Button type="primary" onClick={handleCreate}>
          + Tạo sản phẩm mới
        </Button>
      </div>

      <ProductsTable
        products={products}
        loading={isLoading}
        total={meta.total}
        page={query.page}
        pageSize={query.limit}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ModalProducts
        open={isOpen}
        productId={editingId}
        categories={categories}
        onClose={() => setIsOpen(false)}
        onSuccess={fetchProducts}
      />
    </div>
  );
};

export default Products;
```

- [ ] **Step 3: Xác nhận lỗi build chỉ còn ở modal chưa tồn tại**

```bash
cd fe && npm run build
```

Kỳ vọng: FAIL với `Cannot find module './Modal'`. Đây là lỗi duy nhất được phép còn lại. Nếu có lỗi khác, sửa trước khi sang Task 10.

- [ ] **Step 4: Commit**

```bash
git add fe/src/services/ProductService.ts fe/src/pages/Products/Products.tsx
git commit -m "feat: noi trang Products voi API"
```

---

### Task 10: Modal tạo/sửa sản phẩm

**Files:**
- Create: `fe/src/pages/Products/Modal.tsx`

**Interfaces:**
- Consumes: `productService` (Task 9), `AppModal`, `CategoriesResponse`, `ProductPayload`
- Produces: `ModalProducts` với props `{ open, productId?, categories, onClose, onSuccess }`

- [ ] **Step 1: Viết modal**

Tạo `fe/src/pages/Products/Modal.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Select, Space, Switch, message } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import axios from "axios";

import AppModal from "../../components/common/AppModal";
import productService from "../../services/ProductService";
import type { CategoriesResponse } from "../Categories/Types";
import type { ProductPayload } from "./Type";

type Props = {
  open: boolean;
  productId?: number;
  categories: CategoriesResponse[];
  onClose: () => void;
  onSuccess: () => void;
};

const emptyColor = { color: "", colorCode: "#000000", images: [], variants: [] };

const ModalProducts = ({ open, productId, categories, onClose, onSuccess }: Props) => {
  const [form] = Form.useForm<ProductPayload>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (productId) {
      productService.getProductById(productId).then((product) => {
        form.setFieldsValue({
          name: product.name,
          description: product.description,
          categoryId: product.categoryId,
          isActive: product.isActive,
          colors: product.colors.map((color) => ({
            color: color.color,
            colorCode: color.colorCode,
            images: color.images.map((image) => ({ imageUrl: image.imageUrl })),
            variants: color.variants.map((variant) => ({
              size: variant.size,
              price: variant.price,
              stock: variant.stock,
            })),
          })),
        });
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true, colors: [] } as ProductPayload);
    }
  }, [open, productId, form]);

  const handleOk = async () => {
    let values: ProductPayload;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd đã hiển thị lỗi ngay trên form
    }

    try {
      setSubmitting(true);
      if (productId) {
        await productService.updateProduct(productId, values);
        message.success("Cập nhật sản phẩm thành công");
      } else {
        await productService.createProduct(values);
        message.success("Tạo sản phẩm thành công");
      }
      onClose();
      onSuccess();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const blocked = error.response.data?.details ?? [];
        const text = blocked
          .map((item: { color: string; variants: string[] }) =>
            `${item.color} (${item.variants.join(", ")})`
          )
          .join("; ");
        // Không đóng modal: người dùng cần sửa lại lựa chọn của mình.
        message.error(`Không thể xóa màu/size đã có trong đơn hàng: ${text}`);
      } else if (axios.isAxiosError(error) && error.response?.status === 400) {
        message.error((error.response.data?.details ?? []).join(" · ") || "Dữ liệu không hợp lệ");
      } else {
        console.error(error);
        message.error("Lưu sản phẩm thất bại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      title={productId ? "Chỉnh sửa sản phẩm" : "Tạo sản phẩm mới"}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={submitting}
      okText={productId ? "Lưu" : "Tạo"}
      cancelText="Hủy"
      width={840}
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="Tên sản phẩm"
          name="name"
          rules={[{ required: true, message: "Vui lòng nhập tên sản phẩm" }]}
        >
          <Input placeholder="Nhập tên sản phẩm" />
        </Form.Item>

        <Form.Item
          label="Danh mục"
          name="categoryId"
          rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}
        >
          <Select
            placeholder="Chọn danh mục"
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Form.Item>

        <Form.Item label="Mô tả" name="description">
          <Input.TextArea rows={3} placeholder="Nhập mô tả" />
        </Form.Item>

        <Form.Item label="Trạng thái" name="isActive" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.List name="colors">
          {(colorFields, { add: addColor, remove: removeColor }) => (
            <>
              {colorFields.map((colorField) => (
                <Card
                  key={colorField.key}
                  size="small"
                  className="mb-4"
                  title={`Màu #${colorField.name + 1}`}
                  extra={
                    <DeleteOutlined
                      style={{ color: "red", cursor: "pointer" }}
                      onClick={() => removeColor(colorField.name)}
                    />
                  }
                >
                  <Space align="baseline" wrap>
                    <Form.Item
                      label="Tên màu"
                      name={[colorField.name, "color"]}
                      rules={[{ required: true, message: "Nhập tên màu" }]}
                    >
                      <Input placeholder="Ví dụ: Đen" style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item label="Mã màu" name={[colorField.name, "colorCode"]}>
                      <Input placeholder="#000000" style={{ width: 140 }} />
                    </Form.Item>
                  </Space>

                  <Form.List name={[colorField.name, "images"]}>
                    {(imageFields, { add: addImage, remove: removeImage }) => (
                      <>
                        {imageFields.map((imageField) => (
                          <Space key={imageField.key} align="baseline">
                            <Form.Item
                              label="Link ảnh"
                              name={[imageField.name, "imageUrl"]}
                              rules={[{ required: true, message: "Nhập link ảnh" }]}
                            >
                              <Input placeholder="https://..." style={{ width: 420 }} />
                            </Form.Item>
                            <DeleteOutlined
                              style={{ color: "red", cursor: "pointer" }}
                              onClick={() => removeImage(imageField.name)}
                            />
                          </Space>
                        ))}
                        <Form.Item>
                          <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => addImage({ imageUrl: "" })}
                          >
                            Thêm ảnh
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>

                  <Form.List name={[colorField.name, "variants"]}>
                    {(variantFields, { add: addVariant, remove: removeVariant }) => (
                      <>
                        {variantFields.map((variantField) => (
                          <Space key={variantField.key} align="baseline" wrap>
                            <Form.Item
                              label="Size"
                              name={[variantField.name, "size"]}
                              rules={[{ required: true, message: "Nhập size" }]}
                            >
                              <Input placeholder="M" style={{ width: 100 }} />
                            </Form.Item>
                            <Form.Item
                              label="Giá"
                              name={[variantField.name, "price"]}
                              rules={[{ required: true, message: "Nhập giá" }]}
                            >
                              <InputNumber min={0} style={{ width: 160 }} />
                            </Form.Item>
                            <Form.Item
                              label="Tồn kho"
                              name={[variantField.name, "stock"]}
                              rules={[{ required: true, message: "Nhập tồn kho" }]}
                            >
                              <InputNumber min={0} step={1} style={{ width: 120 }} />
                            </Form.Item>
                            <DeleteOutlined
                              style={{ color: "red", cursor: "pointer" }}
                              onClick={() => removeVariant(variantField.name)}
                            />
                          </Space>
                        ))}
                        <Form.Item>
                          <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => addVariant({ size: "", price: 0, stock: 0 })}
                          >
                            Thêm size
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>
                </Card>
              ))}

              <Form.Item>
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => addColor(emptyColor)}>
                  Thêm màu
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </AppModal>
  );
};

export default ModalProducts;
```

Lưu ý về `Form.List` lồng nhau: bên trong một `Form.List` con, `name` của `Form.Item` chỉ cần **tương đối** so với field cha (`[imageField.name, "imageUrl"]`), không lặp lại `colorField.name`. Viết `[colorField.name, imageField.name, "imageUrl"]` là sai và sẽ làm giá trị không bind.

- [ ] **Step 2: Xác nhận build sạch**

```bash
cd fe && npm run build && npx vitest run
```

Kỳ vọng: build exit 0, vitest `7 passed`.

- [ ] **Step 3: Kiểm thử tay end-to-end**

Mở 2 terminal:

```bash
cd be && npm run dev
```

```bash
cd fe && npm run dev
```

Vào `http://localhost:5173/products` và kiểm lần lượt:

1. Bấm `+ Tạo sản phẩm mới` → thêm 2 màu, mỗi màu 2 size và 1 ảnh → `Tạo`. Bảng hiện sản phẩm mới, cột Giá là khoảng min–max, Tổng kho là tổng 4 size.
2. Bấm icon sửa → form hiện đúng dữ liệu cũ (đủ màu/size/ảnh). Xóa 1 size, đổi tên, `Lưu` → reload trang, dữ liệu đúng, không sinh màu/size trùng.
3. Bấm icon xóa → `Popconfirm` → xác nhận. Sản phẩm biến mất khỏi bảng. Kiểm DB: `SELECT id, name, "isDeleted" FROM "Product";` — bản ghi vẫn còn với `isDeleted = true`.
4. Gõ vào ô Tìm kiếm → danh sách lọc đúng. Chọn danh mục → lọc đúng. Đổi trang / đổi số dòng mỗi trang → đúng.
5. Bật dark mode → bảng và modal vẫn đọc được.

- [ ] **Step 4: Commit**

```bash
git add fe/src/pages/Products/Modal.tsx
git commit -m "feat: modal tao/sua san pham voi nhieu mau va size"
```

---

## Checklist nghiệm thu cuối

- [ ] `cd be && npm test` — PASS, không test nào bị skip
- [ ] `cd fe && npm run build` — exit 0
- [ ] `cd fe && npx vitest run` — PASS
- [ ] Kiểm thử tay 5 mục ở Task 10 Step 3 đều đúng
- [ ] `git status` sạch
