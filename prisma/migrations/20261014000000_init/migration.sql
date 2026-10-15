-- CreateTable
CREATE TABLE "User" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "eta" DATETIME NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "managerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectStatusChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectStatusChange_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectStatusChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "hours" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "loggedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "reviewComment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeLog_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeLog_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Suggestion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SuggestionReply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "suggestionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SuggestionReply_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SuggestionReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SuggestionRead" (
    "userId" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "lastReadAt" DATETIME NOT NULL,

    PRIMARY KEY ("userId", "suggestionId"),
    CONSTRAINT "SuggestionRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SuggestionRead_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_managerId_idx" ON "User"("managerId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Project_managerId_idx" ON "Project"("managerId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "ProjectAssignment_userId_idx" ON "ProjectAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAssignment_projectId_userId_key" ON "ProjectAssignment"("projectId", "userId");

-- CreateIndex
CREATE INDEX "ProjectStatusChange_projectId_changedAt_idx" ON "ProjectStatusChange"("projectId", "changedAt");

-- CreateIndex
CREATE INDEX "TimeLog_userId_date_idx" ON "TimeLog"("userId", "date");

-- CreateIndex
CREATE INDEX "TimeLog_projectId_date_idx" ON "TimeLog"("projectId", "date");

-- CreateIndex
CREATE INDEX "TimeLog_status_idx" ON "TimeLog"("status");

-- CreateIndex
CREATE INDEX "Suggestion_authorId_idx" ON "Suggestion"("authorId");

-- CreateIndex
CREATE INDEX "Suggestion_status_idx" ON "Suggestion"("status");

-- CreateIndex
CREATE INDEX "SuggestionReply_suggestionId_createdAt_idx" ON "SuggestionReply"("suggestionId", "createdAt");
