-- CreateTable
CREATE TABLE "public"."SquadExecution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "inputs" JSONB NOT NULL,
    "output" JSONB NOT NULL DEFAULT '{}',
    "checkpoint" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SquadExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SquadExecution_userId_createdAt_idx" ON "public"."SquadExecution"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SquadExecution_squadId_createdAt_idx" ON "public"."SquadExecution"("squadId", "createdAt");

-- CreateIndex
CREATE INDEX "SquadExecution_status_createdAt_idx" ON "public"."SquadExecution"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."SquadExecution" ADD CONSTRAINT "SquadExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SquadExecution" ADD CONSTRAINT "SquadExecution_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "public"."Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
