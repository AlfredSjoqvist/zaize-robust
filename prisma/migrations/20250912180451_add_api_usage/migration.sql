-- CreateTable
CREATE TABLE "public"."ApiUsage" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "route" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseId" TEXT,
    "tokenJti" TEXT,
    "costMs" INTEGER,
    "note" TEXT,
    "ip" TEXT,

    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("id")
);
