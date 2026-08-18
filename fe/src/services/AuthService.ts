import type { AuthUser, LoginPayload, LoginResponse } from "../pages/Login/Types";
import axiosInstance from "../utils/axiosInstance";

const authService = {
  login: async (data: LoginPayload) => {
    const res = await axiosInstance.post<LoginResponse>("/auth/login", data);
    return res.data;
  },

  getMe: async () => {
    const res = await axiosInstance.get<AuthUser>("/auth/me");
    return res.data;
  },
};

export default authService;
