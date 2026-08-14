-- Кузова: добавились купе, универсал, кабриолет, пикап и «другой».
ALTER TYPE "BodyType" ADD VALUE 'coupe';
ALTER TYPE "BodyType" ADD VALUE 'wagon';
ALTER TYPE "BodyType" ADD VALUE 'cabrio';
ALTER TYPE "BodyType" ADD VALUE 'pickup';
ALTER TYPE "BodyType" ADD VALUE 'other';

-- Коробка: робот и вариатор сворачиваются в «другую». Значения из перечисления
-- убираются, поэтому тип пересоздаём — ALTER TYPE ... DROP VALUE в постгресе нет.
CREATE TYPE "Transmission_new" AS ENUM ('manual', 'auto', 'other');

ALTER TABLE "Listing"
  ALTER COLUMN "transmission" TYPE "Transmission_new"
  USING (
    CASE "transmission"::text
      WHEN 'robot' THEN 'other'
      WHEN 'cvt' THEN 'other'
      ELSE "transmission"::text
    END
  )::"Transmission_new";

ALTER TYPE "Transmission" RENAME TO "Transmission_old";
ALTER TYPE "Transmission_new" RENAME TO "Transmission";
DROP TYPE "Transmission_old";
