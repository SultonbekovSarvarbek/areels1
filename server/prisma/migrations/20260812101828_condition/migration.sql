-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('excellent', 'good', 'average', 'needsRepair');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "condition" "Condition" NOT NULL DEFAULT 'good';
