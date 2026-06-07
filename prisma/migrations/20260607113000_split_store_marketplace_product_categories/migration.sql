ALTER TABLE "products" ADD COLUMN "marketplace_category_id" TEXT;

UPDATE "products"
SET "marketplace_category_id" = "categoryId"
WHERE "push_to_marketplace" = true;

ALTER TABLE "products" ALTER COLUMN "categoryId" DROP NOT NULL;
ALTER TABLE "products" ALTER COLUMN "push_to_marketplace" SET DEFAULT false;

CREATE INDEX "products_marketplace_category_id_idx" ON "products"("marketplace_category_id");

ALTER TABLE "products"
  ADD CONSTRAINT "products_marketplace_category_id_fkey"
  FOREIGN KEY ("marketplace_category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
