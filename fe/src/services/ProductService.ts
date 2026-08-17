import type {
  Product,
  ProductListResponse,
  ProductPayload,
  ProductQuery,
} from "../pages/Products/Type";
import axiosInstance from "../utils/axiosInstance";

const productService = {
  getProducts: async (params: ProductQuery) => {
    const res = await axiosInstance.get<ProductListResponse>("/products", {
      params,
    });
    return res.data;
  },

  getProductById: async (id: number) => {
    const res = await axiosInstance.get<Product>(`/products/${id}`);
    return res.data;
  },

  createProduct: async (data: ProductPayload) => {
    const res = await axiosInstance.post<Product>("/products", data);
    return res.data;
  },

  updateProduct: async (id: number, data: ProductPayload) => {
    const res = await axiosInstance.put<Product>(`/products/${id}`, data);
    return res.data;
  },

  deleteProduct: async (id: number) => {
    const res = await axiosInstance.delete(`/products/${id}`);
    return res.data;
  },
};

export default productService;
