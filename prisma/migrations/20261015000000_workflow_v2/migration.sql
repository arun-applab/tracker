-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "skillId"),
    CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectManager" (
    "projectId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("projectId", "managerId"),
    CONSTRAINT "ProjectManager_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectManager_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectManager_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectLink_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeLogComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timeLogId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeLogComment_timeLogId_fkey" FOREIGN KEY ("timeLogId") REFERENCES "TimeLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeLogComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Carry existing data forward: each project's old owning manager becomes an assigned manager
INSERT INTO "ProjectManager" ("projectId", "managerId", "assignedById", "assignedAt")
SELECT "id", "managerId", "managerId", "createdAt" FROM "Project";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "jobTitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "managerId" TEXT,
    "availabilityOverride" TEXT,
    "availabilityOverrideAt" DATETIME,
    "availabilityOverrideById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_availabilityOverrideById_fkey" FOREIGN KEY ("availabilityOverrideById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("availabilityOverride", "availabilityOverrideAt", "createdAt", "email", "id", "isActive", "jobTitle", "managerId", "name", "passwordHash", "role", "updatedAt") SELECT "availabilityOverride", "availabilityOverrideAt", "createdAt", "email", "id", "isActive", "jobTitle", "managerId", "name", "passwordHash", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_managerId_idx" ON "User"("managerId");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "eta" DATETIME NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("client", "createdAt", "createdById", "description", "eta", "id", "name", "priority", "startDate", "status", "updatedAt") SELECT "client", "createdAt", COALESCE((SELECT "id" FROM "User" WHERE "role" = 'HEAD' LIMIT 1), "managerId"), "description", "eta", "id", "name", "priority", "startDate", "status", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE TABLE "new_TimeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "hours" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeLog_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TimeLog" ("createdAt", "date", "description", "hours", "id", "loggedById", "projectId", "taskType", "updatedAt", "userId") SELECT "createdAt", "date", "description", "hours", "id", "loggedById", "projectId", "taskType", "updatedAt", "userId" FROM "TimeLog";
DROP TABLE "TimeLog";
ALTER TABLE "new_TimeLog" RENAME TO "TimeLog";
CREATE INDEX "TimeLog_userId_date_idx" ON "TimeLog"("userId", "date");
CREATE INDEX "TimeLog_projectId_date_idx" ON "TimeLog"("projectId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE INDEX "UserSkill_skillId_idx" ON "UserSkill"("skillId");

-- CreateIndex
CREATE INDEX "ProjectManager_managerId_idx" ON "ProjectManager"("managerId");

-- CreateIndex
CREATE INDEX "ProjectLink_projectId_idx" ON "ProjectLink"("projectId");

-- CreateIndex
CREATE INDEX "TimeLogComment_timeLogId_createdAt_idx" ON "TimeLogComment"("timeLogId", "createdAt");
