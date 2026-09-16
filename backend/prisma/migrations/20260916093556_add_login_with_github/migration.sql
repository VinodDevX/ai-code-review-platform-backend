/*
  Warnings:

  - You are about to drop the column `githubAccessToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `githubId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `tokenType` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('GITHUB');

-- DropIndex
DROP INDEX "users_githubId_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "githubAccessToken",
DROP COLUMN "githubId",
DROP COLUMN "tokenType",
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "token_type" TEXT,
    "scope" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_account_id_key" ON "oauth_accounts"("provider", "provider_account_id");

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
