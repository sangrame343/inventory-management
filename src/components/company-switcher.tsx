"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BuildingIcon, PlusIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { switchActiveCompany } from "@/app/actions/auth-actions";
import { createCompany } from "@/app/actions/company-actions";

interface Company {
  id: string;
  name: string;
}

interface CompanySwitcherProps {
  companies: Company[];
  activeCompanyId: string | null;
}

export function CompanySwitcher({
  companies,
  activeCompanyId,
}: CompanySwitcherProps) {
  const router = useRouter();
  const { update } = useSession();
  const [isPending, startTransition] = React.useTransition();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [newCompanyName, setNewCompanyName] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");

  const handleCompanyChange = async (companyId: string | null) => {
    if (!companyId) return;

    if (companyId === "create_new") {
      setIsDialogOpen(true);
      return;
    }
    
    startTransition(async () => {
      try {
        await switchActiveCompany(companyId);
        await update({ activeCompanyId: companyId });
        router.refresh();
      } catch (error) {
        console.error("Failed to switch company:", error);
      }
    });
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (newCompanyName.trim().length < 2) {
      setErrorMsg("Company name must be at least 2 characters.");
      return;
    }

    const formData = new FormData();
    formData.append("name", newCompanyName);

    startTransition(async () => {
      const res = await createCompany(formData);
      if (res?.error) {
        setErrorMsg(res.error);
      } else if (res?.success && res.company) {
        // Success: Switch actively to the newly generated company context
        await update({ activeCompanyId: res.company.id });
        setIsDialogOpen(false);
        setNewCompanyName("");
        router.refresh();
      }
    });
  };

  if (!companies || companies.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setIsDialogOpen(true)}
          disabled={isPending}
        >
          Add Company
        </Button>
        {/* Reuse the same dialog for creating a company */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Company</DialogTitle>
              <DialogDescription>
                Add a new company profile. You will be automatically assigned as an Admin.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCompany}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium">
                    Name
                  </label>
                  <Input
                    id="name"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    className="col-span-3"
                    placeholder="e.g. Acme Corp"
                    disabled={isPending}
                  />
                </div>
                {errorMsg && (
                  <div className="text-sm font-medium text-destructive text-right pr-2">
                    {errorMsg}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Save Company"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const selectedCompany = companies.find((c) => c.id === activeCompanyId);

  return (
    <div className="flex items-center gap-2">
      <BuildingIcon className="h-4 w-4 text-muted-foreground hidden sm:block" />
      <Select
        value={activeCompanyId || undefined}
        onValueChange={handleCompanyChange}
        disabled={isPending}
      >
        <SelectTrigger className="w-[180px] h-8 bg-background border-border/50">
          <SelectValue placeholder="Select a company">
            {selectedCompany?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value="create_new" className="font-semibold text-primary focus:text-primary">
            <span className="flex items-center gap-1.5 w-full">
              <PlusIcon className="h-3.5 w-3.5" /> Create new company
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Company</DialogTitle>
            <DialogDescription>
              Add a new company profile. You will be automatically assigned as an Admin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCompany}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="name" className="text-right text-sm font-medium">
                  Name
                </label>
                <Input
                  id="name"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g. Acme Corp"
                  disabled={isPending}
                />
              </div>
              {errorMsg && (
                <div className="text-sm font-medium text-destructive text-right pr-2">
                  {errorMsg}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Save Company"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
