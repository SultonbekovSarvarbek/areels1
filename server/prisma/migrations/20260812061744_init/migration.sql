-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('private', 'dealer');

-- CreateEnum
CREATE TYPE "City" AS ENUM ('tashkent', 'samarkand', 'bukhara', 'namangan', 'andijan', 'fergana', 'karshi', 'jizzakh', 'termez');

-- CreateEnum
CREATE TYPE "BodyType" AS ENUM ('sedan', 'hatchback', 'crossover', 'suv', 'minivan');

-- CreateEnum
CREATE TYPE "Fuel" AS ENUM ('petrol', 'gas', 'diesel', 'hybrid', 'electric');

-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('auto', 'manual', 'robot', 'cvt');

-- CreateEnum
CREATE TYPE "Drive" AS ENUM ('fwd', 'rwd', 'awd');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('published', 'archived');

-- CreateTable
CREATE TABLE "Seller" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT,
    "name" TEXT NOT NULL,
    "type" "SellerType" NOT NULL,
    "phone" TEXT NOT NULL,
    "telegramUsername" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "deals" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "mileage" INTEGER NOT NULL,
    "city" "City" NOT NULL,
    "bodyType" "BodyType" NOT NULL,
    "fuel" "Fuel" NOT NULL,
    "transmission" "Transmission" NOT NULL,
    "drive" "Drive" NOT NULL,
    "engine" DOUBLE PRECISION NOT NULL,
    "power" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "tags" TEXT[],
    "negotiable" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT NOT NULL,
    "hot" BOOLEAN NOT NULL DEFAULT false,
    "status" "ListingStatus" NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Seller_telegramId_key" ON "Seller"("telegramId");

-- CreateIndex
CREATE INDEX "Seller_phone_idx" ON "Seller"("phone");

-- CreateIndex
CREATE INDEX "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_sellerId_idx" ON "Listing"("sellerId");

-- CreateIndex
CREATE INDEX "Photo_listingId_sortOrder_idx" ON "Photo"("listingId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
