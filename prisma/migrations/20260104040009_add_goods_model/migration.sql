/*
  Warnings:

  - You are about to drop the column `strock` on the `Goods` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Goods" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_Goods" ("id", "name", "price") SELECT "id", "name", "price" FROM "Goods";
DROP TABLE "Goods";
ALTER TABLE "new_Goods" RENAME TO "Goods";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
