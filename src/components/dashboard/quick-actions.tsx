import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Hammer, Users, ArrowRightLeft, Boxes, FileText, Settings } from "lucide-react";
import Link from "next/link";
import { Role } from "@prisma/client";

interface QuickActionsProps {
  role: string | null;
}

export function QuickActions({ role }: QuickActionsProps) {
  const isAdmin = role === Role.SUPER_ADMIN || role === Role.ADMIN;
  const isManager = role === Role.SUPER_ADMIN || role === Role.ADMIN;

  const actions = [
    {
      title: "Add Asset",
      icon: PlusCircle,
      href: "/assets",
      show: isManager,
      color: "text-blue-600",
    },
    {
      title: "New Ticket",
      icon: Hammer,
      href: "/maintenance",
      show: true,
      color: "text-amber-600",
    },
    {
      title: "Add Employee",
      icon: Users,
      href: "/employees",
      show: isAdmin,
      color: "text-emerald-600",
    },
    {
      title: "New Transfer",
      icon: ArrowRightLeft,
      href: "/transfers",
      show: isManager,
      color: "text-slate-600",
    },
    {
      title: "Stock Movement",
      icon: Boxes,
      href: "/inventory",
      show: isManager,
      color: "text-purple-600",
    },
    {
      title: "Generate Report",
      icon: FileText,
      href: "#",
      show: isManager,
      color: "text-rose-600",
    },
  ];

  const visibleActions = actions.filter(a => a.show);

  return (
    <Card className="border-none bg-background/50 backdrop-blur-sm shadow-sm ring-1 ring-border/50 shrink-0">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 pb-6">
        {visibleActions.map((action) => (
          <Link key={action.title} href={action.href as any} passHref>
            <Button
              variant="outline"
              className="w-full h-auto flex flex-col items-center gap-2 py-4 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <action.icon className={`h-5 w-5 ${action.color}`} />
              <span className="text-xs font-medium">{action.title}</span>
            </Button>
          </Link>
        ))}
        {isAdmin && (
          <Link href="/settings" passHref className="col-span-2">
            <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-xs text-muted-foreground">
              <Settings className="h-4 w-4" />
              Company Settings
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
