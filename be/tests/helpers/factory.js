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
