-- AlterTable
ALTER TABLE "DeliverySettings" ADD COLUMN "dateFormat" TEXT NOT NULL DEFAULT 'long';
ALTER TABLE "DeliverySettings" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE "DeliverySettings" ADD COLUMN "defaultDeliveryDays" INTEGER;
ALTER TABLE "DeliverySettings" ADD COLUMN "defaultCodAvailable" BOOLEAN NOT NULL DEFAULT true;