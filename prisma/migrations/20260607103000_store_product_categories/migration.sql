DROP INDEX IF EXISTS "product_categories_name_key";
DROP INDEX IF EXISTS "product_categories_slug_key";

ALTER TABLE "product_categories" ADD COLUMN "storeId" TEXT;

CREATE INDEX "product_categories_storeId_idx" ON "product_categories"("storeId");
CREATE INDEX "product_categories_slug_idx" ON "product_categories"("slug");
CREATE UNIQUE INDEX "product_categories_storeId_slug_key" ON "product_categories"("storeId", "slug");

ALTER TABLE "product_categories"
  ADD CONSTRAINT "product_categories_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
