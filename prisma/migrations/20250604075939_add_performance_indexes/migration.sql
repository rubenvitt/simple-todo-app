-- CreateIndex
CREATE INDEX "idx_invitations_invitee_email" ON "invitations"("invitee_email");

-- CreateIndex
CREATE INDEX "idx_invitations_list_id" ON "invitations"("list_id");

-- CreateIndex
CREATE INDEX "idx_invitations_inviter_user_id" ON "invitations"("inviter_user_id");

-- CreateIndex
CREATE INDEX "idx_invitations_status" ON "invitations"("status");

-- CreateIndex
CREATE INDEX "idx_invitations_expires_at" ON "invitations"("expires_at");

-- CreateIndex
CREATE INDEX "idx_invitations_invitee_status" ON "invitations"("invitee_email", "status");

-- CreateIndex
CREATE INDEX "idx_invitations_invitee_status_expires" ON "invitations"("invitee_email", "status", "expires_at");

-- CreateIndex
CREATE INDEX "idx_invitations_status_expires" ON "invitations"("status", "expires_at");

-- CreateIndex
CREATE INDEX "idx_invitations_created_at" ON "invitations"("created_at");

-- CreateIndex
CREATE INDEX "idx_list_shares_user_id" ON "list_shares"("user_id");

-- CreateIndex
CREATE INDEX "idx_list_shares_list_id" ON "list_shares"("list_id");

-- CreateIndex
CREATE INDEX "idx_list_shares_permission_level" ON "list_shares"("permission_level");

-- CreateIndex
CREATE INDEX "idx_list_shares_created_at" ON "list_shares"("created_at");

-- CreateIndex
CREATE INDEX "idx_lists_user_id" ON "lists"("user_id");

-- CreateIndex
CREATE INDEX "idx_lists_created_at" ON "lists"("created_at");

-- CreateIndex
CREATE INDEX "idx_lists_name" ON "lists"("name");

-- CreateIndex
CREATE INDEX "idx_notifications_user_id" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_notifications_created_at" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "idx_notifications_user_read_status" ON "notifications"("user_id", "read_status");

-- CreateIndex
CREATE INDEX "idx_notifications_user_created_at" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_notifications_user_type" ON "notifications"("user_id", "type");

-- CreateIndex
CREATE INDEX "idx_tasks_list_id" ON "tasks"("list_id");

-- CreateIndex
CREATE INDEX "idx_tasks_assigned_user_id" ON "tasks"("assigned_user_id");

-- CreateIndex
CREATE INDEX "idx_tasks_status" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "idx_tasks_priority" ON "tasks"("priority");

-- CreateIndex
CREATE INDEX "idx_tasks_due_date" ON "tasks"("due_date");

-- CreateIndex
CREATE INDEX "idx_tasks_created_at" ON "tasks"("created_at");

-- CreateIndex
CREATE INDEX "idx_tasks_list_status" ON "tasks"("list_id", "status");

-- CreateIndex
CREATE INDEX "idx_tasks_assigned_status" ON "tasks"("assigned_user_id", "status");

-- CreateIndex
CREATE INDEX "idx_tasks_list_priority" ON "tasks"("list_id", "priority");

-- CreateIndex
CREATE INDEX "idx_tasks_list_due_date" ON "tasks"("list_id", "due_date");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_created_at" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "idx_users_name" ON "users"("name");
