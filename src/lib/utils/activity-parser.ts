import { format } from "date-fns";

export interface ActivityDetails {
  previousName?: string;
  newName?: string;
  assetTag?: string;
  assignmentId?: string;
  departmentId?: string;
  employeeId?: string;
  locationId?: string;
  reason?: string;
  status?: string;
  previousStatus?: string;
  newStatus?: string;
  [key: string]: any;
}

export function parseActivityDetails(action: string, entity: string, detailsStr: string | null): string {
  if (!detailsStr) return `No details provided for ${action.toLowerCase().replace(/_/g, " ")}.`;

  let details: ActivityDetails = {};
  try {
    details = JSON.parse(detailsStr);
  } catch (e) {
    return detailsStr; // Fallback to raw string if not JSON
  }

  const actionType = action.toUpperCase();
  const entityType = entity.toLowerCase();

  switch (actionType) {
    case "CREATE_ASSET":
      return `Created new asset: ${details.newName || details.name || "Unnamed Asset"}${details.assetTag ? ` (${details.assetTag})` : ""}.`;
    
    case "UPDATE_ASSET": {
      const changes: string[] = [];
      if (details.previousName && details.newName && details.previousName !== details.newName) {
        changes.push(`name from "${details.previousName}" to "${details.newName}"`);
      }
      if (details.previousStatus && details.newStatus && details.previousStatus !== details.newStatus) {
        changes.push(`status from ${details.previousStatus} to ${details.newStatus}`);
      }
      if (details.assetTag && !details.previousName) {
        changes.push(`asset tag: ${details.assetTag}`);
      }
      
      if (changes.length > 0) {
        return `Updated asset ${details.assetTag || ""}: ${changes.join(", ")}.`;
      }
      return `Updated asset details for ${details.assetTag || "asset"}.`;
    }

    case "DELETE_ASSET":
      return `Deleted asset: ${details.name || "Asset"}${details.assetTag ? ` (${details.assetTag})` : ""}.`;

    case "DUPLICATE_ASSET":
      return `Duplicated asset and created a new asset${details.assetTag ? ` with tag ${details.assetTag}` : ""}.`;

    case "ASSIGN_ASSET":
      return `Assigned asset to ${details.departmentName || details.employeeName || "a new owner"}.`;

    case "TRANSFER_ASSET":
    case "REQUEST_TRANSFER":
      return `Requested transfer of asset ${details.assetTag || ""} to ${details.toLocationName || details.toEmployeeName || "new location"}.`;

    case "APPROVE_TRANSFER":
      return `Approved transfer request for asset ${details.assetTag || ""}.`;

    case "COMPLETE_TRANSFER":
      return `Completed transfer of asset ${details.assetTag || ""}.`;

    case "CREATE_MAINTENANCE_TICKET":
      return `Raised maintenance ticket: ${details.title || "Untitled"}${details.priority ? ` [${details.priority} priority]` : ""}.`;

    case "UPDATE_MAINTENANCE_TICKET":
      if (details.previousStatus && details.newStatus) {
        return `Updated ticket status from ${details.previousStatus} to ${details.newStatus}.`;
      }
      return `Updated maintenance ticket: ${details.title || ""}.`;

    case "IMPORT_ASSETS":
    case "IMPORT_INVENTORY":
      return `Imported ${details.count || "multiple"} ${entityType} records from file.`;

    case "CREATE_INVENTORY_ITEM":
      return `Added new inventory item: ${details.name || "Item"}${details.sku ? ` (SKU: ${details.sku})` : ""}.`;

    case "UPDATE_STOCK":
    case "STOCK_ADJUSTMENT":
      return `Adjusted stock for ${details.itemName || "item"}: ${details.direction === "IN" ? "+" : "-"}${details.quantity} units.`;

    default:
      // Generic fallback for unhandled actions
      const formattedAction = action.toLowerCase().replace(/_/g, " ");
      return `${formattedAction.charAt(0).toUpperCase() + formattedAction.slice(1)} ${entityType}.`;
  }
}

export function getActionSeverity(action: string): "create" | "update" | "delete" | "assign" | "duplicate" | "maintenance" | "default" {
  const a = action.toUpperCase();
  if (a.includes("CREATE") || a.includes("IMPORT")) return "create";
  if (a.includes("UPDATE") || a.includes("ADJUST")) return "update";
  if (a.includes("DELETE") || a.includes("DISPOSE") || a.includes("REJECT")) return "delete";
  if (a.includes("ASSIGN") || a.includes("TRANSFER") || a.includes("APPROVE")) return "assign";
  if (a.includes("DUPLICATE")) return "duplicate";
  if (a.includes("MAINTENANCE") || a.includes("TICKET")) return "maintenance";
  return "default";
}
