import { useContext, useEffect, useState } from "react";
import { App, Card, Col, Row, Spin, Statistic, Table, Tag } from "antd";
import { useNavigate } from "react-router-dom";

import dashboardService from "../../services/DashboardService";
import { ThemeContext } from "../../contexts/ThemeContext";
import { ORDER_STATUSES, STATUS_COLOR, STATUS_KEY } from "../Orders/Types";
import { formatDateTime, formatMoney } from "../Orders/orderUtils";
import type { DashboardStats, LowStockRow, RecentOrderRow } from "./Types";
import { useT } from "../../i18n";

const Dashboard = () => {
  const { isDark } = useContext(ThemeContext);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { t } = useT();

  useEffect(() => {
    dashboardService
      .getStats()
      .then(setStats)
      .catch((error) => {
        console.error(error);
        message.error(t("loadFailed"));
      })
      .finally(() => setLoading(false));
  }, [message, t]);

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
    return <div className="py-20 text-center">{t("noStats")}</div>;
  }

  const lowStockColumns = [
    { title: t("product"), dataIndex: "product", key: "product" },
    { title: t("color"), dataIndex: "color", key: "color" },
    { title: t("size"), dataIndex: "size", key: "size" },
    {
      title: t("remaining"),
      dataIndex: "stock",
      key: "stock",
      render: (stock: number) => (
        <Tag color={stock === 0 ? "red" : "orange"}>{stock}</Tag>
      ),
    },
  ];

  const recentColumns = [
    {
      title: t("orderId"),
      key: "id",
      render: (_: unknown, row: RecentOrderRow) => <b>#{row.id}</b>,
    },
    { title: t("customer"), dataIndex: "customer", key: "customer" },
    {
      title: t("status"),
      key: "status",
      render: (_: unknown, row: RecentOrderRow) => (
        <Tag color={STATUS_COLOR[row.status]}>{t(STATUS_KEY[row.status])}</Tag>
      ),
    },
    {
      title: t("total"),
      key: "totalAmount",
      render: (_: unknown, row: RecentOrderRow) => formatMoney(row.totalAmount),
    },
    {
      title: t("orderDate"),
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
              title={t("revenueDelivered")}
              value={formatMoney(stats.revenue.delivered)}
              suffix={t("currency")}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={t("revenuePending")}
              value={formatMoney(stats.revenue.pending)}
              suffix={t("currency")}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic title={t("totalOrders")} value={stats.orders.total} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={`${t("product")} / ${t("category")}`}
              value={`${stats.catalog.products} / ${stats.catalog.categories}`}
            />
          </Card>
        </Col>
      </Row>

      <Card title={t("ordersByStatus")} className="mt-4" style={cardStyle}>
        <Row gutter={[16, 16]}>
          {ORDER_STATUSES.map((status) => (
            <Col xs={12} sm={8} lg={4} key={status}>
              <Statistic
                title={
                  <Tag color={STATUS_COLOR[status]}>{t(STATUS_KEY[status])}</Tag>
                }
                value={stats.orders.byStatus[status]}
              />
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={[16, 16]} className="mt-4">
        <Col xs={24} lg={12}>
          <Card title={t("lowStock")} style={cardStyle}>
            <Table<LowStockRow>
              columns={lowStockColumns}
              dataSource={stats.lowStock}
              rowKey="variantId"
              pagination={false}
              size="small"
              locale={{ emptyText: t("lowStockEmpty") }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t("recentOrders")} style={cardStyle}>
            <Table<RecentOrderRow>
              columns={recentColumns}
              dataSource={stats.recentOrders}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: t("noOrders") }}
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
