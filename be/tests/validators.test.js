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
