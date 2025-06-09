-- CreateEnum
CREATE TYPE "NotificationFrequency" AS ENUM ('IMMEDIATE', 'DAILY_DIGEST', 'WEEKLY_DIGEST', 'DISABLED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notification_preferences" JSONB NOT NULL DEFAULT '{"inApp": true, "email": true, "frequency": "IMMEDIATE", "types": {"GENERAL": true, "TASK_ASSIGNMENT": true, "TASK_STATUS_CHANGE": true, "LIST_SHARED": true, "INVITATION_RECEIVED": true, "INVITATION_ACCEPTED": true, "LIST_UPDATE": true}}';
