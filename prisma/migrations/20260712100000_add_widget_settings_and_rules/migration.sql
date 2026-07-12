-- CreateTable
CREATE TABLE "WidgetSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "heading" TEXT NOT NULL DEFAULT 'Check Delivery Availability',
    "description" TEXT NOT NULL DEFAULT 'Enter your pincode to see delivery estimate.',
    "buttonText" TEXT NOT NULL DEFAULT 'Check',
    "accentColor" TEXT NOT NULL DEFAULT '#111827',
    "cornerRadius" INTEGER NOT NULL DEFAULT 14,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "WidgetSettings_shop_key" ON "WidgetSettings"("shop");

-- CreateTable
CREATE TABLE "DeliveryRule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "extraDays" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryRule_shop_ruleType_value_key" ON "DeliveryRule"("shop", "ruleType", "value");
