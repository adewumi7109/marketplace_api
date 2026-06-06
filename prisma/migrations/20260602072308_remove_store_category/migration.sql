/*
  Warnings:

  - You are about to drop the column `categoryId` on the `stores` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `stores` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `stores` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `stores` table. All the data in the column will be lost.
  - You are about to drop the `store_categories` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[city,state,country,lga]` on the table `locations` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "stores" DROP CONSTRAINT "stores_categoryId_fkey";

-- DropIndex
DROP INDEX "locations_city_state_country_key";

-- DropIndex
DROP INDEX "stores_categoryId_idx";

-- DropIndex
DROP INDEX "stores_city_country_idx";

-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "lga" TEXT;

-- AlterTable
ALTER TABLE "stores" DROP COLUMN "categoryId",
DROP COLUMN "city",
DROP COLUMN "country",
DROP COLUMN "state",
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- DropTable
DROP TABLE "store_categories";

-- CreateIndex
CREATE UNIQUE INDEX "locations_city_state_country_lga_key" ON "locations"("city", "state", "country", "lga");

-- CreateIndex
CREATE INDEX "stores_latitude_longitude_idx" ON "stores"("latitude", "longitude");
