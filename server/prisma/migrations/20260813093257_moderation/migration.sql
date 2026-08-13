-- Новое объявление ждёт модерации. Уже опубликованные не трогаем: они прошли
-- в каталог до появления проверки, снимать их задним числом незачем.
ALTER TABLE "Listing" ALTER COLUMN "status" SET DEFAULT 'pending';
ALTER TABLE "Listing" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "Listing" ADD COLUMN "moderatedAt" TIMESTAMP(3);
