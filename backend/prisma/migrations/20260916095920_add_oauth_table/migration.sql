/*
  Warnings:

  - Changed the type of `provider_account_id` on the `oauth_accounts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "oauth_accounts" DROP COLUMN "provider_account_id",
ADD COLUMN     "provider_account_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_account_id_key" ON "oauth_accounts"("provider", "provider_account_id");
