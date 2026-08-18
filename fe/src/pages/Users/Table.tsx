import { Table, Tag } from "antd";

import TableActions from "../../components/common/TableAction";
import type { UserRow } from "./Types";
import { ROLE_LABEL } from "./Types";

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
  const columns = [
    {
      title: "Username",
      key: "username",
      render: (_: unknown, record: UserRow) => (
        <>
          <b>{record.username}</b>
          {record.id === currentUserId && (
            <Tag className="ml-2" color="blue">
              Bạn
            </Tag>
          )}
        </>
      ),
    },
    { title: "Email", dataIndex: "email", key: "email" },
    {
      title: "Quyền",
      key: "role",
      render: (_: unknown, record: UserRow) => (
        <Tag color={record.role === "admin" ? "purple" : "default"}>
          {ROLE_LABEL[record.role]}
        </Tag>
      ),
    },
    {
      title: "Trạng thái",
      key: "isActive",
      render: (_: unknown, record: UserRow) =>
        record.isActive ? (
          <Tag color="green">Hoạt động</Tag>
        ) : (
          <Tag color="red">Đã khoá</Tag>
        ),
    },
    {
      title: "Hành động",
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
