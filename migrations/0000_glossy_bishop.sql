CREATE TABLE "golf_courses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"state" text NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"rating" numeric(3, 1),
	"description" text,
	"website" text,
	"phone" text,
	"access_type" text DEFAULT 'public' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"activity_date" date NOT NULL,
	"activity_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_activity_logs_user_id_activity_date_activity_type_unique" UNIQUE("user_id","activity_date","activity_type")
);
--> statement-breakpoint
CREATE TABLE "user_course_status" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"course_id" varchar NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_course_status_user_id_course_id_unique" UNIQUE("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	"preferences" json DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "user_activity_logs" ADD CONSTRAINT "user_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_course_status" ADD CONSTRAINT "user_course_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_course_status" ADD CONSTRAINT "user_course_status_course_id_golf_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."golf_courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "golf_courses_name_idx" ON "golf_courses" USING btree ("name");--> statement-breakpoint
CREATE INDEX "golf_courses_state_idx" ON "golf_courses" USING btree ("state");--> statement-breakpoint
CREATE INDEX "golf_courses_location_idx" ON "golf_courses" USING btree ("location");--> statement-breakpoint
CREATE INDEX "golf_courses_rating_idx" ON "golf_courses" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "golf_courses_access_type_idx" ON "golf_courses" USING btree ("access_type");--> statement-breakpoint
CREATE INDEX "golf_courses_coords_idx" ON "golf_courses" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "user_activity_logs_activity_date_idx" ON "user_activity_logs" USING btree ("activity_date");--> statement-breakpoint
CREATE INDEX "user_activity_logs_activity_type_idx" ON "user_activity_logs" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "user_activity_logs_user_id_idx" ON "user_activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_activity_logs_date_type_idx" ON "user_activity_logs" USING btree ("activity_date","activity_type");--> statement-breakpoint
CREATE INDEX "user_course_status_user_id_idx" ON "user_course_status" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_course_status_course_id_idx" ON "user_course_status" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "user_course_status_status_idx" ON "user_course_status" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_course_status_user_status_idx" ON "user_course_status" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "user_course_status_created_at_idx" ON "user_course_status" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_last_active_at_idx" ON "users" USING btree ("last_active_at");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");