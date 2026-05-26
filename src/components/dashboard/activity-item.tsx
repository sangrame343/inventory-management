"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { 
  Package, 
  User, 
  Hammer, 
  ArrowRightLeft, 
  Boxes, 
  Plus, 
  RefreshCw, 
  Trash2, 
  ClipboardCopy, 
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { parseActivityDetails, getActionSeverity } from "@/lib/utils/activity-parser";

interface ActivityItemProps {
  activity: {
    id: string;
    action: string;
    entity: string;
    details: string | null;
    createdAt: Date;
    user: { name: string | null } | null;
  };
  isLast?: boolean;
}

const getEntityIcon = (entity: string) => {
  const e = entity.toLowerCase();
  if (e.includes("asset")) return Package;
  if (e.includes("employee")) return User;
  if (e.includes("maintenance") || e.includes("ticket")) return Hammer;
  if (e.includes("transfer")) return ArrowRightLeft;
  if (e.includes("inventory")) return Boxes;
  return Info;
};

const getSeverityStyles = (severity: string) => {
  switch (severity) {
    case "create": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
    case "update": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    case "delete": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
    case "assign": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800";
    case "duplicate": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    case "maintenance": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
    default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
  }
};

export function ActivityItem({ activity, isLast }: ActivityItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = getEntityIcon(activity.entity);
  const severity = getActionSeverity(activity.action);
  const businessDescription = parseActivityDetails(activity.action, activity.entity, activity.details);
  
  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div className={cn(
          "rounded-full p-2.5 ring-1 ring-inset transition-all duration-200 group-hover:scale-110",
          getSeverityStyles(severity)
        )}>
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && <div className="w-px h-full bg-border/40 mt-2 mb-2 group-hover:bg-border/80 transition-colors" />}
      </div>

      <div className="flex flex-col pb-8 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-foreground">
            {activity.action.replace(/_/g, " ")}
          </h4>
          <span className="text-[11px] text-muted-foreground font-medium">
            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          <User className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-xs text-muted-foreground font-semibold">
            {activity.user?.name || "System"}
          </span>
        </div>

        <p className="text-sm mt-2 text-muted-foreground leading-relaxed">
          {businessDescription}
        </p>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold uppercase tracking-tight bg-background/50">
            {activity.entity}
          </Badge>
          <Badge variant="outline" className={cn(
            "text-[10px] h-5 px-1.5 font-bold uppercase tracking-tight",
            getSeverityStyles(severity)
          )}>
            {severity}
          </Badge>
          
          {activity.details && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-auto flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? (
                <>Less <ChevronUp className="h-3 w-3" /></>
              ) : (
                <>Details <ChevronDown className="h-3 w-3" /></>
              )}
            </button>
          )}
        </div>

        {isExpanded && activity.details && (
          <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border/50 animate-in slide-in-from-top-2 duration-200">
            <pre className="text-[10px] font-mono overflow-x-auto whitespace-pre-wrap text-muted-foreground">
              {JSON.stringify(JSON.parse(activity.details), null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
