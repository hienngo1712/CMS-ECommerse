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
