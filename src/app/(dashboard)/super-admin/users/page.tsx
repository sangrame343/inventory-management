import { getActiveUsers } from "@/app/actions/super-admin-actions";
import { UsersClient } from "./users-client";

export const dynamic = 'force-dynamic';

export default async function SuperAdminUsersPage() {
  const users = await getActiveUsers();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Active Users</h1>
      </div>
      <p className="text-muted-foreground">
        Review and manage active users across all companies. You can delete users who are no longer needed.
      </p>
      
      <UsersClient users={users} />
    </div>
  );
}
