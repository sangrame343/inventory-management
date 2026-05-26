"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { duplicateAsset } from "@/app/actions/asset-actions";

interface AssetDuplicateButtonProps {
  assetId: string;
}

export function AssetDuplicateButton({ assetId }: AssetDuplicateButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleDuplicate = async () => {
    try {
      setIsPending(true);
      const res = await duplicateAsset(assetId);
      if (res && "id" in res) {
        toast.success("Asset duplicated successfully");
        router.push(`/assets/${res.id}`);
      } else if (res && "message" in res) {
        toast.success(res.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to duplicate asset");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleDuplicate}
      disabled={isPending}
    >
      <Copy className="mr-2 h-4 w-4" />
      {isPending ? "Duplicating..." : "Duplicate"}
    </Button>
  );
}
