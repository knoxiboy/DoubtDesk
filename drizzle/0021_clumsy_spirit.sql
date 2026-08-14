CREATE TABLE "classroom_faqs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "classroom_faqs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"classroomId" integer NOT NULL,
	"topic" varchar(255) NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sourceDoubtIds" integer[] NOT NULL,
	"isPublished" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "classroom_faqs" ADD CONSTRAINT "classroom_faqs_classroomId_classrooms_id_fk" FOREIGN KEY ("classroomId") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;