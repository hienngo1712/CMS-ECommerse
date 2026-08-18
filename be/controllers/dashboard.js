const prisma = require("../prisma/client");
const { ORDER_STATUSES } = require("../validators/orders");

// Tiền chỉ thật sự về khi hàng đã giao — xem QĐ-2. CANCELED không vào nhóm nào.
const PENDING_STATUSES = ["PENDING", "CONFIRMED", "SHIPPING"];

const LOW_STOCK_THRESHOLD = 5;

const dashboardControllers = {
  getStats: async (_req, res) => {
    try {
      const [
        deliveredSum,
        pendingSum,
        groupedByStatus,
        products,
        categories,
        lowStockRows,
        recentOrders,
      ] = await Promise.all([
        prisma.order.aggregate({
          where: { status: "DELIVERED" },
          _sum: { totalAmount: true },
        }),
        prisma.order.aggregate({
          where: { status: { in: PENDING_STATUSES } },
          _sum: { totalAmount: true },
        }),
        prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.product.count({ where: { isDeleted: false } }),
        prisma.category.count({ where: { isDeleted: false } }),
        prisma.productColorVariants.findMany({
          where: {
            stock: { lte: LOW_STOCK_THRESHOLD },
            color: { product: { isDeleted: false } },
          },
          include: {
            color: { include: { product: { select: { name: true } } } },
          },
          orderBy: { stock: "asc" },
          take: 10,
        }),
        prisma.order.findMany({
          orderBy: { id: "desc" },
          take: 5,
          include: { address: true, user: { select: { username: true } } },
        }),
      ]);

      // Dựng đủ 5 khoá rồi mới đổ số đếm vào: groupBy chỉ trả những trạng thái
      // đang có đơn, thiếu khoá thì FE phải vá undefined thành 0 ở mọi chỗ.
      const byStatus = Object.fromEntries(
        ORDER_STATUSES.map((status) => [status, 0])
      );
      groupedByStatus.forEach((row) => {
        byStatus[row.status] = row._count._all;
      });

      res.json({
        revenue: {
          delivered: deliveredSum._sum.totalAmount ?? 0,
          pending: pendingSum._sum.totalAmount ?? 0,
        },
        orders: {
          total: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
          byStatus,
        },
        catalog: { products, categories },
        lowStock: lowStockRows.map((variant) => ({
          variantId: variant.id,
          product: variant.color.product.name,
          color: variant.color.color,
          size: variant.size,
          stock: variant.stock,
        })),
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          customer:
            order.address?.fullname ?? order.user?.username ?? "Khách vãng lai",
          status: order.status,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
        })),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = dashboardControllers;
