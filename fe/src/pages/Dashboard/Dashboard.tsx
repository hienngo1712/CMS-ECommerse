import { useContext, useEffect, useState } from "react";
import { App, Card, Col, Row, Spin, Statistic, Table, Tag } from "antd";
import { useNavigate } from "react-router-dom";

import dashboardService from "../../services/DashboardService";
import { ThemeContext } from "../../contexts/ThemeContext";
import { ORDER_STATUSES, STATUS_COLOR, STATUS_LABEL } from "../Orders/Types";
import { formatDateTime, formatMoney } from "../Orders/orderUtils";
import type { DashboardStats, LowStockRow, RecentOrderRow } from "./Types";

const Dashboard = () => {
  const { isDark } = useContext(ThemeContext);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { message } = App.useApp();

  useEffect(() => {
    dashboardService
      .getStats()
      .then(setStats)
      .catch((error) => {
        console.error(error);
        message.error("Không tải được số liệu tổng quan");
      })
      .finally(() => setLoading(false));
  }, []);

  const cardStyle = {
    background: isDark ? "#262626" : "#fff",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  if (!stats) {
    return <div className="py-20 text-center">Chưa có số liệu để hiển thị.</div>;
  }

  const lowStockColumns = [
    { title: "Sản phẩm", dataIndex: "product", key: "product" },
    { title: "Màu", dataIndex: "color", key: "color" },
    { title: "Size", dataIndex: "size", key: "size" },
    {
      title: "Còn lại",
      dataIndex: "stock",
      key: "stock",
      render: (stock: number) => (
        <Tag color={stock === 0 ? "red" : "orange"}>{stock}</Tag>
      ),
    },
  ];

  const recentColumns = [
    {
      title: "Mã đơn",
      key: "id",
      render: (_: unknown, row: RecentOrderRow) => <b>#{row.id}</b>,
    },
    { title: "Khách hàng", dataIndex: "customer", key: "customer" },
    {
      title: "Trạng thái",
      key: "status",
      render: (_: unknown, row: RecentOrderRow) => (
        <Tag color={STATUS_COLOR[row.status]}>{STATUS_LABEL[row.status]}</Tag>
      ),
    },
    {
      title: "Tổng tiền",
      key: "totalAmount",
      render: (_: unknown, row: RecentOrderRow) => formatMoney(row.totalAmount),
    },
    {
      title: "Ngày đặt",
      key: "createdAt",
      render: (_: unknown, row: RecentOrderRow) => formatDateTime(row.createdAt),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title="Doanh thu đã giao"
              value={formatMoney(stats.revenue.delivered)}
              suffix="đ"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title="Đang chờ giao"
              value={formatMoney(stats.revenue.pending)}
              suffix="đ"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic title="Tổng số đơn" value={stats.orders.total} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title="Sản phẩm / Danh mục"
              value={`${stats.catalog.products} / ${stats.catalog.categories}`}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Đơn hàng theo trạng thái" className="mt-4" style={cardStyle}>
        <Row gutter={[16, 16]}>
          {ORDER_STATUSES.map((status) => (
            <Col xs={12} sm={8} lg={4} key={status}>
              <Statistic
                title={
                  <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>
                }
                value={stats.orders.byStatus[status]}
              />
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={12}>
          <Card title="Sắp hết hàng (còn 5 trở xuống)" style={cardStyle}>
            <Table<LowStockRow>
              columns={lowStockColumns}
              dataSource={stats.lowStock}
              rowKey="variantId"
              pagination={false}
              size="small"
              locale={{ emptyText: "Không có mặt hàng nào sắp hết" }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Đơn hàng gần đây" style={cardStyle}>
            <Table<RecentOrderRow>
              columns={recentColumns}
              dataSource={stats.recentOrders}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: "Chưa có đơn nào" }}
              onRow={() => ({
                onClick: () => navigate("/orders"),
                style: { cursor: "pointer" },
              })}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
