WITH ranked_locations AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY LOWER(city)
      ORDER BY "isCustom" ASC, "createdAt" ASC, id ASC
    ) AS keeper_id,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(city)
      ORDER BY "isCustom" ASC, "createdAt" ASC, id ASC
    ) AS row_number
  FROM "locations"
),
duplicate_locations AS (
  SELECT id, keeper_id
  FROM ranked_locations
  WHERE row_number > 1
)
UPDATE "stores"
SET "locationId" = duplicate_locations.keeper_id
FROM duplicate_locations
WHERE "stores"."locationId" = duplicate_locations.id;

WITH ranked_locations AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY LOWER(city)
      ORDER BY "isCustom" ASC, "createdAt" ASC, id ASC
    ) AS keeper_id,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(city)
      ORDER BY "isCustom" ASC, "createdAt" ASC, id ASC
    ) AS row_number
  FROM "locations"
),
duplicate_locations AS (
  SELECT id, keeper_id
  FROM ranked_locations
  WHERE row_number > 1
)
UPDATE "products"
SET "locationId" = duplicate_locations.keeper_id
FROM duplicate_locations
WHERE "products"."locationId" = duplicate_locations.id;

WITH ranked_locations AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(city)
      ORDER BY "isCustom" ASC, "createdAt" ASC, id ASC
    ) AS row_number
  FROM "locations"
)
DELETE FROM "locations"
USING ranked_locations
WHERE "locations".id = ranked_locations.id
  AND ranked_locations.row_number > 1;

CREATE UNIQUE INDEX "locations_city_key" ON "locations"("city");
