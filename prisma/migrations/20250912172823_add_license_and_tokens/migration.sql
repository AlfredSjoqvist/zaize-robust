-- CreateTable
CREATE TABLE "public"."LicenseKey" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "label" TEXT,
    "userId" TEXT,
    "email" TEXT,
    "maxActivations" INTEGER NOT NULL DEFAULT 1,
    "activationsUsed" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExtToken" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT,
    "licenseId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LicenseKey_codeHash_key" ON "public"."LicenseKey"("codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "ExtToken_jti_key" ON "public"."ExtToken"("jti");

-- CreateIndex
CREATE INDEX "TryOnResult_userId_idx" ON "public"."TryOnResult"("userId");

-- CreateIndex
CREATE INDEX "TryOnResult_apiJobId_idx" ON "public"."TryOnResult"("apiJobId");

-- CreateIndex
CREATE INDEX "TryOnResult_modelHash_garmentHash_idx" ON "public"."TryOnResult"("modelHash", "garmentHash");
