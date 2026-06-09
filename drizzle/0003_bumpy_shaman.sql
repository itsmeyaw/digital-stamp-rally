ALTER TABLE "staff" ADD COLUMN "stamp_id" uuid;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_stamp_id_stamps_id_fk" FOREIGN KEY ("stamp_id") REFERENCES "public"."stamps"("id") ON DELETE no action ON UPDATE no action;