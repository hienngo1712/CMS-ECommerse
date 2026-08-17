export interface Variant {
  id?: number;
  size: string;
  price: number;
  stock: number;
}

export interface ProductImage {
  id?: number;
  imageUrl: string;
  order?: number;
}

export interface Color {
  id?: number;
  color: string;
  colorCode: string;
  images: ProductImage[];
  variants: Variant[];
}

export interface Product {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  categoryId: number;
  category: {
    id: number;
    name: string;
  };
  colors: Color[];
}

export interface ProductPayload {
  name: string;
  description?: string;
  categoryId: number;
  isActive?: boolean;
  colors: Color[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export interface ProductQuery {
  page: number;
  limit: number;
  search?: string;
  categoryId?: number | string;
  isActive?: string | boolean;
}

export interface ProductListResponse {
  data: Product[];
  meta: PaginationMeta;
}
