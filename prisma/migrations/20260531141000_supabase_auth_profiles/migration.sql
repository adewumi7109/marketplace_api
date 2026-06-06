ALTER TABLE "users" ADD COLUMN "supabaseId" TEXT;

ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

CREATE UNIQUE INDEX "users_supabaseId_key" ON "users"("supabaseId");
