ALTER TABLE "stores" DROP CONSTRAINT IF EXISTS "stores_userId_fkey";

UPDATE "stores"
SET "userId" = "users"."supabaseId"
FROM "users"
WHERE "stores"."userId" = "users"."id"
  AND "users"."supabaseId" IS NOT NULL
  AND "users"."id" <> "users"."supabaseId";

UPDATE "users"
SET "id" = "supabaseId"
WHERE "supabaseId" IS NOT NULL
  AND "id" <> "supabaseId";

DROP INDEX IF EXISTS "users_supabaseId_key";

ALTER TABLE "users" DROP COLUMN IF EXISTS "supabaseId";

ALTER TABLE "users" DROP COLUMN IF EXISTS "password";

ALTER TABLE "stores"
ADD CONSTRAINT "stores_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
