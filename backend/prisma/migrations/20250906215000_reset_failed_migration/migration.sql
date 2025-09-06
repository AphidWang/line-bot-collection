-- Reset failed migration state
-- This migration resets the failed migration and applies the schema changes safely

-- First, mark the failed migration as resolved
UPDATE "_prisma_migrations" 
SET "finished_at" = NOW(), "logs" = 'Migration reset and reapplied'
WHERE "migration_name" = '20250906214140_add_user_channels' 
AND "finished_at" IS NULL;

-- Apply the schema changes safely
-- Add columns to user_channels if they don't exist
DO $$ 
BEGIN
    -- Add accessToken column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_channels' AND column_name = 'accessToken') THEN
        ALTER TABLE "user_channels" ADD COLUMN "accessToken" TEXT;
    END IF;
    
    -- Add channelSecret column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_channels' AND column_name = 'channelSecret') THEN
        ALTER TABLE "user_channels" ADD COLUMN "channelSecret" TEXT;
    END IF;
    
    -- Add userKey column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_channels' AND column_name = 'userKey') THEN
        ALTER TABLE "user_channels" ADD COLUMN "userKey" TEXT;
    END IF;
    
    -- Add status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_channels' AND column_name = 'status') THEN
        ALTER TABLE "user_channels" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
    END IF;
    
    -- Add webhookUrl column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_channels' AND column_name = 'webhookUrl') THEN
        ALTER TABLE "user_channels" ADD COLUMN "webhookUrl" TEXT;
    END IF;
END $$;

-- Add lineId to channels if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'lineId') THEN
        ALTER TABLE "channels" ADD COLUMN "lineId" TEXT;
    END IF;
END $$;

-- Create unique index for lineId if it doesn't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'channels' AND column_name = 'lineId') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'channels_lineId_key') THEN
            CREATE UNIQUE INDEX "channels_lineId_key" ON "channels"("lineId");
        END IF;
    END IF;
END $$;

-- Update foreign key constraint
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_channels_channelId_fkey') THEN
        ALTER TABLE "user_channels" DROP CONSTRAINT "user_channels_channelId_fkey";
    END IF;
    
    -- Add new constraint
    ALTER TABLE "user_channels" ADD CONSTRAINT "user_channels_channelId_fkey" 
    FOREIGN KEY ("channelId") REFERENCES "channels"("lineId") ON DELETE CASCADE ON UPDATE CASCADE;
END $$;
