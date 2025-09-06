-- AlterTable
ALTER TABLE "user_channels" ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "channelSecret" TEXT,
ADD COLUMN     "userKey" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "webhookUrl" TEXT;

-- AlterTable (only add lineId if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'lineId') THEN
        ALTER TABLE "channels" ADD COLUMN "lineId" TEXT;
    END IF;
END $$;

-- CreateIndex (only if lineId column exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'lineId') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'channels_lineId_key') THEN
            CREATE UNIQUE INDEX "channels_lineId_key" ON "channels"("lineId");
        END IF;
    END IF;
END $$;

-- AlterTable (update foreign key constraint)
ALTER TABLE "user_channels" DROP CONSTRAINT IF EXISTS "user_channels_channelId_fkey";

-- AlterTable (add new foreign key constraint)
ALTER TABLE "user_channels" ADD CONSTRAINT "user_channels_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("lineId") ON DELETE CASCADE ON UPDATE CASCADE;
