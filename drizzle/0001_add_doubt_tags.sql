CREATE TABLE IF NOT EXISTS "tags" (
    "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "name" varchar(80) NOT NULL,
    "normalizedName" varchar(80) NOT NULL,
    "classroomId" integer,
    "createdByEmail" varchar(255),
    "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tag_classroomId_idx" ON "tags" ("classroomId");
CREATE UNIQUE INDEX IF NOT EXISTS "tag_scope_name_idx" ON "tags" ("normalizedName", "classroomId");

CREATE TABLE IF NOT EXISTS "doubt_tags" (
    "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "doubtId" integer NOT NULL,
    "tagId" integer NOT NULL,
    "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "doubt_tag_doubtId_idx" ON "doubt_tags" ("doubtId");
CREATE INDEX IF NOT EXISTS "doubt_tag_tagId_idx" ON "doubt_tags" ("tagId");
CREATE UNIQUE INDEX IF NOT EXISTS "doubt_tag_unique_idx" ON "doubt_tags" ("doubtId", "tagId");
