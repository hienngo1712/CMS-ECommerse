import { useContext, useEffect, useState } from "react";
import { App, Button, Result } from "antd";

import AppFilters, {
  asText,
  type FilterConfig,
  type FilterValues,
} from "../../components/common/AppFilters";
import userService from "../../services/UserService";
import { ThemeContext } from "../../contexts/ThemeContext";
import { AuthContext } from "../../contexts/AuthContext";
import UsersTable from "./Table";
import ModalUsers from "./Modal";
import type { PaginationMeta, UserQuery, UserRow } from "./Types";
import { ROLE_LABEL, USER_ROLES } from "./Types";

const usersFilter: FilterConfig[] = [
  {
    type: "input",
    name: "search",
    placeholder: "Username hoặc email",
    label: "Tìm kiếm",
  },
  {
    type: "select",
    name: "role",
    placeholder: "Chọn quyền",
    options: [
      { label: "Tất cả", value: "" },
      ...USER_ROLES.map((role) => ({ label: ROLE_LABEL[role], value: role })),
    ],
    label: "Quyền",
  },
  {
    type: "select",
    name: "isActive",
    placeholder: "Chọn trạng thái",
    options: [
      { label: "Tất cả", value: "" },
      { label: "Hoạt động", value: "true" },
      { label: "Đã khoá", value: "false" },
    ],
    label: "Trạng thái",
  },
];

const UsersPage = () => {
  const { isDark } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const { message } = App.useApp();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    pageCount: 0,
  });
  const [query, setQuery] = useState<UserQuery>({
    page: 1,
    limit: 10,
    search: "",
    role: "",
    isActive: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);

  const isAdmin = user?.role === "admin";

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await userService.getUsers(query);
      setUsers(res.data);
      setMeta(res.meta);
    } catch (error) {
      console.error(error);
      message.error("Không tải được danh sách người dùng");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (values: FilterValues) => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      search: asText(values.search),
      role: asText(values.role),
      isActive: asText(values.isActive),
    }));
  };

  const handlePageChange = (page: number, limit: number) => {
    setQuery((prev) => ({ ...prev, page, limit }));
  };

  // Nút Tạo mới phải reset editingId, nếu không modal vẫn ở chế độ sửa của
  // người vừa chỉnh và bấm Lưu sẽ ghi đè lên người đó.
  const handleCreate = () => {
    setEditingId(undefined);
    setIsOpen(true);
  };

  const handleEdit = (id: number) => {
    setEditingId(id);
    setIsOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await userService.deleteUser(id);
      message.success("Xóa người dùng thành công");
      fetchUsers();
    } catch (error) {
      console.error(error);
      message.error("Xóa người dùng thất bại");
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchUsers();
    // fetchUsers được tạo lại sau mỗi lần render nên đưa vào deps sẽ khiến
    // effect chạy lại vô hạn. Liệt kê từng trường của query là cố ý.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, query.page, query.limit, query.search, query.role, query.isActive]);

  // Server đã chặn bằng 403; chặn thêm ở đây để không bắn một loạt request
  // chắc chắn hỏng rồi mới hiện toast lỗi.
  if (!isAdmin) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="Chỉ tài khoản quản trị mới xem được mục này."
      />
    );
  }

  return (
    <div
      style={{
        padding: 24,
        borderRadius: 8,
        background: isDark ? "#262626" : "#fff",
        boxShadow: isDark
          ? "0 2px 8px rgba(0, 0, 0, 0.6)"
          : "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div className="flex items-end justify-between mb-10">
        <AppFilters filters={usersFilter} onChange={handleFilterChange} />
        <Button type="primary" onClick={handleCreate}>
          + Tạo người dùng mới
        </Button>
      </div>

      <UsersTable
        users={users}
        loading={isLoading}
        total={meta.total}
        page={query.page}
        pageSize={query.limit}
        currentUserId={user?.id}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ModalUsers
        open={isOpen}
        userId={editingId}
        currentUserId={user?.id}
        onClose={() => setIsOpen(false)}
        onSuccess={fetchUsers}
      />
    </div>
  );
};

export default UsersPage;
