export const USER_ROLES = ["admin", "staff"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Quản trị",
  staff: "Nhân viên",
};

export type UserRow = {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

// password không bắt buộc khi sửa: để trống là giữ mật khẩu cũ.
export type UserPayload = {
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  isActive: boolean;
}

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export type UserQuery = {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  isActive?: string;
}

export type UserListResponse = {
  data: UserRow[];
  meta: PaginationMeta;
}
