/*
  Warnings:

  - You are about to drop the column `licenseTag` on the `ApiUsage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ApiUsage" DROP COLUMN "licenseTag";
