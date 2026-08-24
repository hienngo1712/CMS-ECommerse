import { Table, Tag } from "antd";

import TableActions from "../../components/common/TableAction";
import type { UserRow } from "./Types";
import { ROLE_KEY } from "./Types";
import { useT } from "../../i18n";

type Props = {
  users: UserRow[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  currentUserId?: number;
  onPageChange: (page: number, pageSize: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

const UsersTable = ({
  users,
  loading,
  total,
  page,
  pageSize,
  currentUserId,
  onPageChange,
  onEdit,
  onDelete,
}: Props) => {
  const { t } = useT();

  const columns = [
    {
      title: t("username"),
      key: "username",
      render: (_: unknown, record: UserRow) => (
        <>
          <b>{record.username}</b>
          {record.id === currentUserId && (
            <Tag className="ml-2" color="blue">
              {t("you")}
            </Tag>
          )}
        </>
      ),
    },
    { title: t("email"), dataIndex: "email", key: "email" },
    {
      title: t("role"),
      key: "role",
      render: (_: unknown, record: UserRow) => (
        <Tag color={record.role === "admin" ? "purple" : "default"}>
          {t(ROLE_KEY[record.role])}
        </Tag>
      ),
    },
    {
      title: t("status"),
      key: "isActive",
      render: (_: unknown, record: UserRow) =>
        record.isActive ? (
          <Tag color="green">{t("active")}</Tag>
        ) : (
          <Tag color="red">{t("locked")}</Tag>
        ),
    },
    {
      title: t("action"),
      key: "actions",
      width: 120,
      render: (_: unknown, record: UserRow) => (
        <TableActions
          showEdit
          // Server chặn tự xoá bằng 400; ẩn luôn nút để người dùng không bấm
          // vào một thứ chắc chắn thất bại.
          showDelete={record.id !== currentUserId}
          onEdit={() => onEdit(record.id)}
          onDelete={() => onDelete(record.id)}
        />
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={users}
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
};

export default UsersTable;
