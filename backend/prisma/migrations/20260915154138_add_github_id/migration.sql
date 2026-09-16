/*
  Warnings:

  - A unique constraint covering the columns `[githubId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fullName` to the `Repository` table without a default value. This is not possible if the table is not empty.
  - Added the required column `githubRepoId` to the `Repository` table without a default value. This is not possible if the table is not empty.
  - Added the required column `htmlUrl` to the `Repository` table without a default value. This is not possible if the table is not empty.
  - Added the required column `private` to the `Repository` table without a default value. This is not possible if the table is not empty.
  - Added the required column `githubAccessToken` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CodeReviewStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "defaultBranch" TEXT,
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "githubRepoId" TEXT NOT NULL,
ADD COLUMN     "htmlUrl" TEXT NOT NULL,
ADD COLUMN     "private" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "githubAccessToken" TEXT NOT NULL,
ADD COLUMN     "githubId" TEXT,
ADD COLUMN     "tokenType" TEXT;

-- CreateTable
CREATE TABLE "CodeReview" (
    "id" TEXT NOT NULL,
    "githubRepoId" TEXT NOT NULL,
    "findings" TEXT NOT NULL,
    "status" "CodeReviewStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_githubId_key" ON "users"("githubId");
