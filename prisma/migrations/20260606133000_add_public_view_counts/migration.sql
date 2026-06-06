ALTER TABLE "product_clicks"
ADD COLUMN "visitorHash" TEXT,
ADD COLUMN "dateKey" TEXT;

CREATE INDEX "product_clicks_source_idx" ON "product_clicks"("source");

CREATE UNIQUE INDEX "product_clicks_productId_source_visitorHash_dateKey_key"
ON "product_clicks"("productId", "source", "visitorHash", "dateKey");

CREATE TABLE "store_views" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "visitorHash" TEXT,
  "dateKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "store_views_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "store_views_storeId_idx" ON "store_views"("storeId");
CREATE INDEX "store_views_createdAt_idx" ON "store_views"("createdAt");
CREATE UNIQUE INDEX "store_views_storeId_visitorHash_dateKey_key"
ON "store_views"("storeId", "visitorHash", "dateKey");

ALTER TABLE "store_views"
ADD CONSTRAINT "store_views_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
