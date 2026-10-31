-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "activeDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Site_activeDate_idx" ON "Site"("activeDate");
