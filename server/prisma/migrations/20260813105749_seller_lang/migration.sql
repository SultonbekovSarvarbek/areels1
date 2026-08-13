-- CreateEnum
CREATE TYPE "Lang" AS ENUM ('ru', 'uz', 'uzc');

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "lang" "Lang" NOT NULL DEFAULT 'ru';
