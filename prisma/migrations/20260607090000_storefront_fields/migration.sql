ALTER TABLE "stores" ADD COLUMN "banner_text" TEXT;
ALTER TABLE "stores" ADD COLUMN "store_address" TEXT;

ALTER TABLE "products" ADD COLUMN "push_to_marketplace" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "products_push_to_marketplace_idx" ON "products"("push_to_marketplace");
