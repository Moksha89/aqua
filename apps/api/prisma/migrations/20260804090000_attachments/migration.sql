CREATE TABLE "attachment" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "owner_type" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "object_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "voided_at" TIMESTAMP(3),
    CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "attachment_business_id_owner_type_owner_id_idx"
ON "attachment"("business_id", "owner_type", "owner_id");
