/*
  Warnings:

  - Added the required column `updatedAt` to the `PincodeRule` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PincodeRule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "deliveryDays" INTEGER NOT NULL,
    "codAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PincodeRule" ("codAvailable", "createdAt", "deliveryDays", "id", "pincode", "shop") SELECT "codAvailable", "createdAt", "deliveryDays", "id", "pincode", "shop" FROM "PincodeRule";
DROP TABLE "PincodeRule";
ALTER TABLE "new_PincodeRule" RENAME TO "PincodeRule";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
