import type { CategoriesResponse } from "./Types";
import { Table, Tag } from "antd";
import TableActions from "../../components/common/TableAction";
import { useT } from "../../i18n";

type Props = {
  categories: CategoriesResponse[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number, pageSize: number) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
};

const TableCategories = ({
  categories,
  total,
  page,
  pageSize,
  loading,
  onDelete,
  onEdit,
  onPageChange,
}: Props) => {
  const { t } = useT();

  const columns = [
    {
      title: t("categoryName"),
      dataIndex: "name",
      key: "name",
      render: (text: string) => <b>{text}</b>,
    },
    {
      title: t("slug"),
      dataIndex: "slug",
      key: "slug",
    },
    {
      title: t("status"),
      dataIndex: "isActive",
      key: "isActive",
      render: (active: boolean) =>
        active ? (
          <Tag color="green">{t("active")}</Tag>
        ) : (
          <Tag color="red">{t("off")}</Tag>
        ),
    },
    {
      title: t("action"),
      dataIndex: "actions",
      key: "actions",
      render: (_: unknown, record: CategoriesResponse) => (
        <>
          <TableActions
            showEdit
            showDelete
            onEdit={() => onEdit(record.id)}
            onDelete={() => onDelete(record.id)}
          />
        </>
      ),
    },
  ];
  return (
    <Table
      columns={columns}
      dataSource={categories}
      loading={loading}
      rowKey={"id"}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        onChange: onPageChange,
      }}
    ></Table>
  );
};

export default TableCategories;
