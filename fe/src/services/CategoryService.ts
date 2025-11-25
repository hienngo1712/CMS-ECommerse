import type { CategoriesPayload } from "../pages/Categories/Types";
import axiosInstance from "../utils/axiosInstance";

const categoryService = {
  createCategory: (data: CategoriesPayload) => {
    return axiosInstance.post("/categories",data);
  },
}
export default categoryService;