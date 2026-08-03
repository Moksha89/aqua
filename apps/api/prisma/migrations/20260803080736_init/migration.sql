-- CreateEnum
CREATE TYPE "PondStatus" AS ENUM ('IDLE', 'UNDER_PREPARATION', 'STOCKED', 'HARVESTING', 'CLOSED');

-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('LEASED', 'OWN');

-- CreateEnum
CREATE TYPE "CropStatus" AS ENUM ('PLANNED', 'ACTIVE', 'HARVESTING', 'CLOSED');

-- CreateEnum
CREATE TYPE "AllocationTarget" AS ENUM ('POND_CROP', 'COMMON');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID', 'PART_PAID');

-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('AERATOR', 'GENERATOR', 'PUMP', 'OTHER');

-- CreateEnum
CREATE TYPE "ApportionedKind" AS ENUM ('LEASE', 'DEPRECIATION', 'COMMON');

-- CreateEnum
CREATE TYPE "AllocationRunTrigger" AS ENUM ('MONTH_END', 'CLOSURE');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('OPEN', 'ALLOCATED');

-- CreateEnum
CREATE TYPE "HarvestType" AS ENUM ('PARTIAL', 'FINAL');

-- CreateEnum
CREATE TYPE "HarvestReason" AS ENUM ('TARGET_SIZE', 'MARKET_RATE', 'DISEASE', 'SEASON_END', 'OTHER');

-- CreateEnum
CREATE TYPE "HarvestBasis" AS ENUM ('COUNT', 'GRADE');

-- CreateEnum
CREATE TYPE "PnlStatus" AS ENUM ('ESTIMATED', 'ACTUAL');

-- CreateTable
CREATE TABLE "AeBusiness" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "state" TEXT,
    "district" TEXT,
    "village" TEXT,
    "language" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "fyStartMonth" INTEGER NOT NULL DEFAULT 4,
    "businessType" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "AeBusiness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccount" (
    "id" UUID NOT NULL,
    "mobile" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultLanguage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBusinessRole" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "financialAccess" BOOLEAN NOT NULL DEFAULT false,
    "pondScope" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "UserBusinessRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" UUID NOT NULL,
    "businessId" UUID,
    "userId" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "pushToken" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Farm" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "lat" DECIMAL(10,7),
    "lng" DECIMAL(10,7),
    "totalExtentAcres" DECIMAL(14,4),
    "waterSourceType" TEXT,
    "electricityServiceNumbers" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pond" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "farmId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "extentAcres" DECIMAL(10,4) NOT NULL,
    "ownershipType" "OwnershipType" NOT NULL,
    "waterDepthM" DECIMAL(10,3),
    "pondType" TEXT,
    "shape" TEXT,
    "geoBoundary" JSONB,
    "status" "PondStatus" NOT NULL,
    "leaseAgreementId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "Pond_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseAgreement" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "landlordName" TEXT NOT NULL,
    "landlordContact" TEXT,
    "extentAcres" DECIMAL(14,4) NOT NULL,
    "rate_per_acre_per_annum_paise" BIGINT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "paymentFrequency" TEXT NOT NULL,
    "advance_paise" BIGINT NOT NULL DEFAULT 0,
    "advanceRefundable" BOOLEAN NOT NULL,
    "escalationJson" JSONB,
    "documentKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "LeaseAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeasePond" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "leaseAgreementId" UUID NOT NULL,
    "pondId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "LeasePond_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeasePaymentSchedule" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "leaseAgreementId" UUID NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "LeasePaymentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeasePayment" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "scheduleId" UUID NOT NULL,
    "paidOn" TIMESTAMP(3) NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "mode" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "LeasePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Species" (
    "id" UUID NOT NULL,
    "businessId" UUID,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultDocDays" INTEGER,
    "defaultTargetSizeG" DECIMAL(14,3),
    "defaultSurvivalPct" DECIMAL(14,3),
    "waterParamRanges" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "Species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedItem" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "feedType" TEXT NOT NULL,
    "gradeCode" TEXT NOT NULL,
    "bagWeightKg" DECIMAL(14,3) NOT NULL,
    "supplierId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "FeedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedRateHistory" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "feedItemId" UUID NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "rate_per_kg_paise" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "FeedRateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineItem" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "packSize" DECIMAL(14,3),
    "supplierId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "MedicineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineRateHistory" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "medicineItemId" UUID NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "rate_per_unit_paise" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "MedicineRateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT[],
    "mobile" TEXT,
    "address" TEXT,
    "opening_balance_paise" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCreditLimit" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "partyId" UUID NOT NULL,
    "limit_paise" BIGINT NOT NULL,
    "creditPeriodDays" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "SupplierCreditLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Labour" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "engagementType" TEXT NOT NULL,
    "default_rate_paise" BIGINT NOT NULL,
    "rateBasis" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "Labour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "labourId" UUID NOT NULL,
    "pondId" UUID,
    "cropId" UUID,
    "workDate" TIMESTAMP(3) NOT NULL,
    "days" DECIMAL(4,2) NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AssetCategory" NOT NULL,
    "pondId" UUID,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "cost_paise" BIGINT NOT NULL,
    "salvagePct" DECIMAL(5,2) NOT NULL,
    "usefulLifeYears" DECIMAL(8,3) NOT NULL,
    "disposalDate" TIMESTAMP(3),
    "disposal_value_paise" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostHead" (
    "id" UUID NOT NULL,
    "businessId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "defaultAllocationBasis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "CostHead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketRateReference" (
    "id" UUID NOT NULL,
    "businessId" UUID,
    "rateDate" TIMESTAMP(3) NOT NULL,
    "region" TEXT NOT NULL,
    "speciesId" UUID NOT NULL,
    "basis" "HarvestBasis" NOT NULL,
    "key" TEXT NOT NULL,
    "rate_per_kg_paise" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "MarketRateReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Crop" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "pondId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "speciesCategory" TEXT NOT NULL,
    "status" "CropStatus" NOT NULL,
    "preparationStartDate" TIMESTAMP(3) NOT NULL,
    "stockingDate" TIMESTAMP(3) NOT NULL,
    "weightedStockingDate" TIMESTAMP(3),
    "expectedHarvestDate" TIMESTAMP(3),
    "targetSizeG" DECIMAL(14,3),
    "survivalAssumptionPct" DECIMAL(7,3) NOT NULL,
    "feedLoggingEnabled" BOOLEAN NOT NULL,
    "finalHarvestDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedBy" UUID,
    "reopenedCount" INTEGER NOT NULL DEFAULT 0,
    "stockingFlags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "Crop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropSpeciesLine" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "speciesId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "CropSpeciesLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockingBatch" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "speciesId" UUID NOT NULL,
    "stockedOn" TIMESTAMP(3) NOT NULL,
    "quantityPieces" DECIMAL(14,3) NOT NULL,
    "plStage" TEXT,
    "seedSizeG" DECIMAL(14,3),
    "supplierPartyId" UUID,
    "rateBasis" TEXT NOT NULL,
    "rate_paise" BIGINT NOT NULL,
    "seed_cost_paise" BIGINT NOT NULL,
    "transport_cost_paise" BIGINT NOT NULL,
    "acclimatisationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "StockingBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreparationActivity" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "pondId" UUID NOT NULL,
    "cropId" UUID,
    "templateItemId" UUID,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "completionDate" TIMESTAMP(3),
    "labour_cost_paise" BIGINT NOT NULL,
    "material_cost_paise" BIGINT NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "payeePartyId" UUID,
    "attachmentKey" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "PreparationActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreparationTemplate" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "speciesCategory" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "PreparationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedLog" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "mealSlot" TEXT NOT NULL,
    "feedItemId" UUID NOT NULL,
    "quantityKg" DECIMAL(14,3) NOT NULL,
    "bags" INTEGER,
    "looseKg" DECIMAL(14,3),
    "feederLabourId" UUID,
    "applied_rate_paise" BIGINT,
    "remarks" TEXT,
    "photoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "FeedLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckTray" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "trayCode" TEXT NOT NULL,
    "position" TEXT,
    "feedPlacedKg" DECIMAL(14,3) NOT NULL,
    "checkIntervalMin" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "CheckTray_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckTrayReading" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "checkTrayId" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL,
    "feedPlacedKg" DECIMAL(14,3) NOT NULL,
    "residualCode" TEXT NOT NULL,
    "residualWeightG" DECIMAL(14,3),
    "gutFullness" TEXT,
    "colour" TEXT,
    "activity" TEXT,
    "moulting" TEXT,
    "deadSeen" INTEGER NOT NULL DEFAULT 0,
    "shellCondition" TEXT,
    "photoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "CheckTrayReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthSample" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "speciesId" UUID,
    "sampledOn" TIMESTAMP(3) NOT NULL,
    "doc" INTEGER NOT NULL,
    "animalsInSample" INTEGER NOT NULL,
    "sampleWeightG" DECIMAL(14,3) NOT NULL,
    "individualWeightsG" DECIMAL(65,30)[],
    "abwG" DECIMAL(14,3) NOT NULL,
    "revisedSurvivalPct" DECIMAL(7,3),
    "revisionReason" TEXT,
    "healthNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "GrowthSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterReading" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cropId" UUID,
    "pondId" UUID NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL,
    "slot" TEXT NOT NULL,
    "salinityPpt" DECIMAL(14,3),
    "ph" DECIMAL(14,3),
    "alkalinity" DECIMAL(14,3),
    "hardness" DECIMAL(14,3),
    "doMgl" DECIMAL(14,3),
    "temperatureC" DECIMAL(14,3),
    "ammonia" DECIMAL(14,3),
    "nitrite" DECIMAL(14,3),
    "transparencyCm" DECIMAL(14,3),
    "vibrioTotal" INTEGER,
    "vibrioGreen" INTEGER,
    "planktonNote" TEXT,
    "labReportKey" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "WaterReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineApplication" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "appliedOn" TIMESTAMP(3) NOT NULL,
    "medicineItemId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "cost_paise" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "MedicineApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthEvent" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "doc" INTEGER NOT NULL,
    "symptoms" TEXT[],
    "mortalityCount" INTEGER,
    "mortalityPct" DECIMAL(7,3),
    "suspectedCause" TEXT,
    "labTested" BOOLEAN NOT NULL,
    "labReportKey" TEXT,
    "treatment" TEXT,
    "technicianPartyId" UUID,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "HealthEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "costHeadId" UUID NOT NULL,
    "allocationTarget" "AllocationTarget" NOT NULL,
    "pondId" UUID,
    "cropId" UUID,
    "commonPoolId" UUID,
    "amount_paise" BIGINT NOT NULL,
    "quantity" DECIMAL(14,3),
    "rate_paise" BIGINT,
    "partyId" UUID,
    "paymentStatus" "PaymentStatus" NOT NULL,
    "paid_amount_paise" BIGINT NOT NULL DEFAULT 0,
    "paymentMode" TEXT,
    "paymentReference" TEXT,
    "billKey" TEXT,
    "remarks" TEXT,
    "ratePending" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "partyId" UUID NOT NULL,
    "paidOn" TIMESTAMP(3) NOT NULL,
    "direction" TEXT NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "mode" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "expenseId" UUID,
    "harvestEventId" UUID,
    "leaseScheduleId" UUID,
    "amount_paise" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommonExpensePool" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "periodMonth" TIMESTAMP(3) NOT NULL,
    "costHeadId" UUID NOT NULL,
    "basis" TEXT NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "status" "AllocationStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "CommonExpensePool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationRun" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "trigger" "AllocationRunTrigger" NOT NULL,
    "status" "AllocationStatus" NOT NULL,
    "executedAt" TIMESTAMP(3),
    "executedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "AllocationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApportionedCost" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "allocationRunId" UUID,
    "kind" "ApportionedKind" NOT NULL,
    "costHeadId" UUID NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "derivation" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "ApportionedCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepreciationSchedule" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "daily_depreciation_paise" BIGINT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'SLM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "DepreciationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropInputBalance" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" UUID NOT NULL,
    "qtyPurchased" DECIMAL(14,3) NOT NULL,
    "qtyConsumed" DECIMAL(14,3) NOT NULL,
    "qtyOnHand" DECIMAL(14,3) NOT NULL,
    "weighted_avg_rate_paise" BIGINT NOT NULL,
    "carriedInQty" DECIMAL(14,3) NOT NULL,
    "carried_in_value_paise" BIGINT NOT NULL,
    "locationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "CropInputBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HarvestEvent" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "harvestDate" TIMESTAMP(3) NOT NULL,
    "doc" INTEGER NOT NULL,
    "type" "HarvestType" NOT NULL,
    "buyerPartyId" UUID,
    "reason" "HarvestReason" NOT NULL,
    "sampleTaken" BOOLEAN NOT NULL,
    "sampleCount" INTEGER,
    "sampleWeightG" DECIMAL(14,3),
    "abwG" DECIMAL(14,3),
    "rateCardId" UUID,
    "gross_value_paise" BIGINT NOT NULL,
    "deductions_paise" BIGINT NOT NULL,
    "net_realisation_paise" BIGINT NOT NULL,
    "receivable_paise" BIGINT NOT NULL,
    "receivableDueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "HarvestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HarvestLine" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "harvestEventId" UUID NOT NULL,
    "speciesId" UUID,
    "basis" "HarvestBasis" NOT NULL,
    "key" TEXT NOT NULL,
    "quantityKg" DECIMAL(14,3) NOT NULL,
    "rate_per_kg_paise" BIGINT NOT NULL,
    "line_value_paise" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "HarvestLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HarvestDeduction" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "harvestEventId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "HarvestDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapSale" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cropId" UUID,
    "pondId" UUID,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "item" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "rate_paise" BIGINT NOT NULL,
    "buyerPartyId" UUID,
    "amount_paise" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "ScrapSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropPnl" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "generatedBy" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "isCurrent" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "CropPnl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropClosureChecklist" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "cropId" UUID NOT NULL,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "CropClosureChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdlePondCost" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "pondId" UUID NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "lease_paise" BIGINT NOT NULL,
    "depreciation_paise" BIGINT NOT NULL,
    "other_paise" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "IdlePondCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncConflict" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "class" TEXT NOT NULL,
    "serverRev" BIGINT NOT NULL,
    "clientPayload" JSONB NOT NULL,
    "serverPayload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "resolvedBy" UUID,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "SyncConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxReceipt" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "appliedRev" BIGINT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "OutboxReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessTheme" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "tokens" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "rev" BIGINT NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidReason" TEXT,

    CONSTRAINT "BusinessTheme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_mobile_key" ON "UserAccount"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "LeasePond_leaseAgreementId_pondId_key" ON "LeasePond"("leaseAgreementId", "pondId");

-- CreateIndex
CREATE UNIQUE INDEX "CropPnl_cropId_version_key" ON "CropPnl"("cropId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxReceipt_idempotencyKey_key" ON "OutboxReceipt"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessTheme_businessId_key" ON "BusinessTheme"("businessId");
