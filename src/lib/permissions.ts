import { Role, ApprovalModule, ApprovalAction } from "@prisma/client";

export type PermissionStatus = "ALLOW" | "REQUIRE_APPROVAL" | "DENY";

export function checkPermission(
  role: Role,
  module: ApprovalModule,
  action: ApprovalAction
): PermissionStatus {
  // SUPER_ADMIN has full authority
  if (role === Role.SUPER_ADMIN) {
    return "ALLOW";
  }

  // USER has read-only access to assets only
  if (role === Role.USER) {
    // Users can't do any write actions
    return "DENY";
  }

  // ADMIN can only submit requests for most actions
  if (role === Role.ADMIN) {
    // Actions that ADMIN can request
    const requestableActions: ApprovalAction[] = [
      "CREATE",
      "UPDATE",
      "DELETE",
      "ASSIGN",
      "TRANSFER",
      "ISSUE",
      "REGISTER_AS_ASSET",
      "IMPORT",
      "BULK_DELETE",
    ];

    if (requestableActions.includes(action)) {
      return "REQUIRE_APPROVAL";
    }

    // Default to DENY for other actions (like settings changes or user management)
    return "DENY";
  }

  return "DENY";
}
