/*
  Warnings:

  - Added the required column `accountId` to the `Position` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "accountId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "totalReturn" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "availableCash" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "accountValue" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExitPLAN" (
    "id" SERIAL NOT NULL,
    "profitTarget" DOUBLE PRECISION NOT NULL,
    "stopLoss" DOUBLE PRECISION NOT NULL,
    "invalidationCondition" TEXT NOT NULL,
    "positionId" INTEGER NOT NULL,

    CONSTRAINT "ExitPLAN_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExitPLAN_positionId_key" ON "ExitPLAN"("positionId");

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitPLAN" ADD CONSTRAINT "ExitPLAN_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;
