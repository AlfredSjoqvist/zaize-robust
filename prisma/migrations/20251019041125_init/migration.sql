-- CreateTable
CREATE TABLE "Scrape" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "selectorUsed" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scrape_pkey" PRIMARY KEY ("id")
);
