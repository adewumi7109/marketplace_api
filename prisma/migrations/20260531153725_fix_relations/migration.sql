/*
  Warnings:

  - You are about to drop the column `comparePrice` on the `products` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('NEW', 'USED', 'REFURBISHED');

-- AlterTable
ALTER TABLE "products" DROP COLUMN "comparePrice",
ADD COLUMN     "condition" "ProductCondition",
ADD COLUMN     "isNegotiable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "locationId" TEXT,
ALTER COLUMN "price" DROP NOT NULL;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "locationId" TEXT;

-- CreateTable
CREATE TABLE "product_clicks" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attributes" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_clicks_productId_idx" ON "product_clicks"("productId");

-- CreateIndex
CREATE INDEX "product_clicks_storeId_idx" ON "product_clicks"("storeId");

-- CreateIndex
CREATE INDEX "locations_city_state_country_idx" ON "locations"("city", "state", "country");

-- CreateIndex
CREATE UNIQUE INDEX "locations_city_state_country_key" ON "locations"("city", "state", "country");

-- CreateIndex
CREATE INDEX "product_attributes_productId_idx" ON "product_attributes"("productId");

-- CreateIndex
CREATE INDEX "product_attributes_key_idx" ON "product_attributes"("key");

-- CreateIndex
CREATE INDEX "product_attributes_key_value_idx" ON "product_attributes"("key", "value");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_clicks" ADD CONSTRAINT "product_clicks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_clicks" ADD CONSTRAINT "product_clicks_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
