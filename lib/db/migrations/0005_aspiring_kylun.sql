ALTER TABLE "Document" ALTER COLUMN "text" SET DEFAULT 'code';--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "refined_prompt" text;