-- CreateEnum
CREATE TYPE "SquadKnowledgeScope" AS ENUM ('GLOBAL', 'PRIVATE');

-- AlterTable
ALTER TABLE "Squad" ADD COLUMN "creatorUserId" TEXT;

-- CreateTable
CREATE TABLE "SquadKnowledgeEntry" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "userSquadId" TEXT,
    "scope" "SquadKnowledgeScope" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SquadKnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SquadKnowledgeEntry_squadId_scope_createdAt_idx" ON "SquadKnowledgeEntry"("squadId", "scope", "createdAt");

-- CreateIndex
CREATE INDEX "SquadKnowledgeEntry_userSquadId_createdAt_idx" ON "SquadKnowledgeEntry"("userSquadId", "createdAt");

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadKnowledgeEntry" ADD CONSTRAINT "SquadKnowledgeEntry_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadKnowledgeEntry" ADD CONSTRAINT "SquadKnowledgeEntry_userSquadId_fkey" FOREIGN KEY ("userSquadId") REFERENCES "UserSquad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
