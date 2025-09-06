-- AlterTable
ALTER TABLE "user_channels" ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "channelSecret" TEXT,
ADD COLUMN     "userKey" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "webhookUrl" TEXT;

-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "lineId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "channels_lineId_key" ON "channels"("lineId");

-- AlterTable
ALTER TABLE "user_channels" DROP CONSTRAINT "user_channels_channelId_fkey";

-- AlterTable
ALTER TABLE "user_channels" ADD CONSTRAINT "user_channels_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("lineId") ON DELETE CASCADE ON UPDATE CASCADE;
