/*
  Warnings:

  - The `githubId` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "githubId",
ADD COLUMN     "githubId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "users_githubId_key" ON "users"("githubId");
