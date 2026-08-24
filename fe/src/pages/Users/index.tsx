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
import { ROLE_KEY, USER_ROLES } from "./Types";
import { useT } from "../../i18n";

const UsersPage = () => {
  const { isDark } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const { message } = App.useApp();
  const { t } = useT();

  const usersFilter: FilterConfig[] = [
    {
      type: "input",
      name: "search",
      placeholder: t("usernameOrEmail"),
      label: t("search"),
    },
    {
      type: "select",
      name: "role",
      placeholder: t("selectRole"),
      options: [
        { label: t("all"), value: "" },
        ...USER_ROLES.map((role) => ({ label: t(ROLE_KEY[role]), value: role })),
      ],
      label: t("role"),
    },
    {
      type: "select",
      name: "isActive",
      placeholder: t("selectStatus"),
      options: [
        { label: t("all"), value: "" },
        { label: t("active"), value: "true" },
        { label: t("locked"), value: "false" },
      ],
      label: t("status"),
    },
  ];
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
      message.error(t("loadFailed"));
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
      message.success(t("deleteSuccess"));
      fetchUsers();
    } catch (error) {
      console.error(error);
      message.error(t("deleteFailed"));
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
        subTitle={t("adminOnly")}
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
          + {t("createUser")}
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
