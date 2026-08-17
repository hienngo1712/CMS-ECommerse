const prisma = require("../prisma/client");
const { validateProductPayload } = require("../validators/products");

// Shape include dùng chung cho mọi response trả về một sản phẩm đầy đủ
const PRODUCT_INCLUDE = {
  category: true,
  colors: {
    include: {
      images: { orderBy: { order: "asc" } },
      variants: true,
    },
  },
};

const productsControllers = {
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
        include: PRODUCT_INCLUDE,
      });

      res.status(201).json(product);
    } catch (error) {
      console.error("Create product error", error);
      res.status(500).json({ error: "Internal server errors" });
    }
  },

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
          include: PRODUCT_INCLUDE,
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
        include: PRODUCT_INCLUDE,
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

  updateProduct: async (req, res) => {
    try {
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
        await tx.product.update({
          where: {
            id: productId
          },
          data: {
            name,
            description,
            categoryId: categoryId === undefined ? undefined : parseInt(categoryId, 10)
          }
        });

        if(colors){
          const existingColors = await tx.productColor.findMany({
            where: {
              productId
            },
            include:{
              variants:{
                include:{
                  orderItems: true
                },
              },
              images: true,
            },
          });

          const variantIdsInOrders = new Set();

          existingColors.forEach((color) => {
            color.variants.forEach((variant) => {
              if(variant.orderItems.length > 0){
                variantIdsInOrders.add(variant.id);
              }
            });
          });

          // Màu nào còn sót lại trong map sau vòng lặp là màu client đã bỏ đi
          const remainingColorMap = new Map();
          existingColors.forEach((color)=>{
            remainingColorMap.set(color.color, color);
          });

          for(const incomingColor of colors){
            const existingColor = remainingColorMap.get(incomingColor.color);
            remainingColorMap.delete(incomingColor.color);

            if(!existingColor){
              await tx.productColor.create({
                data: {
                  productId,
                  color: incomingColor.color,
                  colorCode: incomingColor.colorCode || "#000000",
                  images: {
                    create: (incomingColor.images || []).map((img, index) => ({
                      imageUrl: img.imageUrl,
                      order: index,
                    })),
                  },
                  variants: {
                    create: (incomingColor.variants || []).map((v) => ({
                      size: v.size,
                      price: parseFloat(v.price),
                      stock: parseInt(v.stock, 10),
                    }))
                  }
                }
              });
              continue;
            }

            await tx.productColorImage.deleteMany({
              where:{
                colorId: existingColor.id,
              },
            });

            if(incomingColor.images?.length){
              await tx.productColorImage.createMany({
                data: incomingColor.images.map((img,index) => ({
                  colorId: existingColor.id,
                  imageUrl: img.imageUrl,
                  order: index
                })),
              });
            }

            await tx.productColor.update({
              where: {
                id: existingColor.id,
              },
              data: {
                colorCode: incomingColor.colorCode || "#000000",
              },
            });

            const existingVariantMap = new Map();
            existingColor.variants.forEach((v)=> {
              existingVariantMap.set(v.size, v);
            });

            const incomingVariantSizes = new Set(
              (incomingColor.variants || []).map((v)=> v.size)
            );

            for(const existingVariant of existingColor.variants) {
              if(!incomingVariantSizes.has(existingVariant.size) && !variantIdsInOrders.has(existingVariant.id)) {
                 await tx.productColorVariants.delete({
                  where: {
                    id: existingVariant.id,
                  },
                 });
              }
            }

            for (const incomingVariant of incomingColor.variants || []){
              const existingVariant = existingVariantMap.get(incomingVariant.size);

              if(existingVariant) {
                await tx.productColorVariants.update({
                  where: {
                    id: existingVariant.id,
                  },
                  data: {
                    price: parseFloat(incomingVariant.price),
                    stock: parseInt(incomingVariant.stock, 10),
                  },
                });
              } else {
                await tx.productColorVariants.create({
                  data: {
                    colorId: existingColor.id,
                    size: incomingVariant.size,
                    price: parseFloat(incomingVariant.price),
                    stock: parseInt(incomingVariant.stock, 10),
                  }
                })
              }
            }
          }

          const colorsBlockedByOrders = [];
          const colorsToDelete = [];
          for( const [colorName,existingColor] of remainingColorMap) {
            const variantInOrders = existingColor.variants.filter((v) => {
              return variantIdsInOrders.has(v.id);
            });

            if(variantInOrders.length > 0) {
              colorsBlockedByOrders.push({
                color: colorName,
                variants: variantInOrders.map((v) => v.size),
              });
            } else {
              colorsToDelete.push(existingColor);

            }
          }
          // Trả lỗi chặn khi user cố tình xóa sản phẩm khách hàng đã đặt
          if(colorsBlockedByOrders.length > 0) {
            throw new Error(
              `ORDERED_VARIANTS_EXIST:${JSON.stringify(colorsBlockedByOrders)}`
            )
          }
          //Xóa an toàn các bảng con trước khi xóa màu
          for(const color of colorsToDelete) {
            await tx.productColorVariants.deleteMany({
              where: {
                colorId: color.id,
              },
            });
            await tx.productColorImage.deleteMany({
              where: {
                colorId: color.id,
              },
            });
            await tx.productColor.delete({
              where: {
                id: color.id,
              },
            });
          }
        }

        // Trả về dữ liệu sản phẩm sau khi update để phản hồi
        return tx.product.findUnique({
          where: {
            id: productId,
          },
          include: PRODUCT_INCLUDE,
        })
      })

      res.status(200).json(product);
    } catch (error) {
      if(typeof error.message === "string" && error.message.startsWith("ORDERED_VARIANTS_EXIST:")){
        return res.status(409).json({
          error: "Không thể xóa màu/size đã tồn tại trong đơn hàng",
          details: JSON.parse(error.message.slice("ORDERED_VARIANTS_EXIST:".length)),
        });
      }
      console.error("Update product error", error);
      res.status(500).json({
        error: "Internal server errors"
      });
    }
  },

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
};

module.exports = productsControllers;
