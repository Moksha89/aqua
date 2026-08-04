CREATE TYPE "AttachmentStatus" AS ENUM ('PENDING', 'UPLOADED');
ALTER TABLE "attachment" ADD COLUMN "status" "AttachmentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "attachment" ADD COLUMN "uploaded_at" TIMESTAMP(3);
