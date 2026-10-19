ALTER TABLE "Project"
  ADD COLUMN "isDiscoverable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "commitment" TEXT,
  ADD COLUMN "lookingFor" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "maxTeamSize" INTEGER;

CREATE INDEX "Project_isDiscoverable_status_idx"
  ON "Project"("isDiscoverable", "status");

CREATE TABLE "ProjectApplication" (
  "id" TEXT NOT NULL,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "projectId" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,

  CONSTRAINT "ProjectApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectApplication_projectId_applicantId_key"
  ON "ProjectApplication"("projectId", "applicantId");
CREATE INDEX "ProjectApplication_projectId_status_idx"
  ON "ProjectApplication"("projectId", "status");
CREATE INDEX "ProjectApplication_applicantId_status_idx"
  ON "ProjectApplication"("applicantId", "status");

ALTER TABLE "ProjectApplication"
  ADD CONSTRAINT "ProjectApplication_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectApplication"
  ADD CONSTRAINT "ProjectApplication_applicantId_fkey"
  FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
