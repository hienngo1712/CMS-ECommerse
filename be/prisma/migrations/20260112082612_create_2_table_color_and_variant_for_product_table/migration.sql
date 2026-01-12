-- CreateTable
CREATE TABLE "ProductColor" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "colorCode" TEXT NOT NULL DEFAULT '#000000',

    CONSTRAINT "ProductColor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductColorImage" (
    "id" SERIAL NOT NULL,
    "colorId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ProductColorImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductColorVariants" (
    "id" SERIAL NOT NULL,
    "colorId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "size" TEXT NOT NULL,
    "stock" INTEGER NOT NULL,

    CONSTRAINT "ProductColorVariants_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProductColor" ADD CONSTRAINT "ProductColor_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductColorImage" ADD CONSTRAINT "ProductColorImage_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "ProductColor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductColorVariants" ADD CONSTRAINT "ProductColorVariants_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "ProductColor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
