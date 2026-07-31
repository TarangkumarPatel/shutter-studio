-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Photo_pinned_idx" ON "Photo"("pinned");
