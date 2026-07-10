/*
  Warnings:

  - You are about to drop the column `messaage` on the `Chat` table. All the data in the column will be lost.
  - Added the required column `message` to the `Chat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "messaage",
ADD COLUMN     "message" TEXT NOT NULL;
