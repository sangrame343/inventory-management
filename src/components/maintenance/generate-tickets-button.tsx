"use client";

import { useMutation } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function GenerateTicketsButton() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/maintenance/schedules/generate", {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate tickets");
      }
      return res.json();
    },
    onSuccess: (data) => {
      alert(data.message || "Tickets generated successfully.");
      router.refresh();
    },
    onError: (err: any) => {
      alert(err.message);
    },
  });

  return (
    <Button
      variant="outline"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      title="Check all active maintenance schedules and generate tickets for those that are due."
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${mutation.isPending ? "animate-spin" : ""}`} />
      {mutation.isPending ? "Generating..." : "Generate Due Tickets"}
    </Button>
  );
}
