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

  getCategoryById: async (id: number) => {
    const res = await axiosInstance.get(`/categories/${id}`);
    return res.data;
  },

  updateCategory: async (id: number, data: Partial<CategoriesPayload>) =>{
    const res = await axiosInstance.put(`/categories/${id}`, data);
    return res.data;
  },

  deleteCategory: async (id: number) =>{
    const res = await axiosInstance.delete(`/categories/${id}`);
    return res.data;
  }
}
export default categoryService;