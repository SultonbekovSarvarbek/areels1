-- Значения enum добавляем отдельной миграцией: Postgres не даёт использовать
-- только что добавленное значение в той же транзакции.
ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'rejected';
