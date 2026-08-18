import type { DashboardStats } from "../pages/Dashboard/Types";
import axiosInstance from "../utils/axiosInstance";

const dashboardService = {
  getStats: async () => {
    const res = await axiosInstance.get<DashboardStats>("/dashboard/stats");
    return res.data;
  },
};

export default dashboardService;
