export type CategoriesResponse = {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}