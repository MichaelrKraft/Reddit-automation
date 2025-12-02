-- CreateTable
CREATE TABLE "SubredditActivity" (
    "id" TEXT NOT NULL,
    "subredditName" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "hourOfDay" INTEGER NOT NULL,
    "avgScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgComments" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "lastAnalyzed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubredditActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimalTimeRecommendation" (
    "id" TEXT NOT NULL,
    "subredditName" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "hourOfDay" INTEGER NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgEngagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimalTimeRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubredditActivity_subredditName_idx" ON "SubredditActivity"("subredditName");

-- CreateIndex
CREATE UNIQUE INDEX "SubredditActivity_subredditName_dayOfWeek_hourOfDay_key" ON "SubredditActivity"("subredditName", "dayOfWeek", "hourOfDay");

-- CreateIndex
CREATE INDEX "OptimalTimeRecommendation_subredditName_idx" ON "OptimalTimeRecommendation"("subredditName");

-- CreateIndex
CREATE UNIQUE INDEX "OptimalTimeRecommendation_subredditName_rank_key" ON "OptimalTimeRecommendation"("subredditName", "rank");
