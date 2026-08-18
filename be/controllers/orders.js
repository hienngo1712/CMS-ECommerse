const prisma = require("../prisma/client");
const {
  validateOrderPayload,
  ORDER_STATUSES,
  STATUS_FLOW,
} = require("../validators/orders");

// Shape include dùng chung cho mọi response trả về một đơn đầy đủ.
const ORDER_INCLUDE = {
  address: true,
  user: { select: { id: true, username: true, email: true } },
  items: {
    include: {
      variant: {
        include: {
          color: {
            include: { product: { select: { id: true, name: true } } },
          },
        },
      },
    },
  },
};

// Ném từ trong transaction để cả đơn lẫn phần trừ kho cùng bị rollback.
const OUT_OF_STOCK = "OUT_OF_STOCK:";

const ordersControllers = {
  createOrder: async (req, res) => {
    try {
      const errors = validateOrderPayload(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ error: "Dữ liệu không hợp lệ", details: errors });
      }

      const { items, address, userId } = req.body;

      if (userId !== undefined && userId !== null) {
        const user = await prisma.user.findFirst({
          where: { id: Number(userId), isDeleted: false },
        });
        if (!user) {
          return res
            .status(400)
            .json({ error: "Dữ liệu không hợp lệ", details: ["userId không tồn tại"] });
        }
      }

      const variantIds = items.map((item) => Number(item.variantId));
      const variants = await prisma.productColorVariants.findMany({
        where: { id: { in: variantIds } },
      });

      if (variants.length !== variantIds.length) {
        const found = new Set(variants.map((v) => v.id));
        const missing = variantIds.filter((id) => !found.has(id));
        return res.status(400).json({
          error: "Dữ liệu không hợp lệ",
          details: missing.map((id) => `variantId ${id} không tồn tại`),
        });
      }

      const variantById = new Map(variants.map((v) => [v.id, v]));

      // Giá lấy từ DB, không lấy từ body — xem QĐ-2. Client gửi kèm price thì
      // giá trị đó bị bỏ qua hoàn toàn.
      const lines = items.map((item) => {
        const variant = variantById.get(Number(item.variantId));
        return {
          variantId: variant.id,
          quantity: Number(item.quantity),
          price: variant.price,
          size: variant.size,
          stock: variant.stock,
        };
      });

      const thieuHang = lines.filter((line) => line.stock < line.quantity);
      if (thieuHang.length > 0) {
        return res.status(400).json({
          error: "Không đủ tồn kho",
          details: thieuHang.map(
            (line) => `Size ${line.size} chỉ còn ${line.stock}, cần ${line.quantity}`
          ),
        });
      }

      const totalAmount = lines.reduce(
        (sum, line) => sum + line.price * line.quantity,
        0
      );

      const order = await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            userId: userId ?? null,
            totalAmount,
            items: {
              create: lines.map((line) => ({
                productVariantId: line.variantId,
                quantity: line.quantity,
                price: line.price,
              })),
            },
            address: {
              create: {
                fullname: address.fullname.trim(),
                phone: address.phone.trim(),
                street: address.street.trim(),
                city: address.city.trim(),
              },
            },
          },
          include: ORDER_INCLUDE,
        });

        for (const line of lines) {
          // Điều kiện `stock >= quantity` nằm ngay trong câu UPDATE chứ không
          // dựa vào lần đọc phía trên: hai người đặt cùng lúc thì cả hai đều
          // đọc thấy còn hàng, chỉ câu UPDATE mới phân định được ai lấy được.
          const { count } = await tx.productColorVariants.updateMany({
            where: { id: line.variantId, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
          });
          if (count === 0) {
            throw new Error(`${OUT_OF_STOCK}${line.size}`);
          }
        }

        return created;
      });

      res.status(201).json(order);
    } catch (error) {
      if (typeof error.message === "string" && error.message.startsWith(OUT_OF_STOCK)) {
        return res.status(400).json({
          error: "Không đủ tồn kho",
          details: [`Size ${error.message.slice(OUT_OF_STOCK.length)} vừa hết hàng`],
        });
      }
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  getOrders: async (req, res) => {
    try {
      let page = parseInt(req.query.page, 10) || 1;
      let limit = parseInt(req.query.limit, 10) || 10;
      const search = req.query.search || "";
      const status = req.query.status;
      if (page < 1) page = 1;
      if (limit < 1) limit = 10;
      if (limit > 100) limit = 100;
      const skip = (page - 1) * limit;

      const where = {
        ...(status && ORDER_STATUSES.includes(status) && { status }),
        ...(search && {
          address: {
            OR: [
              { fullname: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          },
        }),
      };

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          skip,
          take: limit,
          where,
          include: ORDER_INCLUDE,
          orderBy: { id: "desc" },
        }),
        prisma.order.count({ where }),
      ]);

      res.json({
        data: orders,
        meta: {
          total,
          page,
          limit,
          pageCount: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  getOrderById: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "id không hợp lệ" });
      }

      const order = await prisma.order.findUnique({
        where: { id },
        include: ORDER_INCLUDE,
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  updateOrderStatus: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "id không hợp lệ" });
      }

      const { status } = req.body || {};
      if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({
          error: `status phải là một trong: ${ORDER_STATUSES.join(", ")}`,
        });
      }

      const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const allowed = STATUS_FLOW[order.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          error: allowed.length
            ? `Đơn đang ở trạng thái ${order.status}, chỉ chuyển được sang ${allowed.join(" hoặc ")}`
            : `Đơn đã ở trạng thái cuối ${order.status}, không đổi được nữa`,
        });
      }

      // Huỷ đơn thì trả hàng về kho — xem QĐ-4. Cùng transaction với việc đổi
      // trạng thái, nếu không sẽ có lúc đơn đã huỷ mà kho chưa được cộng lại.
      if (status === "CANCELED") {
        const updated = await prisma.$transaction(async (tx) => {
          for (const item of order.items) {
            await tx.productColorVariants.update({
              where: { id: item.productVariantId },
              data: { stock: { increment: item.quantity } },
            });
          }
          return tx.order.update({
            where: { id },
            data: { status },
            include: ORDER_INCLUDE,
          });
        });
        return res.json(updated);
      }

      const updated = await prisma.order.update({
        where: { id },
        data: { status },
        include: ORDER_INCLUDE,
      });

      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = ordersControllers;
