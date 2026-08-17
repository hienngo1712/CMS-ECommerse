-- AlterTable
ALTER TABLE "User" RENAME COLUMN "isActice" TO "isActive";

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductColor_productId_color_key" ON "ProductColor"("productId", "color");

-- CreateIndex
CREATE UNIQUE INDEX "ProductColorVariants_colorId_size_key" ON "ProductColorVariants"("colorId", "size");
