/*
  Warnings:

  - You are about to drop the column `lga` on the `locations` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[city,state,country]` on the table `locations` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "locations_city_state_country_lga_key";

-- AlterTable
ALTER TABLE "locations" DROP COLUMN "lga",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isCustom" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "locations_city_state_country_key" ON "locations"("city", "state", "country");
