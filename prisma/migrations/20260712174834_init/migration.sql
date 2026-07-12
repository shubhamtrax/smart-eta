-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverySettings" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "processingDays" INTEGER NOT NULL DEFAULT 1,
    "shippingDays" INTEGER NOT NULL DEFAULT 3,
    "cutoffTime" TEXT NOT NULL DEFAULT '14:00',
    "weekendDelivery" BOOLEAN NOT NULL DEFAULT false,
    "dateFormat" TEXT NOT NULL DEFAULT 'long',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "defaultDeliveryDays" INTEGER,
    "defaultCodAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PincodeRule" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "deliveryDays" INTEGER NOT NULL,
    "codAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PincodeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetAnalytics" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT,
    "pageType" TEXT,
    "eventType" TEXT NOT NULL,
    "pincode" TEXT,
    "available" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WidgetAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetSettings" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "heading" TEXT NOT NULL DEFAULT 'Check Delivery Availability',
    "description" TEXT NOT NULL DEFAULT 'Enter your pincode to see delivery estimate.',
    "buttonText" TEXT NOT NULL DEFAULT 'Check',
    "accentColor" TEXT NOT NULL DEFAULT '#111827',
    "cornerRadius" INTEGER NOT NULL DEFAULT 14,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryRule" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "extraDays" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliverySettings_shop_key" ON "DeliverySettings"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_shop_date_key" ON "Holiday"("shop", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetSettings_shop_key" ON "WidgetSettings"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryRule_shop_ruleType_value_key" ON "DeliveryRule"("shop", "ruleType", "value");
