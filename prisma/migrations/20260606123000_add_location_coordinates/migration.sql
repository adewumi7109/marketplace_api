ALTER TABLE "locations"
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

CREATE INDEX "locations_latitude_longitude_idx" ON "locations"("latitude", "longitude");
