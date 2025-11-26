import type { CategoriesResponseList, CategoriesPayload, CategoryQuery } from "../pages/Categories/Types";
import axiosInstance from "../utils/axiosInstance";

const categoryService = {
  createCategory: (data: CategoriesPayload) => {
    return axiosInstance.post("/categories",data);
  },

  getCategories: async (params: CategoryQuery) => {
    const res = await axiosInstance.get<CategoriesResponseList>("/categories", {
      params,
    });
    return res.data;
  },
}
export default categoryService;