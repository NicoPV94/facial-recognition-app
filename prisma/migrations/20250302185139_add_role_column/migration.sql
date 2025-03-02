-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('WORKER', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'WORKER';
