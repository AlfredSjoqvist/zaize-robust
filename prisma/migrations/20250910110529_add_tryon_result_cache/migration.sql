-- CreateTable
CREATE TABLE "public"."TryOnResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "modelUrl" TEXT NOT NULL,
    "garmentUrl" TEXT NOT NULL,
    "modelHash" TEXT NOT NULL,
    "garmentHash" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "resultUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "apiJobId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TryOnResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TryOnResult_keyHash_key" ON "public"."TryOnResult"("keyHash");
