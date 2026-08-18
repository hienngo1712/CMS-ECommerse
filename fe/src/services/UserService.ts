import type {
  UserListResponse,
  UserPayload,
  UserQuery,
  UserRow,
} from "../pages/Users/Types";
import axiosInstance from "../utils/axiosInstance";

const userService = {
  getUsers: async (params: UserQuery) => {
    const res = await axiosInstance.get<UserListResponse>("/users", { params });
    return res.data;
  },

  getUserById: async (id: number) => {
    const res = await axiosInstance.get<UserRow>(`/users/${id}`);
    return res.data;
  },

  createUser: async (data: UserPayload) => {
    const res = await axiosInstance.post<UserRow>("/users", data);
    return res.data;
  },

  updateUser: async (id: number, data: UserPayload) => {
    const res = await axiosInstance.put<UserRow>(`/users/${id}`, data);
    return res.data;
  },

  deleteUser: async (id: number) => {
    const res = await axiosInstance.delete(`/users/${id}`);
    return res.data;
  },
};

export default userService;
