export interface Variant {
  id?: number;
  size: string;
  price: number;
  stock: number;
}

export interface Color {
  color: string;
  colorCode: string;
  images: {
    imageUrl: string;
    order: number;
  }[];
  variants: Variant[];
}
export interface Product {
  id: number;
  name: string;
  description: string;
  categoryId: number;
  category: {
    id: number;
    name: string;
  };
  colors: Color[];
}