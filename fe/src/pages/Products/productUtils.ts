import type { Product, Variant } from "./Type";

const formatVnd = (value: number) => value.toLocaleString("vi-VN");

const getVariants = (product: Product): Variant[] =>
  (product.colors || []).flatMap((color) => color.variants || []);

export const getTotalStock = (product: Product): number =>
  getVariants(product).reduce((sum, variant) => sum + (variant.stock || 0), 0);

export const formatPriceRange = (product: Product): string => {
  const prices = getVariants(product)
    .map((variant) => variant.price)
    .filter((price) => Number.isFinite(price));

  if (prices.length === 0) return "-";

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return min === max ? formatVnd(min) : `${formatVnd(min)} - ${formatVnd(max)}`;
};

export const getFirstImageUrl = (product: Product): string | undefined =>
  product.colors?.[0]?.images?.[0]?.imageUrl;
