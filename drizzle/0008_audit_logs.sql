CREATE TABLE "audit_logs" (
    "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "actor_email" varchar(255) NOT NULL,
    "target_email" varchar(255),
    "action" varchar(100) NOT NULL,
    "resource_type" varchar(50) NOT NULL,
    "resource_id" varchar(255),
    "metadata" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "audit_actor_idx"
ON "audit_logs" ("actor_email");

CREATE INDEX "audit_action_idx"
ON "audit_logs" ("action");